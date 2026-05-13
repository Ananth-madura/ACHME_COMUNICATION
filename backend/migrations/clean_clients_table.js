/**
 * Clean clients table — keep only fields from leads form:
 * id, name, phone, email, address (location_city), service, created_at
 * Remove: company_name, state, pincode, gst_number
 */
const db = require("../config/database");

const drops = [
  "ALTER TABLE clients DROP COLUMN company_name",
  "ALTER TABLE clients DROP COLUMN state",
  "ALTER TABLE clients DROP COLUMN pincode",
  "ALTER TABLE clients DROP COLUMN gst_number",
];

let done = 0;
drops.forEach(sql => {
  db.query(sql, (err) => {
    const col = sql.split("DROP COLUMN ")[1];
    if (err && !err.message.includes("check that column/key exists")) {
      console.error(`❌ ${col}: ${err.message.split("\n")[0]}`);
    } else {
      console.log(`✅ Dropped: ${col}`);
    }
    if (++done === drops.length) {
      db.query("DESCRIBE clients", (e, r) => {
        console.log("\nFinal columns:", r?.map(c => c.Field).join(", "));
        process.exit(0);
      });
    }
  });
});
