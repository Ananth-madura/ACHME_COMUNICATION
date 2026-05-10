const db = require("../config/database");

const tables = [
  "quotation_items",
  "performainvoice_items",
  "estimate_invoice_items",
  "service_estimation_items"
];

async function migrate() {
  for (const table of tables) {
    console.log(`Checking table: ${table}`);
    try {
      const [columns] = await db.promise().query(`SHOW COLUMNS FROM ${table} LIKE 'hsn_sac'`);
      if (columns.length === 0) {
        console.log(`Adding hsn_sac column to ${table}...`);
        await db.promise().query(`ALTER TABLE ${table} ADD COLUMN hsn_sac VARCHAR(20) DEFAULT NULL AFTER brand_model`);
        console.log(`Successfully added hsn_sac to ${table}`);
      } else {
        console.log(`Column hsn_sac already exists in ${table}`);
      }
    } catch (err) {
      console.error(`Error processing table ${table}:`, err.message);
    }
  }
  process.exit(0);
}

migrate();
