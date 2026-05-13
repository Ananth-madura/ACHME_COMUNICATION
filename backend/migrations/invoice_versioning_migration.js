/**
 * Add versioning columns to performainvoices, estimate_invoices, service_estimations
 * Run: node migrations/invoice_versioning_migration.js  (from backend/ directory)
 */
const db = require("../config/database");

const tables = ["performainvoices", "estimate_invoices", "service_estimations"];
const columns = ["parent_id INT DEFAULT NULL", "version INT DEFAULT 1", "is_latest TINYINT(1) DEFAULT 1"];

let total = tables.length * columns.length;
let done = 0;

tables.forEach(table => {
  columns.forEach(colDef => {
    const colName = colDef.split(" ")[0];
    db.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("Duplicate column")) {
        console.error(`❌ ${table}.${colName}: ${err.message.split("\n")[0]}`);
      } else {
        console.log(`✅ ${table}.${colName}`);
      }
      // Set existing rows to is_latest=1, version=1 where parent_id is null
      db.query(`UPDATE ${table} SET is_latest=1, version=1 WHERE parent_id IS NULL AND (is_latest IS NULL OR is_latest=0)`, () => {});
      if (++done === total) {
        console.log("\n✅ Invoice versioning migration complete");
        process.exit(0);
      }
    });
  });
});
