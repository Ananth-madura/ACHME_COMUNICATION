const db = require("./config/database");

db.query("SHOW TABLES LIKE 'services'", (err, result) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log("Services Table exists:", result.length > 0);
  if (result.length === 0) {
    console.log("Table not found, creating manually...");
    const sql = `
      CREATE TABLE IF NOT EXISTS services (
        id int NOT NULL AUTO_INCREMENT,
        client varchar(150) DEFAULT NULL,
        material varchar(255) DEFAULT NULL,
        warranty varchar(100) DEFAULT NULL,
        amc tinyint(1) DEFAULT '0',
        date date DEFAULT NULL,
        images text,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error("Create error:", err);
      } else {
        console.log("Services table created successfully!");
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
