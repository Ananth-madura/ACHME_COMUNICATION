const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const runQuery = (sql, desc) => {
  return new Promise((resolve) => {
    db.query(sql, (err) => {
      if (err) {
        if (err.message.includes("Duplicate column") || err.message.includes("already exists") || err.message.includes("Duplicate key") || err.message.includes("Data truncation") || err.message.includes("check") || err.message.includes("Multiple primary key")) {
          console.log(`⚠️  ${desc} (skipped: ${err.message.split('\n')[0]})`);
        } else {
          console.error(`❌ ${desc}:`, err.message);
        }
      } else {
        console.log(`✅ ${desc}`);
      }
      resolve();
    });
  });
};

async function runMigrations() {
  try {
    console.log("\n=== Task Tables ===");

    // Tasks table columns
    await runQuery("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255) AFTER due_date", "tasks: added assigned_to");
    await runQuery("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_teammember_id INT DEFAULT NULL AFTER assigned_to", "tasks: added assigned_teammember_id");
    await runQuery("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER assigned_teammember_id", "tasks: added created_by");
    await runQuery("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER created_by", "tasks: added created_at");
    await runQuery("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at", "tasks: added updated_at");
    await runQuery("ALTER TABLE tasks MODIFY COLUMN project_status ENUM('New', 'Process', 'Completed', 'Expired') DEFAULT 'New'", "tasks: updated project_status enum");
    await runQuery("ALTER TABLE tasks MODIFY COLUMN project_priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium'", "tasks: updated project_priority enum");

    // Teammember columns
    await runQuery("ALTER TABLE teammember ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL AFTER quotation_count", "teammember: added user_id");
    await runQuery("ALTER TABLE teammember ADD COLUMN IF NOT EXISTS emp_id VARCHAR(100) DEFAULT NULL AFTER user_id", "teammember: added emp_id");

    console.log("\n=== Lead Tables ===");

    // telecalls table
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS assigned_to INT DEFAULT NULL AFTER staff_name", "telecalls: added assigned_to");
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL AFTER gst_number", "telecalls: added email");
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER email", "telecalls: added created_by");
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER created_by", "telecalls: added created_at");
    await runQuery("ALTER TABLE telecalls MODIFY COLUMN call_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted','Disqualified') DEFAULT 'New'", "telecalls: updated call_outcome enum");
    await runQuery("ALTER TABLE telecalls MODIFY COLUMN followup_required ENUM('Default','Yes','No') DEFAULT 'Default'", "telecalls: fixed followup_required enum");
    await runQuery("ALTER TABLE telecalls MODIFY COLUMN reminder_required ENUM('Default','Yes','No') DEFAULT 'Default'", "telecalls: fixed reminder_required enum");

    // walkins table
    await runQuery("ALTER TABLE Walkins ADD COLUMN IF NOT EXISTS assigned_to INT DEFAULT NULL AFTER staff_name", "walkins: added assigned_to");
    await runQuery("ALTER TABLE Walkins ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL AFTER gst_number", "walkins: added email");
    await runQuery("ALTER TABLE Walkins ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER email", "walkins: added created_by");
    await runQuery("ALTER TABLE Walkins MODIFY COLUMN walkin_status ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted','Disqualified') DEFAULT 'New'", "walkins: updated walkin_status enum");
    await runQuery("ALTER TABLE Walkins MODIFY COLUMN followup_required ENUM('Default','Yes','No') DEFAULT 'Default'", "walkins: fixed followup_required enum");
    await runQuery("ALTER TABLE Walkins MODIFY COLUMN reminder_required ENUM('Default','Yes','No') DEFAULT 'Default'", "walkins: fixed reminder_required enum");

    // fields table
    await runQuery("ALTER TABLE fields ADD COLUMN IF NOT EXISTS assigned_to INT DEFAULT NULL AFTER staff_name", "fields: added assigned_to");
    await runQuery("ALTER TABLE fields ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL AFTER gst_number", "fields: added email");
    await runQuery("ALTER TABLE fields ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER email", "fields: added created_by");
    await runQuery("ALTER TABLE fields MODIFY COLUMN field_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted','Disqualified') DEFAULT 'New'", "fields: updated field_outcome enum");
    await runQuery("ALTER TABLE fields MODIFY COLUMN followup_required ENUM('Default','Yes','No') DEFAULT 'Default'", "fields: fixed followup_required enum");
    await runQuery("ALTER TABLE fields MODIFY COLUMN reminder_required ENUM('Default','Yes','No') DEFAULT 'Default'", "fields: fixed reminder_required enum");

    console.log("\n🎉 All migrations completed!");
  } catch (e) {
    console.error("Migration error:", e);
  } finally {
    db.end();
  }
}

db.connect((err) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to database:", process.env.DB_NAME);
  runMigrations();
});
