const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const sql = `
CREATE TABLE IF NOT EXISTS sales_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  yearly_target DECIMAL(15,2),
  monthly_target DECIMAL(15,2) DEFAULT 0,
  created_by_admin VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS target_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  target_id INT,
  month_year VARCHAR(7),
  achieved_amount DECIMAL(15,2) DEFAULT 0,
  daily_achievements JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS target_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  target_id INT,
  month_year VARCHAR(7),
  amount DECIMAL(15,2),
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.connect((err) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to database:", process.env.DB_NAME);

  const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
  
  let completed = 0;
  queries.forEach(query => {
    db.query(query, (err) => {
      if (err) console.error("❌ SQL Error:", err.message);
      else console.log("✅ Query executed successfully.");
      
      completed++;
      if (completed === queries.length) {
        console.log("🎉 All target tables verified/created!");
        db.end();
      }
    });
  });
});