const db = require("../config/database");
db.query("UPDATE telecalls SET call_outcome='Not Required' WHERE call_outcome='Disqualified'", (e, r) => {
  console.log(e ? e.message : "Updated " + r.affectedRows + " rows");
  db.query("ALTER TABLE telecalls MODIFY COLUMN call_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New'", (e2) => {
    console.log(e2 ? e2.message : "✅ ENUM updated");
    process.exit(0);
  });
});
