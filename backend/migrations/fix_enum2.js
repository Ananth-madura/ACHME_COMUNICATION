const db = require("../config/database");
// First change column to VARCHAR to allow any value temporarily
db.query("ALTER TABLE telecalls MODIFY COLUMN call_outcome VARCHAR(50) DEFAULT 'New'", (e) => {
  if (e) { console.log("Step1 err:", e.message); process.exit(1); }
  console.log("✅ Changed to VARCHAR");
  // Now update Disqualified
  db.query("UPDATE telecalls SET call_outcome='Not Required' WHERE call_outcome='Disqualified'", (e2, r) => {
    if (e2) { console.log("Step2 err:", e2.message); process.exit(1); }
    console.log("✅ Updated", r.affectedRows, "rows");
    // Now set proper ENUM
    db.query("ALTER TABLE telecalls MODIFY COLUMN call_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New'", (e3) => {
      console.log(e3 ? "Step3 err: " + e3.message : "✅ ENUM updated successfully");
      process.exit(0);
    });
  });
});
