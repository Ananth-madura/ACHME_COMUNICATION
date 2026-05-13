require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const migrations = [
  // Add teammember_id to leads tables
  { sql: "ALTER TABLE Telecalls ADD COLUMN teammember_id INT DEFAULT NULL", name: "Telecalls.teammember_id" },
  { sql: "ALTER TABLE Walkins ADD COLUMN teammember_id INT DEFAULT NULL", name: "Walkins.teammember_id" },
  { sql: "ALTER TABLE fields ADD COLUMN teammember_id INT DEFAULT NULL", name: "fields.teammember_id" },

  // Add teammember_id to tasks
  { sql: "ALTER TABLE tasks ADD COLUMN teammember_id INT DEFAULT NULL", name: "tasks.teammember_id" },
  { sql: "ALTER TABLE tasks ADD COLUMN assigned_teammember_id INT DEFAULT NULL", name: "tasks.assigned_teammember_id" },

  // Add employee tracking to reminders and activity
  { sql: "ALTER TABLE lead_reminders ADD COLUMN employee_id INT DEFAULT NULL", name: "lead_reminders.employee_id" },
  { sql: "ALTER TABLE lead_activity ADD COLUMN employee_id INT DEFAULT NULL", name: "lead_activity.employee_id" },
  { sql: "ALTER TABLE lead_escalations ADD COLUMN employee_id INT DEFAULT NULL", name: "lead_escalations.employee_id" },
  { sql: "ALTER TABLE lead_escalations ADD COLUMN missed_threshold_reached TINYINT(1) DEFAULT 0", name: "lead_escalations.missed_threshold_reached" },

  // Add target employee tracking
  { sql: "ALTER TABLE task_targets ADD COLUMN teammember_id INT DEFAULT NULL", name: "task_targets.teammember_id" },
  { sql: "ALTER TABLE task_assignments ADD COLUMN teammember_id INT DEFAULT NULL", name: "task_assignments.teammember_id" },

  // Add client lead reference for tracking
  { sql: "ALTER TABLE clients ADD COLUMN original_lead_id INT DEFAULT NULL", name: "clients.original_lead_id" },
  { sql: "ALTER TABLE clients ADD COLUMN original_lead_type VARCHAR(20) DEFAULT NULL", name: "clients.original_lead_type" },
  { sql: "ALTER TABLE clients ADD COLUMN assigned_teammember_id INT DEFAULT NULL", name: "clients.assigned_teammember_id" },

  // Create employee_activity_log table
  { sql: `CREATE TABLE IF NOT EXISTS employee_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    action_type ENUM('login','logout','lead_created','lead_updated','task_completed','target_updated','reminder_set','reminder_missed') NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
  )`, name: "employee_activity_log table" },

  // Create escalation_rules table
  { sql: `CREATE TABLE IF NOT EXISTS escalation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_type ENUM('reminder_missed','task_overdue','target_missed') NOT NULL,
    threshold_count INT NOT NULL,
    escalate_to_role VARCHAR(50) DEFAULT 'admin',
    notify_creator TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, name: "escalation_rules table" },

  // Insert default escalation rule (ignore duplicate)
  { sql: `INSERT IGNORE INTO escalation_rules (id, rule_type, threshold_count, escalate_to_role, notify_creator, is_active)
          VALUES (1, 'reminder_missed', 3, 'admin', 1, 1)`, name: "default escalation rule" },

  // Performance indexes
  { sql: "CREATE INDEX idx_telecalls_teammember ON Telecalls(teammember_id)", name: "idx_telecalls_teammember" },
  { sql: "CREATE INDEX idx_walkins_teammember ON Walkins(teammember_id)", name: "idx_walkins_teammember" },
  { sql: "CREATE INDEX idx_fields_teammember ON fields(teammember_id)", name: "idx_fields_teammember" },
  { sql: "CREATE INDEX idx_reminders_employee ON lead_reminders(employee_id)", name: "idx_reminders_employee" },
  { sql: "CREATE INDEX idx_clients_original_lead ON clients(original_lead_id, original_lead_type)", name: "idx_clients_original_lead" },
];

let completed = 0;
let failed = 0;
let total = migrations.length;

migrations.forEach(({ sql, name }) => {
  db.query(sql, (err) => {
    const isDuplicate = err && (
      err.message.includes("Duplicate column") ||
      err.message.includes("already exists") ||
      err.message.includes("Duplicate entry") ||
      err.message.includes("Duplicate key name")
    );

    if (err && !isDuplicate) {
      console.error(`❌ ${name}: ${err.message.split("\n")[0]}`);
      failed++;
    } else {
      console.log(`✅ ${name}`);
      completed++;
    }

    if (completed + failed === total) {
      console.log(`\nMigration complete: ${completed} succeeded, ${failed} failed`);
      db.end();
      process.exit(failed > 0 ? 1 : 0);
    }
  });
});
