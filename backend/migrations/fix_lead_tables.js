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
        if (err.message.includes("Duplicate column") || err.message.includes("already exists") || err.message.includes("Duplicate key") || err.message.includes("Multiple primary key") || err.message.includes("check") || err.message.includes("Data truncation")) {
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

async function migrate() {
  db.connect((err) => {
    if (err) {
      console.error("❌ DB Connection Failed:", err.message);
      process.exit(1);
    }
    console.log("✅ Connected to database:", process.env.DB_NAME);
    runMigrations();
  });
}

async function runMigrations() {
  try {
    // ── telecalls table ──────────────────────────────────────────────────────
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS assigned_to INT DEFAULT NULL AFTER staff_name", "telecalls: added assigned_to");
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL AFTER gst_number", "telecalls: added email");
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER email", "telecalls: added created_by");
    await runQuery("ALTER TABLE telecalls ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER created_by", "telecalls: added created_at");

    // Fix enum to include all frontend outcomes
    await runQuery("ALTER TABLE telecalls MODIFY COLUMN call_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted','Disqualified') DEFAULT 'New'", "telecalls: updated call_outcome enum");

    // ── walkins table ───────────────────────────────────────────────────────
    await runQuery("ALTER TABLE walkins ADD COLUMN IF NOT EXISTS assigned_to INT DEFAULT NULL AFTER staff_name", "walkins: added assigned_to");
    await runQuery("ALTER TABLE walkins ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL AFTER gst_number", "walkins: added email");
    await runQuery("ALTER TABLE walkins ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER email", "walkins: added created_by");

    // Fix enum
    await runQuery("ALTER TABLE walkins MODIFY COLUMN walkin_status ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted','Disqualified') DEFAULT 'New'", "walkins: updated walkin_status enum");

    // ── fields table ────────────────────────────────────────────────────────
    await runQuery("ALTER TABLE fields ADD COLUMN IF NOT EXISTS assigned_to INT DEFAULT NULL AFTER staff_name", "fields: added assigned_to");
    await runQuery("ALTER TABLE fields ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL AFTER gst_number", "fields: added email");
    await runQuery("ALTER TABLE fields ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL AFTER email", "fields: added created_by");

    // Fix enum
    await runQuery("ALTER TABLE fields MODIFY COLUMN field_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted','Disqualified') DEFAULT 'New'", "fields: updated field_outcome enum");

    // Fix followup/reminder enums order consistency
    await runQuery("ALTER TABLE telecalls MODIFY COLUMN followup_required ENUM('Default','Yes','No') DEFAULT 'Default'", "telecalls: fixed followup_required enum");
    await runQuery("ALTER TABLE telecalls MODIFY COLUMN reminder_required ENUM('Default','Yes','No') DEFAULT 'Default'", "telecalls: fixed reminder_required enum");
    await runQuery("ALTER TABLE walkins MODIFY COLUMN followup_required ENUM('Default','Yes','No') DEFAULT 'Default'", "walkins: fixed followup_required enum");
    await runQuery("ALTER TABLE walkins MODIFY COLUMN reminder_required ENUM('Default','Yes','No') DEFAULT 'Default'", "walkins: fixed reminder_required enum");
    await runQuery("ALTER TABLE fields MODIFY COLUMN followup_required ENUM('Default','Yes','No') DEFAULT 'Default'", "fields: fixed followup_required enum");
    await runQuery("ALTER TABLE fields MODIFY COLUMN reminder_required ENUM('Default','Yes','No') DEFAULT 'Default'", "fields: fixed reminder_required enum");

    console.log("\n🎉 All lead table migrations completed!");
  } catch (e) {
    console.error("Migration error:", e);
  } finally {
    db.end();
  }
}

migrate();
