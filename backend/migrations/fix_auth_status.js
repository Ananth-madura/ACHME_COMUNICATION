const db = require("../config/database");

// 1. Set all pre-existing users (not in notifications) to active
db.query(
  "UPDATE users SET status='active' WHERE status='pending' AND id NOT IN (SELECT user_id FROM admin_notifications WHERE user_id IS NOT NULL)",
  (e, r) => {
    console.log("Fixed existing users:", e ? e.message : r.affectedRows + " rows set to active");

    // 2. Clean orphan notifications
    db.query(
      "DELETE FROM admin_notifications WHERE user_id NOT IN (SELECT id FROM users)",
      (e2, r2) => {
        console.log("Cleaned orphan notifications:", e2 ? e2.message : r2.affectedRows + " deleted");

        // 3. Show current state
        db.query("SELECT id, first_name, role, status FROM users", (e3, r3) => {
          console.log("Users:", JSON.stringify(r3));
          db.query("SELECT * FROM admin_notifications", (e4, r4) => {
            console.log("Notifications:", JSON.stringify(r4));
            process.exit(0);
          });
        });
      }
    );
  }
);
