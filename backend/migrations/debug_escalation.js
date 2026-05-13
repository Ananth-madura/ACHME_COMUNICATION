const db = require("../config/database");

const escalateSql = `
  SELECT lr.lead_id, lr.lead_type, COUNT(*) as missed_count,
         t.customer_name, t.mobile_number, t.staff_name, t.followup_date
  FROM lead_reminders lr
  JOIN Telecalls t ON t.id = lr.lead_id AND lr.lead_type = 'telecall'
  WHERE lr.status = 'Missed'
  GROUP BY lr.lead_id, lr.lead_type
  HAVING missed_count >= 3
`;

db.query(escalateSql, (err, rows) => {
  if (err) { console.log("SQL ERROR:", err.message); process.exit(1); }
  console.log("Leads with 3+ missed:", JSON.stringify(rows, null, 2));

  if (!rows.length) {
    // Check what's in lead_reminders
    db.query("SELECT lead_id, lead_type, status FROM lead_reminders LIMIT 20", (e, r) => {
      console.log("lead_reminders sample:", JSON.stringify(r));
      // Check Telecalls
      db.query("SELECT id, customer_name FROM Telecalls LIMIT 5", (e2, r2) => {
        console.log("Telecalls:", JSON.stringify(r2));
        process.exit(0);
      });
    });
    return;
  }

  // Try inserting escalation
  const lead = rows[0];
  db.query(
    "INSERT INTO lead_escalations (lead_id, lead_type, customer_name, mobile_number, staff_name, last_followup_date, missed_count) VALUES (?,?,?,?,?,?,?)",
    [lead.lead_id, lead.lead_type, lead.customer_name, lead.mobile_number, lead.staff_name, lead.followup_date, lead.missed_count],
    (e, r) => {
      console.log(e ? "INSERT ERR: " + e.message : "✅ Escalation inserted id=" + r.insertId);
      process.exit(0);
    }
  );
});
