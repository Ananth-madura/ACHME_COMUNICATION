const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middleware/authMiddleware");

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

// Helper to safely format date to YYYY-MM-DD
const toDateOnly = (val) => {
  if (!val) return null;
  return val.toString().slice(0, 10);
};
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role, first_name: user_name } = req.user;
  let sql = `
    SELECT t.*, u.first_name as creator_name 
    FROM Telecalls t
    LEFT JOIN users u ON t.created_by = u.id
  `;
  const params = [];
  
  if (role === "employee") {
    sql += " WHERE t.created_by = ? OR t.staff_name LIKE ? OR t.assigned_to = ?";
    params.push(user_id, `%${user_name}%`, user_id);
  }
  
  sql += " ORDER BY t.id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const syncClient = (data, userId, leadId, teammemberId) => {
  const { customer_name, mobile_number, location_city, service_name, email, call_outcome, gst_number } = data;

  if (call_outcome === "Converted") {
    db.query("SELECT id FROM clients WHERE original_lead_id = ? AND original_lead_type = 'telecall'", [leadId], (err, result) => {
      if (err) {
        console.error("Error checking client existence:", err);
        return;
      }

      if (result.length === 0) {
        // Also check by phone as fallback
        db.query("SELECT id FROM clients WHERE phone = ? AND (original_lead_id IS NULL OR original_lead_type != 'telecall')", [mobile_number], (err2, phoneResult) => {
          if (!err2 && phoneResult.length > 0) {
            // Update existing client to link to this lead
            db.query(
              "UPDATE clients SET name=?, address=?, service=?, email=?, gst_number=?, original_lead_id=?, original_lead_type='telecall', assigned_teammember_id=? WHERE id=?",
              [customer_name, location_city, service_name, email, gst_number || "", leadId, teammemberId || null, phoneResult[0].id]
            );
          } else {
            db.query(
              "INSERT INTO clients (name, phone, address, service, email, gst_number, created_by, assigned_teammember_id, original_lead_id, original_lead_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'telecall')",
              [customer_name, mobile_number, location_city, service_name, email, gst_number || "", userId, teammemberId || null, leadId],
              (insertErr) => {
                if (insertErr) console.error("Client conversion (insert) failed:", insertErr);
              }
            );
          }
        });
      } else {
        db.query(
          "UPDATE clients SET name=?, address=?, service=?, email=?, gst_number=?, assigned_teammember_id=? WHERE original_lead_id=? AND original_lead_type='telecall'",
          [customer_name, location_city, service_name, email, gst_number || "", teammemberId || null, leadId],
          (updateErr) => {
            if (updateErr) console.error("Client conversion (update) failed:", updateErr);
          }
        );
      }
    });
  }
};

// GET single telecall (EDIT)
router.get("/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  db.query(
    "SELECT * FROM Telecalls WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: "Not found" });
      
      const lead = results[0];
      if (req.user.role !== 'admin' && lead.created_by !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(lead);
    }
  );
});


// POST telecall
router.post("/", verifyToken, (req, res) => {
  const {
    customer_name,
    mobile_number,
    location_city,
    call_date,
    service_name,
    staff_name,
    call_outcome,
    followup_required,
    followup_date,
    followup_notes,
    reminder_required,
    reminder_date,
    reminder_notes,
    reference,
    gst_number,
    email
  } = req.body;

  const sql = `
    INSERT INTO Telecalls (
      customer_name,
      mobile_number,
      location_city,
      call_date,
      service_name,
      staff_name,
      call_outcome,
      followup_required,
      followup_date,
      followup_notes,
      reminder_required,
      reminder_date,
      reminder_notes,
      reference,
      gst_number,
      email,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      customer_name,
      mobile_number,
      location_city,
      toDateOnly(call_date),
      service_name,
      staff_name,
      call_outcome,
      followup_required,
      toDateOnly(followup_date),
      followup_notes,
      reminder_required,
      toDateOnly(reminder_date),
      reminder_notes,
      reference,
      gst_number,
      email,
      req.user.id
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const newId = result.insertId;
      syncClient(req.body, req.user.id, newId, req.body.teammember_id || null);

      // Notify when lead is converted
      if (call_outcome === "Converted") {
        const notificationIO = getNotificationIO();
        if (notificationIO) {
          const time = new Date().toLocaleString();
          notificationIO.emitNotification("lead_converted", {
            id: newId,
            customerName: customer_name,
            mobileNumber: mobile_number,
            staffName: staff_name,
            leadType: "Telecalling",
            convertedAt: time,
            type: "lead"
          }, null, true);
        }
      }
      // Log activity
      db.query(
        "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [newId, "telecall", "Lead Created", `Status: ${call_outcome || "New"}`]
      );
      // If reminder set, add to lead_reminders
      if (reminder_required === "Yes" && reminder_date) {
        db.query(
          "INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
          [newId, "telecall", toDateOnly(reminder_date), reminder_notes || ""]
        );
      }

      const notificationIO = getNotificationIO();
      if (notificationIO) {
        notificationIO.emitNotification("new_lead", {
          id: newId,
          customerName: customer_name,
          mobileNumber: mobile_number,
          leadType: "Telecalling",
          staffName: staff_name,
          status: call_outcome || "New",
          type: "lead"
        }, null, true);
      }

      res.json({ message: "Telecall added", id: newId });
    }
  );
});


// Edit 

router.put("/:id", verifyToken, (req, res) => {
  const {
    customer_name,
    mobile_number,
    location_city,
    call_date,
    service_name,
    staff_name,
    call_outcome,
    followup_required,
    followup_date,
    followup_notes,
    reminder_required,
    reminder_date,
    reminder_notes,
    reference,
    gst_number,
    email
  } = req.body;

  // Check ownership
  db.query("SELECT created_by FROM Telecalls WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

db.query(
        `UPDATE Telecalls SET
          customer_name=?,
          mobile_number=?,
          location_city=?,
          call_date=?,
          service_name=?,
          staff_name=?,
          call_outcome=?,
          followup_required=?,
          followup_date=?,
          followup_notes=?,
          reminder_required=?,
          reminder_date=?,
          reminder_notes=?,
          reference=?,
          gst_number=?,
          email=?
         WHERE id=?`,
        [
          customer_name,
          mobile_number,
          location_city,
          toDateOnly(call_date),
          service_name,
          staff_name,
          call_outcome,
          followup_required,
          toDateOnly(followup_date),
          followup_notes,
          reminder_required,
          toDateOnly(reminder_date),
          reminder_notes,
          reference,
          gst_number,
          email,
          req.params.id
        ],
        (err) => {
          if (err) {
            console.error("Update error:", err);
            return res.status(500).json({ error: err.message });
          }
          syncClient(req.body, results[0].created_by || req.user.id, req.params.id, req.body.teammember_id || null);
          const id = req.params.id;

          if (call_outcome === "Converted") {
            const notificationIO = getNotificationIO();
            if (notificationIO) {
              const time = new Date().toLocaleString();
              notificationIO.emitNotification("lead_converted", {
                id: id,
                customerName: customer_name,
                mobileNumber: mobile_number,
                staffName: staff_name,
                leadType: "Telecalling",
                convertedAt: time,
                type: "lead"
              }, null, true);
            }
          }

          db.query(
            "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
            [id, "telecall", "Status Updated", `Outcome: ${call_outcome || "New"}`]
          );

          if (followup_required === "Yes" && followup_date) {
            db.query(
              "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
              [id, "telecall", "Follow-up Scheduled", `Date: ${toDateOnly(followup_date)}${followup_notes ? " | Notes: " + followup_notes : ""}`]
            );
          }

          if (reminder_required === "Yes" && reminder_date) {
            db.query(
              "INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
              [id, "telecall", toDateOnly(reminder_date), reminder_notes || ""],
              (e) => {
                if (!e) {
                  db.query(
                    "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
                    [id, "telecall", "Reminder Added", `Date: ${toDateOnly(reminder_date)}${reminder_notes ? " | " + reminder_notes : ""}`]
                  );
                }
              }
            );
          }

          res.json({ message: "Telecall updated successfully" });
        }
      );
    });
});

router.delete("/:id", verifyToken, (req, res) => {
  db.query("SELECT created_by FROM Telecalls WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });

    if (req.user.role !== "admin" && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query("DELETE FROM Telecalls WHERE id = ?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Delete failed" });
      res.json({ message: "Telecall deleted" });
    });
  });
});

module.exports = router;
