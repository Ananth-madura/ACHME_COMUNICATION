const mysql = require("mysql2/promise");
require("dotenv").config({ path: "./.env" });

async function generateEnumMigration() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "achme",
  });

  const [rows] = await db.execute(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND DATA_TYPE = 'enum'
  `, [process.env.DB_NAME || "achme"]);

  let sql = "-- Migration script to convert problematic ENUMs to VARCHAR(50)\n";
  const migrationQueries = [];

  for (const row of rows) {
    const nullable = row.IS_NULLABLE === 'YES' ? 'DEFAULT NULL' : `NOT NULL DEFAULT '${row.COLUMN_DEFAULT || ''}'`;
    
    let def = '';
    if (row.COLUMN_DEFAULT !== null) {
      def = `DEFAULT '${row.COLUMN_DEFAULT}'`;
    } else if (row.IS_NULLABLE === 'YES') {
      def = 'DEFAULT NULL';
    }

    const alter = `ALTER TABLE \`${row.TABLE_NAME}\` MODIFY COLUMN \`${row.COLUMN_NAME}\` VARCHAR(50) COLLATE utf8mb4_unicode_ci ${def};`;
    sql += alter + "\n";
    migrationQueries.push(alter);
  }

  const fs = require('fs');
  fs.writeFileSync('migrations_enum_to_varchar.sql', sql);
  console.log("Migration generated to migrations_enum_to_varchar.sql");
  console.log(sql);
  
  process.exit(0);
}

generateEnumMigration().catch(console.error);
