const db = require("../config/database");
const { runCheckMissed } = require("../backendutil/reminderScheduler");

// Step 1: Fix missed_count for existing Missed reminders
db.query(
  "UPDATE lead_reminders SET missed_count=1 WHERE status='Missed' AND missed_count=0",
  (e, r) => {
    console.log("Fixed missed_count:", e ? e.message : r.affectedRows + " rows updated");

    // Step 2: Check current state
    db.query(
      "SELECT lead_id, lead_type, COUNT(*) as cnt, SUM(missed_count) as total FROM lead_reminders WHERE status='Missed' GROUP BY lead_id, lead_type",
      (e2, r2) => {
        console.log("Missed per lead:", JSON.stringify(r2));

        // Step 3: Run escalation check now
        console.log("\nRunning escalation check...");
        setTimeout(() => {
          // Check escalations created
          db.query("SELECT * FROM lead_escalations", (e3, r3) => {
            console.log("Escalations:", JSON.stringify(r3));
            process.exit(0);
          });
        }, 3000);
      }
    );
  }
);
