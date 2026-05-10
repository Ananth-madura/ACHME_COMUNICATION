const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const sql = `
-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(255),
  task_title VARCHAR(255),
  project_status ENUM('New', 'Process', 'Completed') DEFAULT 'New',
  project_priority ENUM('Normal', 'Low', 'High', 'Urgent') DEFAULT 'Normal',
  staff_name VARCHAR(255),
  client_name VARCHAR(255),
  created_date DATE,
  due_date DATE
);

-- 2. Task Activity Table
CREATE TABLE IF NOT EXISTS task_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT,
  action VARCHAR(50),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT,
  title VARCHAR(100),
  description TEXT,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Task Targets Table
CREATE TABLE IF NOT EXISTS task_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  yearly_target INT DEFAULT 0,
  monthly_target INT DEFAULT 0,
  created_by_admin VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Task Achievements Table
CREATE TABLE IF NOT EXISTS task_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  target_id INT,
  month_year VARCHAR(7),
  achieved_count INT DEFAULT 0,
  daily_achievements JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Task Updates Table
CREATE TABLE IF NOT EXISTS task_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  target_id INT,
  month_year VARCHAR(7),
  count INT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Task Assignments Table
CREATE TABLE IF NOT EXISTS task_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT,
  assigned_to_user_id INT,
  assigned_to_user_name VARCHAR(255),
  assigned_by VARCHAR(255),
  status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
  assigned_date DATE,
  due_date DATE,
  priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

db.connect((err) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to database:", process.env.DB_NAME);

  // Split and run each query
  const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
  
  let completed = 0;
  queries.forEach(query => {
    db.query(query, (err) => {
      if (err) console.error("❌ SQL Error:", err.message);
      else console.log("✅ Query executed successfully.");
      
      completed++;
      if (completed === queries.length) {
        console.log("🎉 All tables verified/created!");
        db.end();
      }
    });
  });
});
