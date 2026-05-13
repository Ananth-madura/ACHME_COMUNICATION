const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const migrations = [
  {
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='Telecalls' AND COLUMN_NAME='reference'",
    alter: "ALTER TABLE Telecalls ADD COLUMN reference VARCHAR(255) DEFAULT NULL",
    label: "Telecalls.reference",
  },
  {
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='Walkins' AND COLUMN_NAME='reference'",
    alter: "ALTER TABLE Walkins ADD COLUMN reference VARCHAR(255) DEFAULT NULL",
    label: "Walkins.reference",
  },
  {
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='fields' AND COLUMN_NAME='reference'",
    alter: "ALTER TABLE fields ADD COLUMN reference VARCHAR(255) DEFAULT NULL",
    label: "fields.reference",
  },
  {
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='teammember' AND COLUMN_NAME='quotation_count'",
    alter: "ALTER TABLE teammember ADD COLUMN quotation_count INT DEFAULT 0",
    label: "teammember.quotation_count",
  },
  {
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='services' AND COLUMN_NAME='issues'",
    alter: "ALTER TABLE services ADD COLUMN issues TEXT DEFAULT NULL",
    label: "services.issues",
  },
];

db.connect((err) => {
  if (err) { console.error("DB connection failed:", err); process.exit(1); }
  console.log("✅ Connected to database:", process.env.DB_NAME);

  let completed = 0;

  migrations.forEach(({ check, alter, label }) => {
    db.query(check, [process.env.DB_NAME], (err, rows) => {
      if (err) { console.error(`❌ Check failed for ${label}:`, err.message); }
      else if (rows.length > 0) {
        console.log(`⚡ Column already exists: ${label}`);
      } else {
        db.query(alter, (err2) => {
          if (err2) console.error(`❌ Migration failed for ${label}:`, err2.message);
          else console.log(`✅ Added column: ${label}`);
        });
      }
      if (++completed === migrations.length) {
        setTimeout(() => { db.end(); console.log("\n🎉 Migration complete!"); }, 500);
      }
    });
  });
});
