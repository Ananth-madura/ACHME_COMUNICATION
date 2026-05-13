const db = require("../config/database");
const http = require("http");

// Insert 3 past-dated reminders for lead id=1 to test escalation
const pastDates = ["2026-01-01", "2026-02-01", "2026-03-01"];
let done = 0;

pastDates.forEach(date => {
  db.query(
    "INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (1,'telecall',?,'Test missed reminder','Pending')",
    [date],
    (err, result) => {
      if (err) console.log("ERR:", err.message);
      else console.log("✅ Inserted reminder for", date, "id=", result.insertId);

      if (++done === pastDates.length) {
        // Trigger check-missed via HTTP
        const req = http.request(
          { hostname: "localhost", port: 3000, path: "/api/leads/check-missed", method: "POST", headers: { "Content-Type": "application/json" } },
          res => {
            let body = "";
            res.on("data", c => body += c);
            res.on("end", () => {
              console.log("\n✅ check-missed result:", body);
              // Check escalations
              const req2 = http.request(
                { hostname: "localhost", port: 3000, path: "/api/leads/escalations", method: "GET" },
                res2 => {
                  let b2 = "";
                  res2.on("data", c => b2 += c);
                  res2.on("end", () => {
                    const escalations = JSON.parse(b2);
                    console.log("\n✅ Open escalations:", escalations.length);
                    escalations.forEach(e => console.log(" -", e.customer_name, "| missed:", e.missed_count, "| status:", e.status));
                    process.exit(0);
                  });
                }
              );
              req2.end();
            });
          }
        );
        req.end();
      }
    }
  );
});
