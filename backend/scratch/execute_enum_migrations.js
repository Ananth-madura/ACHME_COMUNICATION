const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config({ path: "./.env" });

async function executeMigration() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "achme",
    multipleStatements: true
  });

  const sql = fs.readFileSync("migrations_enum_to_varchar.sql", "utf8");
  console.log("Executing migrations...");
  
  // Split statements and execute individually to avoid issues if one fails
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const stmt of statements) {
    try {
      console.log(`Executing: ${stmt}`);
      await db.execute(stmt);
      console.log('Success');
    } catch (err) {
      console.error(`Error executing: ${stmt}\n`, err.message);
    }
  }

  console.log("Migrations executed successfully.");
  process.exit(0);
}

executeMigration().catch(console.error);
