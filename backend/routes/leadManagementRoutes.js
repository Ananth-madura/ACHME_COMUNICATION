const express = require("express");
const router = express.Router();
const db = require("../config/database");
const toDateOnly = (val) => (!val ? null : val.toString().slice(0, 10));
const toTimeOnly = (val) => {
  if (!val) return null;
  const s = val.toString().trim();
  if (s.length >= 8) return s.slice(-8);
  return s;
};
const notifyMissedLead = (lead, req) => {
  const notificationIO = req?.app?.get("io");
  if (!notificationIO || !notificationIO.emitNotification) return;
  notificationIO.emitNotification("missed_calls", {
    leadId: lead.lead_id,
    leadType: lead.lead_type,
    userName: lead.staff_name,
    customerName: lead.customer_name,
    mobileNumber: lead.mobile_number,
    count: lead.missed_count,
    missedAt: new Date().toLocaleString(),
    type: "lead",
    priority: "high"
  }, null, true);
};

// ── REMINDERS ──────────────────────────────────────────────────────────────

// GET all reminders for a lead
router.get("/reminders/:leadType/:leadId", (req, res) => {
  db.query(
    "SELECT * FROM lead_reminders WHERE lead_id=? AND lead_type=? ORDER BY reminder_date ASC, id DESC",
    [req.params.leadId, req.params.leadType],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST add a reminder
router.post("/reminders", (req, res) => {
  const { lead_id, lead_type, reminder_date, reminder_time, reminder_notes } = req.body;
  db.query(
    "INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_time, reminder_notes, status) VALUES (?,?,?,?,?,'Pending')",
    [lead_id, lead_type || "telecall", toDateOnly(reminder_date), toTimeOnly(reminder_time), reminder_notes || ""],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // Log activity
      db.query(
        "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [lead_id, lead_type || "telecall", "Reminder Created", `Reminder set for ${reminder_date}`]
      );
      res.json({ id: result.insertId, message: "Reminder added" });
    }
  );
});

// PUT update reminder status
router.put("/reminders/:id", (req, res) => {
  const { status } = req.body;
  db.query("UPDATE lead_reminders SET status=? WHERE id=?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Updated" });
  });
});

// DELETE reminder
router.delete("/reminders/:id", (req, res) => {
  db.query("DELETE FROM lead_reminders WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
});

// ── MARK MISSED & ESCALATION CHECK ────────────────────────────────────────

// POST check and mark overdue reminders as Missed, trigger escalation if needed
router.post("/check-missed", (req, res) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

  // Mark as Missed if:
  // 1. reminder_date is before today (any time), OR
  // 2. reminder_date is today AND reminder_time is set AND reminder_time < current time
  db.query(
    `UPDATE lead_reminders SET status='Missed'
     WHERE status='Pending' AND (
       reminder_date < ?
       OR (reminder_date = ? AND reminder_time IS NOT NULL AND TIME(reminder_time) < ?)
     )`,
    [today, today, currentTime],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const markedMissed = result.affectedRows;

      // Check for leads with 3+ missed reminders → escalate (all lead types)
      const escalateSql = `
        SELECT lr.lead_id, lr.lead_type, COUNT(*) as missed_count,
               COALESCE(t.customer_name, w.customer_name, f.customer_name) as customer_name,
               COALESCE(t.mobile_number, w.mobile_number, f.mobile_number) as mobile_number,
               COALESCE(t.staff_name, w.staff_name, f.staff_name) as staff_name,
               COALESCE(t.followup_date, w.followup_date, f.followup_date) as followup_date
        FROM lead_reminders lr
        LEFT JOIN Telecalls t ON t.id = lr.lead_id AND lr.lead_type = 'telecall'
        LEFT JOIN Walkins w ON w.id = lr.lead_id AND lr.lead_type = 'walkin'
        LEFT JOIN fields f ON f.id = lr.lead_id AND lr.lead_type = 'field'
        WHERE lr.status = 'Missed'
        GROUP BY lr.lead_id, lr.lead_type
        HAVING missed_count >= 3
      `;
      db.query(escalateSql, (err2, leads) => {
        if (err2) return res.json({ markedMissed, escalated: 0 });
        if (!leads.length) return res.json({ markedMissed, escalated: 0 });

        let pending = leads.length;
        let escalated = 0;

        leads.forEach(lead => {
          db.query(
            "SELECT id FROM lead_escalations WHERE lead_id=? AND lead_type=? AND status='Open'",
            [lead.lead_id, lead.lead_type],
            (e, existing) => {
              if (e || existing.length > 0) {
                // Update missed count on existing escalation
                if (existing.length > 0) {
                  db.query("UPDATE lead_escalations SET missed_count=? WHERE id=?", [lead.missed_count, existing[0].id]);
                  if ([3, 5, 7, 9, 10].includes(Number(lead.missed_count))) notifyMissedLead(lead, req);
                }
                if (--pending === 0) res.json({ markedMissed, escalated });
                return;
              }
              db.query(
                "INSERT INTO lead_escalations (lead_id, lead_type, customer_name, mobile_number, staff_name, last_followup_date, missed_count) VALUES (?,?,?,?,?,?,?)",
                [lead.lead_id, lead.lead_type, lead.customer_name, lead.mobile_number, lead.staff_name, toDateOnly(lead.followup_date), lead.missed_count],
                (e2) => {
                  if (!e2) {
                    escalated++;
                    notifyMissedLead(lead, req);
                  }
                  if (--pending === 0) res.json({ markedMissed, escalated });
                }
              );
            }
          );
        });
      });
    }
  );
});

// ── ESCALATIONS ────────────────────────────────────────────────────────────

// GET all open escalations (admin only)
router.get("/escalations", (req, res) => {
  db.query(
    "SELECT * FROM lead_escalations WHERE status='Open' ORDER BY created_at DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// PUT resolve escalation
router.put("/escalations/:id/resolve", (req, res) => {
  db.query("UPDATE lead_escalations SET status='Resolved' WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Resolved" });
  });
});

// ── ACTIVITY LOG ───────────────────────────────────────────────────────────

// GET activity log for a lead
router.get("/activity/:leadType/:leadId", (req, res) => {
  db.query(
    "SELECT * FROM lead_activity WHERE lead_id=? AND lead_type=? ORDER BY created_at DESC",
    [req.params.leadId, req.params.leadType],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST log activity
router.post("/activity", (req, res) => {
  const { lead_id, lead_type, action, details } = req.body;
  db.query(
    "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
    [lead_id, lead_type || "telecall", action, details || ""],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId });
    }
  );
});

// ── DASHBOARD NOTIFICATIONS ────────────────────────────────────────────────

// GET notification summary for dashboard
router.get("/notifications", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM lead_reminders WHERE status='Pending' AND reminder_date = ?) AS todays_reminders,
      (SELECT COUNT(*) FROM lead_reminders WHERE status='Pending' AND reminder_date > ?) AS due_reminders,
      (SELECT COUNT(*) FROM lead_reminders WHERE status='Missed') AS missed_reminders,
      (SELECT COUNT(*) FROM lead_escalations WHERE status='Open') AS open_escalations
  `;
  db.query(sql, [today, today], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows[0]);
  });
});

// GET missed reminder count per lead (for table badge)
router.get("/missed-counts/:leadType", (req, res) => {
  db.query(
    "SELECT lead_id, COUNT(*) as missed_count FROM lead_reminders WHERE lead_type=? AND status='Missed' GROUP BY lead_id",
    [req.params.leadType],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── LEAD CONVERSION ────────────────────────────────────────────────────────
// These routes match the frontend's expected /api/leads/ subpaths

// PUT convert telecall
router.put("/telecall/:id", (req, res) => {
  const { call_outcome } = req.body;
  db.query(
    "UPDATE Telecalls SET call_outcome=? WHERE id=?",
    [call_outcome || "Converted", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Fetch full lead data to sync with clients
      db.query("SELECT * FROM Telecalls WHERE id=?", [req.params.id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const lead = rows[0];
          // Sync client logic (Simplified version for this route)
          db.query("SELECT id FROM clients WHERE phone = ?", [lead.mobile_number], (err3, result) => {
            if (!err3 && result.length === 0) {
              db.query(
                "INSERT INTO clients (name, phone, address, service, email, gst_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [lead.customer_name, lead.mobile_number, lead.location_city, lead.service_name, lead.email, lead.gst_number || "", lead.created_by]
              );
            }
            // Notify Admin
            const io = req.app.get("io");
            if (io && io.emitNotification) {
              io.emitNotification("lead_converted", {
                staffName: lead.staff_name || lead.creator_name || "Employee",
                customerName: lead.customer_name || "A Lead",
                convertedAt: new Date().toLocaleString()
              }, null, true);
            }
          });
        }
      });
      
      res.json({ message: "Lead converted successfully" });
    }
  );
});

// PUT convert walkin
router.put("/walkin/:id", (req, res) => {
  const { walkin_status } = req.body;
  db.query(
    "UPDATE Walkins SET walkin_status=? WHERE id=?",
    [walkin_status || "Converted", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.query("SELECT * FROM Walkins WHERE id=?", [req.params.id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const lead = rows[0];
          db.query("SELECT id FROM clients WHERE phone = ?", [lead.mobile_number], (err3, result) => {
            if (!err3 && result.length === 0) {
              db.query(
                "INSERT INTO clients (name, phone, address, service, email, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                [lead.customer_name, lead.mobile_number, lead.location_city, lead.service_name, lead.email, lead.created_by]
              );
            }
            // Notify Admin
            const io = req.app.get("io");
            if (io && io.emitNotification) {
              io.emitNotification("lead_converted", {
                staffName: lead.staff_name || lead.creator_name || "Employee",
                customerName: lead.customer_name || "A Lead",
                convertedAt: new Date().toLocaleString()
              }, null, true);
            }
          });
        }
      });
      
      res.json({ message: "Lead converted successfully" });
    }
  );
});

// PUT convert field
router.put("/field/:id", (req, res) => {
  const { field_outcome } = req.body;
  db.query(
    "UPDATE fields SET field_outcome=? WHERE id=?",
    [field_outcome || "Converted", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.query("SELECT * FROM fields WHERE id=?", [req.params.id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const lead = rows[0];
          db.query("SELECT id FROM clients WHERE phone = ?", [lead.mobile_number], (err3, result) => {
            if (!err3 && result.length === 0) {
              db.query(
                "INSERT INTO clients (name, phone, address, service, email, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                [lead.customer_name, lead.mobile_number, lead.location_city, lead.service_name, lead.email, lead.created_by]
              );
            }
            // Notify Admin
            const io = req.app.get("io");
            if (io && io.emitNotification) {
              io.emitNotification("lead_converted", {
                staffName: lead.staff_name || lead.creator_name || "Employee",
                customerName: lead.customer_name || "A Lead",
                convertedAt: new Date().toLocaleString()
              }, null, true);
            }
          });
        }
      });
      
      res.json({ message: "Lead converted successfully" });
    }
  );
});

module.exports = router;
