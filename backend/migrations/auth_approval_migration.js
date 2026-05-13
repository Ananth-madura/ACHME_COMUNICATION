const db = require("../config/database");

const sqls = [
  "ALTER TABLE users ADD COLUMN status ENUM('pending','active','rejected') DEFAULT 'pending'",
  "UPDATE users SET status='active' WHERE role='admin'",
  `CREATE TABLE IF NOT EXISTS admin_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'registration',
    user_id INT,
    message TEXT,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

let done = 0;
sqls.forEach(sql => {
  db.query(sql, (err) => {
    if (err && !err.message.includes("Duplicate column") && !err.message.includes("already exists")) {
      console.error("SKIP:", err.message.split("\n")[0]);
    } else {
      console.log("✅", sql.slice(0, 60));
    }
    if (++done === sqls.length) { console.log("Done"); process.exit(0); }
  });
});
