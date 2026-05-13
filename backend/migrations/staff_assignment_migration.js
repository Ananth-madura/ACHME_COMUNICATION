/**
 * Add assigned_to (user_id) to leads tables for user-specific dashboards
 * Add missed_count to lead_reminders for escalation tracking
 */
const db = require("../config/database");

const steps = [
  { name: "Telecalls.assigned_to",   sql: "ALTER TABLE Telecalls ADD COLUMN assigned_to INT DEFAULT NULL" },
  { name: "Telecalls.created_by",    sql: "ALTER TABLE Telecalls ADD COLUMN created_by INT DEFAULT NULL" },
  { name: "Walkins.assigned_to",     sql: "ALTER TABLE Walkins ADD COLUMN assigned_to INT DEFAULT NULL" },
  { name: "Walkins.created_by",      sql: "ALTER TABLE Walkins ADD COLUMN created_by INT DEFAULT NULL" },
  { name: "fields.assigned_to",      sql: "ALTER TABLE fields ADD COLUMN assigned_to INT DEFAULT NULL" },
  { name: "fields.created_by",       sql: "ALTER TABLE fields ADD COLUMN created_by INT DEFAULT NULL" },
  { name: "lead_reminders.missed_count", sql: "ALTER TABLE lead_reminders ADD COLUMN missed_count INT DEFAULT 0" },
];

let done = 0;
steps.forEach(({ name, sql }) => {
  db.query(sql, (err) => {
    if (err && !err.message.includes("Duplicate column")) {
      console.error(`❌ ${name}: ${err.message.split("\n")[0]}`);
    } else {
      console.log(`✅ ${name}`);
    }
    if (++done === steps.length) {
      console.log("\n✅ Staff assignment migration complete");
      process.exit(0);
    }
  });
});
