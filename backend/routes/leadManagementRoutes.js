const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
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
router.get("/reminders/:leadType/:leadId", verifyToken, (req, res) => {
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
router.post("/reminders", verifyToken, (req, res) => {
  const { lead_id, lead_type, reminder_date, reminder_time, reminder_notes, employee_id } = req.body;
  db.query(
    "INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_time, reminder_notes, status, employee_id) VALUES (?,?,?,?,?,'Pending',?)",
    [lead_id, lead_type || "telecall", toDateOnly(reminder_date), toTimeOnly(reminder_time), reminder_notes || "", employee_id || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // Log activity
      db.query(
        "INSERT INTO lead_activity (lead_id, lead_type, employee_id, action, details) VALUES (?,?,?,?,?)",
        [lead_id, lead_type || "telecall", employee_id || null, "Reminder Created", `Reminder set for ${reminder_date}`]
      );
      res.json({ id: result.insertId, message: "Reminder added" });
    }
  );
});

// PUT update reminder status
router.put("/reminders/:id", verifyToken, (req, res) => {
  const { status } = req.body;
  db.query("UPDATE lead_reminders SET status=? WHERE id=?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Updated" });
  });
});

// DELETE reminder
router.delete("/reminders/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM lead_reminders WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
});

// ── MARK MISSED & ESCALATION CHECK ────────────────────────────────────────

// POST check and mark overdue reminders as Missed, trigger escalation if needed
router.post("/check-missed", verifyToken, (req, res) => {
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
               lr.employee_id,
               COALESCE(t.customer_name, w.customer_name, f.customer_name) as customer_name,
               COALESCE(t.mobile_number, w.mobile_number, f.mobile_number) as mobile_number,
               COALESCE(t.staff_name, w.staff_name, f.staff_name) as staff_name,
               COALESCE(t.followup_date, w.followup_date, f.followup_date) as followup_date
        FROM lead_reminders lr
        LEFT JOIN Telecalls t ON t.id = lr.lead_id AND lr.lead_type = 'telecall'
        LEFT JOIN Walkins w ON w.id = lr.lead_id AND lr.lead_type = 'walkin'
        LEFT JOIN fields f ON f.id = lr.lead_id AND lr.lead_type = 'field'
        WHERE lr.status = 'Missed'
        GROUP BY lr.lead_id, lr.lead_type, lr.employee_id
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
                  db.query("UPDATE lead_escalations SET missed_count=?, missed_threshold_reached=1 WHERE id=?", [lead.missed_count, existing[0].id]);
                  if ([3, 5, 7, 9, 10].includes(Number(lead.missed_count))) notifyMissedLead(lead, req);
                }
                if (--pending === 0) res.json({ markedMissed, escalated });
                return;
              }
              db.query(
                "INSERT INTO lead_escalations (lead_id, lead_type, employee_id, customer_name, mobile_number, staff_name, last_followup_date, missed_count, missed_threshold_reached) VALUES (?,?,?,?,?,?,?,?,1)",
                [lead.lead_id, lead.lead_type, lead.employee_id || null, lead.customer_name, lead.mobile_number, lead.staff_name, toDateOnly(lead.followup_date), lead.missed_count],
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
router.get("/escalations", verifyToken, (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT e.*, tm.first_name as employee_name, tm.emp_role
    FROM lead_escalations e
    LEFT JOIN teammember tm ON e.employee_id = tm.id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += " AND e.status = ?";
    params.push(status);
  } else {
    sql += " AND e.status = 'Open'";
  }
  sql += " ORDER BY e.created_at DESC";
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// PUT resolve escalation
router.put("/escalations/:id/resolve", verifyToken, (req, res) => {
  db.query("SELECT * FROM lead_escalations WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ message: "Not found" });
    const escalation = rows[0];

    db.query("UPDATE lead_escalations SET status='Resolved', resolved_at=NOW() WHERE id=?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Notify the employee if we have their employee_id
      if (escalation.employee_id) {
        // Get user_id from teammember
        db.query("SELECT user_id FROM teammember WHERE id=?", [escalation.employee_id], (e, tmRows) => {
          if (!e && tmRows.length > 0 && tmRows[0].user_id) {
            const notificationIO = req.app.get("notificationIO");
            if (notificationIO && notificationIO.emitNotification) {
              notificationIO.emitNotification("escalation_resolved", {
                leadId: escalation.lead_id,
                leadType: escalation.lead_type,
                customerName: escalation.customer_name,
                message: `Your missed reminder escalation for lead ${escalation.customer_name} has been resolved.`,
                type: "lead"
              }, tmRows[0].user_id, false);
            }
          }
        });
      }

      res.json({ message: "Resolved" });
    });
  });
});

// ── ACTIVITY LOG ───────────────────────────────────────────────────────────

// GET activity log for a lead
router.get("/activity/:leadType/:leadId", verifyToken, (req, res) => {
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
router.post("/activity", verifyToken, (req, res) => {
  const { lead_id, lead_type, action, details, employee_id } = req.body;
  db.query(
    "INSERT INTO lead_activity (lead_id, lead_type, employee_id, action, details) VALUES (?,?,?,?,?)",
    [lead_id, lead_type || "telecall", employee_id || null, action, details || ""],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId });
    }
  );
});

// ── DASHBOARD NOTIFICATIONS ────────────────────────────────────────────────

// GET notification summary for dashboard
router.get("/notifications", verifyToken, (req, res) => {
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
router.get("/missed-counts/:leadType", verifyToken, (req, res) => {
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

// Helper function to create/update client from lead
const createClientFromLead = (lead, leadType, callback) => {
  const leadIdDisplay = `${leadType.charAt(0).toUpperCase()}-${lead.id}`;
  const leadData = {
    name: lead.customer_name || "",
    phone: lead.mobile_number || "",
    email: lead.email || "",
    address: lead.location_city || "",
    service: lead.service_name || lead.purpose || "",
    gst_number: lead.gst_number || "",
    original_lead_id: lead.id,
    original_lead_type: leadType,
    lead_email: lead.email || "",
    lead_city: lead.location_city || "",
    lead_reference: lead.reference || "",
    lead_purpose: lead.purpose || lead.service_name || "",
    client_status: "converted",
    converted_at: new Date(),
    lead_staff_name: lead.staff_name || "",
    lead_id_display: leadIdDisplay
  };

  const doInsert = () => {
    db.query(
      `INSERT INTO clients (name, phone, email, address, service, gst_number, created_by, original_lead_id, original_lead_type, lead_email, lead_city, lead_reference, lead_purpose, client_status, converted_at, lead_staff_name, lead_id_display) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'converted', NOW(), ?, ?)`,
      [leadData.name, leadData.phone, leadData.email, leadData.address, leadData.service,
      leadData.gst_number, lead.created_by || null, leadData.original_lead_id, leadData.original_lead_type,
      leadData.lead_email, leadData.lead_city, leadData.lead_reference, leadData.lead_purpose,
      leadData.lead_staff_name, leadData.lead_id_display],
      (err5, result) => {
        if (err5) { console.error("Error creating client:", err5); callback(null); }
        else { console.log(`Client created from ${leadType} lead ${lead.id}, client ID: ${result.insertId}`); callback(result.insertId); }
      }
    );
  };

  const doUpdate = (clientId) => {
    db.query(
      `UPDATE clients SET name=?, phone=?, email=?, address=?, service=?, gst_number=?, 
       original_lead_id=?, original_lead_type=?, lead_email=?, lead_city=?, 
       lead_reference=?, lead_purpose=?, client_status='converted', converted_at=NOW(),
       lead_staff_name=?, lead_id_display=? WHERE id=?`,
      [leadData.name, leadData.phone, leadData.email, leadData.address, leadData.service, leadData.gst_number,
      leadData.original_lead_id, leadData.original_lead_type, leadData.lead_email, leadData.lead_city,
      leadData.lead_reference, leadData.lead_purpose, leadData.lead_staff_name, leadData.lead_id_display, clientId],
      (err5) => {
        if (err5) { console.error("Error updating client:", err5); callback(null); }
        else { console.log(`Client ${clientId} updated from ${leadType} lead ${lead.id}`); callback(clientId); }
      }
    );
  };

  db.query("SELECT id FROM clients WHERE original_lead_id = ? AND original_lead_type = ?", [lead.id, leadType], (err3, existing) => {
    if (err3) { console.error("Error checking existing client:", err3); callback(null); return; }

    if (existing.length > 0) {
      doUpdate(existing[0].id);
      return;
    }

    db.query("SELECT id FROM clients WHERE phone = ? AND (original_lead_id IS NULL OR original_lead_type IS NULL) AND client_status != 'converted'", [lead.mobile_number], (err4, byPhone) => {
      if (err4) { console.error("Error checking by phone:", err4); doInsert(); return; }

      if (byPhone.length > 0) {
        doUpdate(byPhone[0].id);
      } else {
        doInsert();
      }
    });
  });
};

// PUT convert telecall
router.put("/telecall/:id", verifyToken, isAdmin, (req, res) => {
  const { call_outcome } = req.body;
  db.query(
    "UPDATE Telecalls SET call_outcome=? WHERE id=?",
    [call_outcome || "Converted", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query("SELECT * FROM Telecalls WHERE id=?", [req.params.id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const lead = rows[0];
          createClientFromLead(lead, "telecall", (clientId) => {
            const notificationIO = req.app.get("notificationIO");
            if (notificationIO && notificationIO.emitNotification) {
              notificationIO.emitNotification("lead_converted", {
                staffName: lead.staff_name || "Employee",
                customerName: lead.customer_name || "A Lead",
                convertedAt: new Date().toLocaleString(),
                leadType: "telecall",
                clientId: clientId
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
router.put("/walkin/:id", verifyToken, isAdmin, (req, res) => {
  const { walkin_status } = req.body;
  db.query(
    "UPDATE Walkins SET walkin_status=? WHERE id=?",
    [walkin_status || "Converted", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query("SELECT * FROM Walkins WHERE id=?", [req.params.id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const lead = rows[0];
          createClientFromLead(lead, "walkin", (clientId) => {
            const notificationIO = req.app.get("notificationIO");
            if (notificationIO && notificationIO.emitNotification) {
              notificationIO.emitNotification("lead_converted", {
                staffName: lead.staff_name || "Employee",
                customerName: lead.customer_name || "A Lead",
                convertedAt: new Date().toLocaleString(),
                leadType: "walkin",
                clientId: clientId
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
router.put("/field/:id", verifyToken, isAdmin, (req, res) => {
  const { field_outcome } = req.body;
  db.query(
    "UPDATE fields SET field_outcome=? WHERE id=?",
    [field_outcome || "Converted", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query("SELECT * FROM fields WHERE id=?", [req.params.id], (err2, rows) => {
        if (!err2 && rows.length > 0) {
          const lead = rows[0];
          createClientFromLead(lead, "field", (clientId) => {
            const notificationIO = req.app.get("notificationIO");
            if (notificationIO && notificationIO.emitNotification) {
              notificationIO.emitNotification("lead_converted", {
                staffName: lead.staff_name || "Employee",
                customerName: lead.customer_name || "A Lead",
                convertedAt: new Date().toLocaleString(),
                leadType: "field",
                clientId: clientId
              }, null, true);
            }
          });
        }
      });

      res.json({ message: "Lead converted successfully" });
    }
  );
});

// GET converted leads list
router.get("/converted", verifyToken, (req, res) => {
  const sql = `
    SELECT c.*, 
           u.first_name as creator_name,
           CASE c.original_lead_type 
             WHEN 'telecall' THEN 'Tele Call'
             WHEN 'walkin' THEN 'Walk-in'
             WHEN 'field' THEN 'Field Visit'
             ELSE 'Unknown'
           END as lead_source,
           DATE_FORMAT(c.converted_at, '%Y-%m-%d %H:%i') as converted_date,
           c.lead_staff_name as converted_by_name,
           c.lead_id_display as lead_reference_id
    FROM clients c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.client_status = 'converted' AND c.original_lead_id IS NOT NULL
    ORDER BY c.converted_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
