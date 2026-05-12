const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middileware/authMiddleware");

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

/* AUTO CREATE CLIENT IF CONVERTED */
const syncClient = (data, userId, leadId, teammemberId) => {
  const { customer_name, mobile_number, location_city, purpose, email, field_outcome, gst_number } = data;

  if (field_outcome === "Converted") {
    db.query("SELECT id FROM clients WHERE original_lead_id = ? AND original_lead_type = 'field'", [leadId], (err, result) => {
      if (err) {
        console.error("Error checking client existence:", err);
        return;
      }

      if (result.length === 0) {
        db.query("SELECT id FROM clients WHERE phone = ? AND (original_lead_id IS NULL OR original_lead_type != 'field')", [mobile_number], (err2, phoneResult) => {
          if (!err2 && phoneResult.length > 0) {
            db.query(
              "UPDATE clients SET name=?, address=?, service=?, email=?, gst_number=?, original_lead_id=?, original_lead_type='field', assigned_teammember_id=? WHERE id=?",
              [customer_name, location_city, purpose, email, gst_number || "", leadId, teammemberId || null, phoneResult[0].id]
            );
          } else {
            db.query(
              "INSERT INTO clients (name, phone, address, service, email, gst_number, created_by, assigned_teammember_id, original_lead_id, original_lead_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'field')",
              [customer_name, mobile_number, location_city, purpose, email, gst_number || "", userId, teammemberId || null, leadId],
              (insertErr) => {
                if (insertErr) console.error("Client conversion (field insert) failed:", insertErr);
              }
            );
          }
        });
      } else {
        db.query(
          "UPDATE clients SET name=?, address=?, service=?, email=?, gst_number=?, assigned_teammember_id=? WHERE original_lead_id=? AND original_lead_type='field'",
          [customer_name, location_city, purpose, email, gst_number || "", teammemberId || null, leadId],
          (updateErr) => {
            if (updateErr) console.error("Client conversion (field update) failed:", updateErr);
          }
        );
      }
    });
  }
};

/* CREATE FIELD */
router.post("/new", verifyToken, (req, res) => {
  const data = { ...req.body, created_by: req.user.id };

  if (!data.customer_name || !data.visit_date) {
    return res.status(400).json({ message: "Customer name & visit date required" });
  }

  db.query("INSERT INTO fields SET ?", data, (err, result) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Insert failed" }); }
    const newId = result.insertId;
    syncClient(data, req.user.id, newId, data.teammember_id || null);

    // Notify when lead is converted
    if (data.field_outcome === "Converted") {
      const notificationIO = getNotificationIO();
      if (notificationIO) {
        const time = new Date().toLocaleString();
        notificationIO.emitNotification("lead_converted", {
          id: newId,
          customerName: data.customer_name,
          mobileNumber: data.mobile_number,
          staffName: data.staff_name,
          leadType: "Field Work",
          convertedAt: time,
          type: "lead"
        }, null, true);
      }
    }
    db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
      [newId, "field", "Lead Created", `Outcome: ${data.field_outcome || "New"}`]);
    if (data.reminder_required === "Yes" && data.reminder_date) {
      db.query("INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
        [newId, "field", data.reminder_date, data.reminder_notes || ""]);
    }

    const notificationIO = getNotificationIO();
    if (notificationIO) {
      notificationIO.emitNotification("new_lead", {
        id: newId,
        customerName: data.customer_name,
        mobileNumber: data.mobile_number,
        leadType: "Field Work",
        staffName: data.staff_name,
        status: data.field_outcome || "New",
        type: "lead"
      }, null, true);
    }

    res.json({ message: "Field added", id: newId });
  });
});

/* UPDATE FIELD */
router.put("/:id", verifyToken, (req, res) => {
  const data = req.body;

  // Check ownership
  db.query("SELECT created_by FROM fields WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query(
      `UPDATE fields SET ? WHERE id=?`,
      [data, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        syncClient(data, results[0].created_by || req.user.id, req.params.id, data.teammember_id || null);
      const id = req.params.id;

      // Notify when lead is converted on update
      if (data.field_outcome === "Converted") {
        const notificationIO = getNotificationIO();
        if (notificationIO) {
          const time = new Date().toLocaleString();
          notificationIO.emitNotification("lead_converted", {
            id: id,
            customerName: data.customer_name,
            mobileNumber: data.mobile_number,
            staffName: data.staff_name,
            leadType: "Field Work",
            convertedAt: time,
            type: "lead"
          }, null, true);
        }
      }

      db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [id, "field", "Status Updated", `Outcome: ${data.field_outcome || "New"}`]);
      if (data.followup_required === "Yes" && data.followup_date) {
        db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
          [id, "field", "Follow-up Scheduled", `Date: ${data.followup_date}${data.followup_notes ? " | Notes: " + data.followup_notes : ""}`]);
      }
      if (data.reminder_required === "Yes" && data.reminder_date) {
        db.query("INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
          [id, "field", data.reminder_date, data.reminder_notes || ""],
          (e) => {
            if (!e) db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
              [id, "field", "Reminder Added", `Date: ${data.reminder_date}${data.reminder_notes ? " | " + data.reminder_notes : ""}`]);
          });
      }
      res.json({ message: "Field updated successfully" });
    }
  );
  });
});

/* GET single field by id */
router.get("/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  db.query("SELECT * FROM fields WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    const lead = results[0];
    if (req.user.role !== "admin" && lead.created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json(lead);
  });
});

/* GET ALL */
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role, first_name: user_name } = req.user;
  let sql = `
    SELECT f.*, u.first_name as creator_name 
    FROM fields f
    LEFT JOIN users u ON f.created_by = u.id
  `;
  const params = [];
  
  if (role === "employee") {
    sql += " WHERE f.created_by = ? OR f.staff_name LIKE ? OR f.assigned_to = ?";
    params.push(user_id, `%${user_name}%`, user_id);
  }
  
  sql += " ORDER BY f.id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Fetch failed" });
    res.json(results);
  });
});

/* DELETE */
router.delete("/:id", verifyToken, (req, res) => {
  // Check ownership
  db.query("SELECT created_by FROM fields WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query("DELETE FROM fields WHERE id = ?", [req.params.id], (err) => {
      if (err) return res.status(500).json({ message: "Delete failed" });
      res.json({ message: "Field deleted" });
    });
  });
});

module.exports = router;