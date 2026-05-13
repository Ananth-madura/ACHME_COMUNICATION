const path = require("path");
const dbPath = path.resolve(__dirname, "../backend/config/database");
const db = require(dbPath);
db.query("DESCRIBE clients", (err, res) => {
  if (err) {
    console.error("Error describing table:", err.message);
    process.exit(1);
  }
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
});
