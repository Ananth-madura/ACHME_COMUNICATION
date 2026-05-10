require("dotenv").config();
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const sql = fs.readFileSync(path.join(__dirname, "performa_enhancement.sql"), "utf8");

db.query(sql, (err) => {
  if (err) {
    console.error("MIGRATION ERROR:", err.message);
  } else {
    console.log("Migration OK");
  }
  db.end();
});
