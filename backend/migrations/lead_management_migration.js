const db = require("../config/database");

const steps = [
  {
    name: "Update call_outcome ENUM",
    sql: `ALTER TABLE telecalls MODIFY COLUMN call_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New'`
  },
  {
    name: "Add lead_id to quotations",
    sql: `ALTER TABLE quotations ADD COLUMN lead_id INT DEFAULT NULL`
  },
  {
    name: "Add lead_type to quotations",
    sql: `ALTER TABLE quotations ADD COLUMN lead_type VARCHAR(20) DEFAULT NULL`
  },
  {
    name: "Create lead_reminders table",
    sql: `CREATE TABLE IF NOT EXISTS lead_reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT NOT NULL,
      lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
      reminder_date DATE,
      reminder_time TIME DEFAULT NULL,
      reminder_notes TEXT,
      status ENUM('Pending','Done','Missed') DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: "Create lead_activity table",
    sql: `CREATE TABLE IF NOT EXISTS lead_activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT NOT NULL,
      lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
      action VARCHAR(100),
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: "Create lead_escalations table",
    sql: `CREATE TABLE IF NOT EXISTS lead_escalations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT NOT NULL,
      lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
      customer_name VARCHAR(150),
      mobile_number VARCHAR(20),
      staff_name VARCHAR(150),
      last_followup_date DATE,
      missed_count INT DEFAULT 3,
      status ENUM('Open','Resolved') DEFAULT 'Open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  }
];

let done = 0;
steps.forEach(({ name, sql }) => {
  db.query(sql, (err) => {
    if (err && !err.message.includes("Duplicate column") && !err.message.includes("already exists")) {
      console.error(`❌ ${name}: ${err.message.split("\n")[0]}`);
    } else {
      console.log(`✅ ${name}`);
    }
    if (++done === steps.length) {
      console.log("\n✅ Lead management migration complete");
      process.exit(0);
    }
  });
});
