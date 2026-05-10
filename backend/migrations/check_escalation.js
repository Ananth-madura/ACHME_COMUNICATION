const db = require("../config/database");
db.query("SELECT COUNT(*) as cnt FROM lead_reminders WHERE status='Missed'", (e, r) => {
  console.log("Missed reminders:", r[0].cnt);
  db.query("SELECT * FROM lead_escalations", (e2, r2) => {
    console.log("Escalations:", JSON.stringify(r2, null, 2));
    // Also check missed per lead
    db.query("SELECT lead_id, COUNT(*) as cnt FROM lead_reminders WHERE status='Missed' GROUP BY lead_id", (e3, r3) => {
      console.log("Missed per lead:", JSON.stringify(r3));
      process.exit(0);
    });
  });
});
