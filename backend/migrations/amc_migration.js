const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const sql = `
-- Update contracts table to include new fields
ALTER TABLE contracts
ADD COLUMN contract_type ENUM('Service', 'AMC', 'ALC') DEFAULT 'Service',
ADD COLUMN quotation_id INT DEFAULT NULL;

-- Create AMC/ALC services table
CREATE TABLE IF NOT EXISTS amc_alc_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  service_type ENUM('AMC', 'ALC') NOT NULL,
  customer_name VARCHAR(255),
  mobile_number VARCHAR(20),
  location_city VARCHAR(255),
  service_date DATE NOT NULL,
  service_person VARCHAR(255),
  description TEXT,
  petrol_charges DECIMAL(10,2) DEFAULT 0,
  spare_parts_price DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Create service activity log table
CREATE TABLE IF NOT EXISTS service_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT,
  activity_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    if (query.trim()) {
      db.query(query, (err) => {
        if (err) console.error("❌ SQL Error:", err.message);
        else console.log("✅ Query executed successfully.");

        completed++;
        if (completed === queries.length) {
          console.log("🎉 All AMC/ALC tables created successfully!");
          db.end();
        }
      });
    } else {
      completed++;
    }
  });
});