/**
 * Fix: Add missing version columns to quotations table
 * Run: node migrations/fix_quotation_versioning.js
 */
require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true
});

const columns = [
  "parent_id INT DEFAULT NULL",
  "version INT DEFAULT 1",
  "is_latest TINYINT(1) DEFAULT 1"
];

let total = columns.length;
let done = 0;

columns.forEach(colDef => {
  const colName = colDef.split(" ")[0];
  db.query(`ALTER TABLE quotations ADD COLUMN ${colDef}`, (err) => {
    if (err && !err.message.includes("Duplicate column")) {
      console.error(`❌ quotations.${colName}: ${err.message.split("\n")[0]}`);
    } else {
      console.log(`✅ quotations.${colName}`);
    }
    db.query(`UPDATE quotations SET is_latest=1, version=1 WHERE parent_id IS NULL AND (is_latest IS NULL OR is_latest=0)`, () => {});
    if (++done === total) {
      console.log("\n✅ Quotations versioning migration complete");
      db.end();
      process.exit(0);
    }
  });
});