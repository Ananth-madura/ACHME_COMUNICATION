const mysql = require("mysql2");
const fs = require("fs");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect(async (err) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
    process.exit(1);
  }
  
  db.query("SHOW TABLES", (err, tables) => {
    if (err) throw err;
    let schemaStr = "";
    let count = tables.length;
    
    if (count === 0) {
      console.log("No tables found.");
      process.exit(0);
    }

    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      db.query(`SHOW CREATE TABLE \`${tableName}\``, (err, createTable) => {
        if (err) throw err;
        let createStmt = Object.values(createTable[0])[1];
        // Add IF NOT EXISTS
        createStmt = createStmt.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS");
        schemaStr += createStmt + ";\n\n";
        count--;
        if (count === 0) {
          fs.writeFileSync("schema.sql", schemaStr);
          console.log("Schema dumped to schema.sql");
          process.exit(0);
        }
      });
    });
  });
});
