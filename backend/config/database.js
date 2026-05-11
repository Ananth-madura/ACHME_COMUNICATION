const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

const dbPort = Number(process.env.DB_PORT) || 3306;
const dbName = process.env.DB_NAME;
const escapedDbName = dbName.replace(/`/g, "``");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  charset: "utf8mb4",
  multipleStatements: true
});

const schemaPath = path.join(__dirname, "../schema.sql");

function runQuerySafe(sql, description, callback) {
  db.query(sql, (err) => {
    if (err) {
      if (err.message.includes("Duplicate column") || err.message.includes("already exists") || err.message.includes("Duplicate entry")) {
        console.log(`✅ ${description} (already exists)`);
      } else {
        console.error(`❌ ${description}:`, err.message);
      }
    } else {
      console.log(`✅ ${description}`);
    }
    if (callback) callback(err);
  });
}

function ensureColumn(table, column, definition, expectedType, callback) {
  db.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [process.env.DB_NAME, table, column],
    (err, rows) => {
      if (err) {
        console.error(`❌ Check column ${table}.${column}:`, err.message);
        return callback(err);
      }
      if (rows.length === 0) {
        runQuerySafe(`ALTER TABLE ${table} ADD COLUMN ${definition}`, `${table}.${column}`, callback);
      } else {
        const type = (rows[0].DATA_TYPE || rows[0].data_type || "").toLowerCase();
        if (expectedType && type !== expectedType.toLowerCase()) {
          runQuerySafe(`ALTER TABLE ${table} MODIFY COLUMN ${definition}`, `${table}.${column} type`, callback);
        } else {
          console.log(`✅ ${table}.${column} exists`);
          callback(null);
        }
      }
    }
  );
}

function querySafe(sql, description) {
  return new Promise((resolve, reject) => {
    runQuerySafe(sql, description, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function ensureColumnAsync(table, column, definition, expectedType) {
  return new Promise((resolve, reject) => {
    ensureColumn(table, column, definition, expectedType, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function ensureTablesAndColumns() {
  const tableStatements = [
    {
      name: "lead_reminders",
      sql: `CREATE TABLE IF NOT EXISTS lead_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
        reminder_date DATE,
        reminder_time TIME DEFAULT NULL,
        reminder_notes TEXT,
        status ENUM('Pending','Done','Missed') DEFAULT 'Pending',
        missed_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "lead_activity",
      sql: `CREATE TABLE IF NOT EXISTS lead_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
        action VARCHAR(100),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "lead_escalations",
      sql: `CREATE TABLE IF NOT EXISTS lead_escalations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
        customer_name VARCHAR(150),
        mobile_number VARCHAR(20),
        staff_name VARCHAR(150),
        last_followup_date DATE,
        missed_count INT DEFAULT 0,
        status ENUM('Open','Resolved') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "admin_notifications",
      sql: `CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'registration',
        user_id INT,
        message TEXT,
        related_id INT DEFAULT NULL,
        related_type VARCHAR(50) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "profile_change_requests",
      sql: `CREATE TABLE IF NOT EXISTS profile_change_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        field VARCHAR(50) NOT NULL,
        new_value TEXT,
        status ENUM('pending','approved','declined') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admin_response_at TIMESTAMP NULL DEFAULT NULL,
        KEY user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "amc_alc_services",
      sql: `CREATE TABLE IF NOT EXISTS amc_alc_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT NOT NULL,
        service_type ENUM('AMC', 'ALC', 'None') DEFAULT 'AMC',
        customer_name VARCHAR(255),
        mobile_number VARCHAR(20),
        location_city VARCHAR(255),
        service_date DATE NOT NULL,
        start_time TIME DEFAULT NULL,
        end_time TIME DEFAULT NULL,
        km DECIMAL(10,2) DEFAULT NULL,
        technician VARCHAR(150) DEFAULT NULL,
        sales_person VARCHAR(150) DEFAULT NULL,
        service_person VARCHAR(255),
        description TEXT,
        remarks TEXT,
        email VARCHAR(150) DEFAULT NULL,
        next_service_date DATE DEFAULT NULL,
        petrol_charges DECIMAL(10,2) DEFAULT 0,
        spare_parts_price DECIMAL(10,2) DEFAULT 0,
        labour_charges DECIMAL(10,2) DEFAULT 0.00,
        total_expenses DECIMAL(10,2) DEFAULT 0,
        status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "service_activity",
      sql: `CREATE TABLE IF NOT EXISTS service_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT,
        activity_type VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "task_targets",
      sql: `CREATE TABLE IF NOT EXISTS task_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        user_name VARCHAR(150) NOT NULL,
        yearly_target DECIMAL(15,2) DEFAULT 0,
        monthly_target DECIMAL(15,2) DEFAULT 0,
        carry_forward DECIMAL(15,2) DEFAULT 0,
        effective_target DECIMAL(15,2) DEFAULT 0,
        created_by_admin TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "task_achievements",
      sql: `CREATE TABLE IF NOT EXISTS task_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        user_name VARCHAR(150) NOT NULL,
        target_id INT NOT NULL,
        month_year VARCHAR(7) NOT NULL,
        achieved_count INT DEFAULT 0,
        achieved_amount DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_target_month (target_id, month_year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "task_updates",
      sql: `CREATE TABLE IF NOT EXISTS task_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        user_name VARCHAR(150) NOT NULL,
        target_id INT NOT NULL,
        month_year VARCHAR(7) NOT NULL,
        count INT DEFAULT 0,
        amount DECIMAL(15,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "call_reports",
      sql: `CREATE TABLE IF NOT EXISTS call_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT DEFAULT NULL,
        contract_title VARCHAR(200) DEFAULT NULL,
        service_type ENUM('AMC', 'ALC', 'None') DEFAULT 'None',
        customer_name VARCHAR(200) DEFAULT NULL,
        mobile_number VARCHAR(20) DEFAULT NULL,
        location_city VARCHAR(100) DEFAULT NULL,
        service_date DATE DEFAULT NULL,
        start_time TIME DEFAULT NULL,
        end_time TIME DEFAULT NULL,
        km DECIMAL(10,2) DEFAULT NULL,
        technician VARCHAR(150) DEFAULT NULL,
        sales_person VARCHAR(150) DEFAULT NULL,
        service_person VARCHAR(150) DEFAULT NULL,
        description TEXT,
        remarks TEXT,
        petrol_charges DECIMAL(10,2) DEFAULT 0,
        spare_parts_price DECIMAL(10,2) DEFAULT 0,
        labour_charges DECIMAL(10,2) DEFAULT 0,
        total_expenses DECIMAL(10,2) DEFAULT 0,
        status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "task_activity",
      sql: `CREATE TABLE IF NOT EXISTS task_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT,
        action VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "notifications",
      sql: `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT,
        user_id INT DEFAULT NULL,
        type VARCHAR(50) DEFAULT NULL,
        title VARCHAR(100),
        description TEXT,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "task_assignments",
      sql: `CREATE TABLE IF NOT EXISTS task_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT,
        assigned_to_user_id INT,
        assigned_to_user_name VARCHAR(255),
        assigned_by VARCHAR(255),
        status ENUM('Pending','Accepted','Declined','In Progress','Completed') DEFAULT 'Pending',
        assigned_date DATE,
        due_date DATE,
        priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: "clients",
      sql: `CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        company_name VARCHAR(150),
        email VARCHAR(150),
        phone VARCHAR(20),
        address TEXT,
        service VARCHAR(255),
        gst_number VARCHAR(50),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    }
  ];

  const columnChecks = [
    { table: "lead_reminders", column: "reminder_time", definition: "reminder_time TIME DEFAULT NULL", expectedType: "time" },
    { table: "lead_reminders", column: "missed_count", definition: "missed_count INT DEFAULT 0" },
    { table: "lead_escalations", column: "missed_count", definition: "missed_count INT DEFAULT 0" },
    { table: "users", column: "status", definition: "status ENUM('pending','active','rejected') DEFAULT 'pending'", expectedType: "enum" },
    { table: "admin_notifications", column: "related_id", definition: "related_id INT DEFAULT NULL" },
    { table: "admin_notifications", column: "related_type", definition: "related_type VARCHAR(50) DEFAULT NULL" },
    { table: "admin_notifications", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "admin_notifications", column: "priority", definition: "priority VARCHAR(20) DEFAULT 'normal'" },
    { table: "notifications", column: "user_id", definition: "user_id INT DEFAULT NULL" },
    { table: "notifications", column: "type", definition: "type VARCHAR(50) DEFAULT NULL" },
    { table: "task_assignments", column: "status", definition: "status ENUM('Pending','Accepted','Declined','In Progress','Completed') DEFAULT 'Pending'", expectedType: "enum" },
    { table: "teammember", column: "mobile_number", definition: "mobile_number VARCHAR(20) DEFAULT NULL" },
    { table: "teammember", column: "user_id", definition: "user_id INT DEFAULT NULL" },
    { table: "teammember", column: "emp_address", definition: "emp_address TEXT DEFAULT NULL" },
    { table: "Telecalls", column: "assigned_to", definition: "assigned_to INT DEFAULT NULL" },
    { table: "Telecalls", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "Walkins", column: "assigned_to", definition: "assigned_to INT DEFAULT NULL" },
    { table: "Walkins", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "fields", column: "assigned_to", definition: "assigned_to INT DEFAULT NULL" },
    { table: "fields", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "quotations", column: "lead_id", definition: "lead_id INT DEFAULT NULL" },
    { table: "quotations", column: "lead_type", definition: "lead_type VARCHAR(20) DEFAULT NULL" },
    { table: "contracts", column: "contract_type", definition: "contract_type VARCHAR(20) DEFAULT 'Service'" },
    { table: "contracts", column: "quotation_id", definition: "quotation_id INT DEFAULT NULL" },
    { table: "contracts", column: "mobile_number", definition: "mobile_number VARCHAR(20) DEFAULT NULL" },
    { table: "contracts", column: "location_city", definition: "location_city VARCHAR(100) DEFAULT NULL" },
    { table: "amc_alc_services", column: "labour_charges", definition: "labour_charges DECIMAL(10,2) DEFAULT 0.00" },
    { table: "amc_alc_services", column: "contract_title", definition: "contract_title VARCHAR(150) DEFAULT NULL" },
    { table: "amc_alc_services", column: "start_time", definition: "start_time TIME DEFAULT NULL" },
    { table: "amc_alc_services", column: "end_time", definition: "end_time TIME DEFAULT NULL" },
    { table: "amc_alc_services", column: "km", definition: "km DECIMAL(10,2) DEFAULT NULL" },
    { table: "amc_alc_services", column: "technician", definition: "technician VARCHAR(150) DEFAULT NULL" },
    { table: "amc_alc_services", column: "sales_person", definition: "sales_person VARCHAR(150) DEFAULT NULL" },
    { table: "amc_alc_services", column: "remarks", definition: "remarks TEXT DEFAULT NULL" },
    { table: "amc_alc_services", column: "email", definition: "email VARCHAR(150) DEFAULT NULL" },
    { table: "amc_alc_services", column: "next_service_date", definition: "next_service_date DATE DEFAULT NULL" },
    { table: "amc_alc_services", column: "service_type", definition: "service_type ENUM('AMC', 'ALC', 'None') DEFAULT 'AMC'" },
    { table: "task_targets", column: "user_id", definition: "user_id INT DEFAULT NULL" },
    { table: "task_targets", column: "created_by_admin", definition: "created_by_admin TINYINT(1) DEFAULT 1" },
    { table: "task_achievements", column: "achieved_amount", definition: "achieved_amount DECIMAL(15,2) DEFAULT 0" },
    { table: "task_updates", column: "amount", definition: "amount DECIMAL(15,2) DEFAULT 0" },
    { table: "call_reports", column: "start_time", definition: "start_time TIME DEFAULT NULL" },
    { table: "call_reports", column: "end_time", definition: "end_time TIME DEFAULT NULL" },
    { table: "call_reports", column: "km", definition: "km DECIMAL(10,2) DEFAULT NULL" },
    { table: "call_reports", column: "remarks", definition: "remarks TEXT DEFAULT NULL" },
    { table: "call_reports", column: "technician", definition: "technician VARCHAR(150) DEFAULT NULL" },
    { table: "call_reports", column: "sales_person", definition: "sales_person VARCHAR(150) DEFAULT NULL" },
    { table: "tasks", column: "assigned_to", definition: "assigned_to VARCHAR(100) DEFAULT NULL" },
    { table: "quotations", column: "reference_no", definition: "reference_no VARCHAR(50) DEFAULT NULL" },
    { table: "task_targets", column: "carry_forward", definition: "carry_forward DECIMAL(15,2) DEFAULT 0" },
    { table: "task_targets", column: "effective_target", definition: "effective_target DECIMAL(15,2) DEFAULT 0" },
    { table: "sales_targets", column: "user_id", definition: "user_id INT DEFAULT NULL" },
    { table: "teammember", column: "user_id", definition: "user_id INT DEFAULT NULL" },
    { table: "sales_targets", column: "created_by_admin", definition: "created_by_admin TINYINT(1) DEFAULT 1" },
    { table: "target_achievements", column: "achieved_amount", definition: "achieved_amount DECIMAL(15,2) DEFAULT 0" },
    { table: "clients", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "tasks", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "quotations", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "contracts", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "clientinvoices", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "performainvoices", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "services", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "call_reports", column: "created_by", definition: "created_by INT DEFAULT NULL" },
    { table: "clients", column: "gst_number", definition: "gst_number VARCHAR(50) DEFAULT NULL" }
  ];

  const enumFixes = [
    { table: "tasks", column: "project_priority", oldEnum: "'Low','Normal','High','Urgent'", newEnum: "'Low','Normal','Medium','High','Urgent'" },
    { table: "teammember", column: "emp_role", oldEnum: "'Developer','BDM'", newEnum: "'Developer','BDM','Manager','Sales'" }
  ];

  for (const { table, column, definition, expectedType } of columnChecks) {
    await ensureColumnAsync(table, column, definition, expectedType);
  }

  for (const { table, column, oldEnum, newEnum } of enumFixes) {
    try {
      await new Promise((resolve, reject) => {
        db.query(
          `SELECT column_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
          [process.env.DB_NAME, table, column],
          (err, rows) => {
            if (err || rows.length === 0) return resolve();
            const currentType = rows[0].column_type || "";
            const isPriorityFix = table === "tasks" && (currentType.includes("Medium") || currentType.includes("medium"));
            const isRoleFix = table === "teammember" && currentType.includes("Manager");
            if (isPriorityFix || isRoleFix) {
              console.log(`✅ ${table}.${column} already updated`);
              return resolve();
            }
            const newType = currentType.replace(oldEnum, newEnum);
            if (newType !== currentType) {
              db.query(`ALTER TABLE ${table} MODIFY ${column} ENUM${newType}`, (e) => {
                if (e && !e.message.includes("Duplicate")) console.error(`❌ Fix ${table}.${column}:`, e.message);
                else console.log(`✅ Fixed ${table}.${column} enum`);
                resolve();
              });
            } else {
              resolve();
            }
          }
        );
      });
    } catch (e) { console.error(`Enum fix error: ${e.message}`); }
  }

  for (const { name, sql } of tableStatements) {
    await querySafe(sql, `Create table ${name}`);
  }

  for (const { table, column, definition, expectedType } of columnChecks) {
    await ensureColumnAsync(table, column, definition, expectedType);
  }
}

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function seedDefaultEmployees() {
  const password = process.env.DEFAULT_TEST_PASSWORD || "Test@12345";
  const hash = await bcrypt.hash(password, 10);
  const employees = [
    { first_name: "John", last_name: "Smith", email: "john.smith@test.local", mobile: "9000000001", job_title: "Developer", emp_role: "Developer" },
    { first_name: "Sarah", last_name: "Johnson", email: "sarah.j@test.local", mobile: "9000000002", job_title: "BDM", emp_role: "BDM" },
    { first_name: "Mike", last_name: "Williams", email: "mike.w@test.local", mobile: "9000000003", job_title: "Sales", emp_role: "BDM" },
    { first_name: "Emily", last_name: "Brown", email: "emily.b@test.local", mobile: "9000000004", job_title: "Designer", emp_role: "Developer" },
    { first_name: "David", last_name: "Lee", email: "david.l@test.local", mobile: "9000000005", job_title: "Manager", emp_role: "Developer" }
  ];

  for (const employee of employees) {
    try {
      await queryAsync(
        `INSERT INTO users (first_name, email, user_password, role, status)
         VALUES (?, ?, ?, 'user', 'active')
         ON DUPLICATE KEY UPDATE first_name = VALUES(first_name)`,
        [employee.first_name, employee.email, hash]
      );
    } catch (e) { console.log("User exists:", employee.email); }

    const checkExist = await queryAsync(`SELECT id FROM teammember WHERE emp_email = ?`, [employee.email]);
    if (checkExist.length === 0) {
      await queryAsync(
        `INSERT INTO teammember (first_name, last_name, emp_email, mobile, job_title, emp_role, quotation_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [employee.first_name, employee.last_name, employee.email, employee.mobile, employee.job_title, employee.emp_role]
      );
    }
  }
  console.log(`Default test employees ready (password: ${password})`);
}

const ready = new Promise((resolve, reject) => {
  db.connect((err) => {
    if (err) {
      console.error("MySQL connection failed:", err.message);
      return reject(err);
    }
    console.log(`MySQL Connected (${process.env.DB_HOST}:${dbPort})`);

    db.query(
      `CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      async (err) => {
        if (err) {
          console.error(`Database creation failed for ${dbName}:`, err.message);
          return reject(err);
        }

        db.changeUser({ database: dbName }, async (err) => {
          if (err) {
            console.error(`Database selection failed for ${dbName}:`, err.message);
            return reject(err);
          }
          console.log(`Using database ${dbName}`);

          if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, "utf8");
            db.query(schema, async (err) => {
              if (err) {
                console.error("Database initialization failed:", err.message);
                return reject(err);
              }
              console.log("Database initialized successfully");
              try {
                await ensureTablesAndColumns();
                await seedDefaultEmployees();
                resolve(db);
              } catch (migrationErr) {
                reject(migrationErr);
              }
            });
          } else {
            try {
              await ensureTablesAndColumns();
              await seedDefaultEmployees();
              resolve(db);
            } catch (migrationErr) {
              reject(migrationErr);
            }
          }
        });
      }
    );
  });
});

db.ready = ready;

module.exports = db;
