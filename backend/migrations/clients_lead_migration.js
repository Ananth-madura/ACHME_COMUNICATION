const db = require("../config/database");

const migration = async () => {
  console.log("Running clients table migration...");

  // Wait for database to be ready
  await db.ready;
  console.log("Database connected!");

  const alterations = [
    { col: "original_lead_id", type: "INT DEFAULT NULL" },
    { col: "original_lead_type", type: "ENUM('telecall','walkin','field') DEFAULT NULL" },
    { col: "converted_at", type: "TIMESTAMP NULL DEFAULT NULL" },
    { col: "lead_email", type: "VARCHAR(150) DEFAULT NULL" },
    { col: "lead_city", type: "VARCHAR(100) DEFAULT NULL" },
    { col: "lead_reference", type: "VARCHAR(255) DEFAULT NULL" },
    { col: "lead_purpose", type: "VARCHAR(255) DEFAULT NULL" },
    { col: "client_status", type: "ENUM('active','inactive','converted') DEFAULT 'active'" },
    { col: "lead_staff_name", type: "VARCHAR(150) DEFAULT NULL" },
    { col: "lead_id_display", type: "VARCHAR(50) DEFAULT NULL" }
  ];

  for (const alt of alterations) {
    const checkCol = await new Promise((resolve) => {
      db.query(`SHOW COLUMNS FROM clients WHERE Field = '${alt.col}'`, (err, rows) => {
        if (err) { console.error(err); resolve(false); return; }
        resolve(rows.length > 0);
      });
    });

    if (!checkCol) {
      await new Promise((resolve) => {
        db.query(`ALTER TABLE clients ADD COLUMN ${alt.col} ${alt.type}`, (err) => {
          if (err && !err.message.includes("Duplicate")) {
            console.error(`Error adding ${alt.col}:`, err.message);
          } else {
            console.log(`✅ Added column: ${alt.col}`);
          }
          resolve();
        });
      });
    } else {
      console.log(`⏩ Column already exists: ${alt.col}`);
    }
  }

  console.log("Migration completed!");
  process.exit(0);
};

migration().catch(console.error);