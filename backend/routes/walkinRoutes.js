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

// GET all telecalls
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role, first_name: user_name } = req.user;
  let sql = `
    SELECT w.*, u.first_name as creator_name 
    FROM Walkins w
    LEFT JOIN users u ON w.created_by = u.id
  `;
  const params = [];
  
  if (role === "employee") {
    sql += " WHERE w.created_by = ? OR w.staff_name LIKE ? OR w.assigned_to = ?";
    params.push(user_id, `%${user_name}%`, user_id);
  }
  
  sql += " ORDER BY w.id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const syncClient = (data, userId) => {
  const { customer_name, mobile_number, location_city, purpose, email, walkin_status, gst_number } = data;

  if (walkin_status === "Converted") {
    db.query("SELECT id FROM clients WHERE phone = ?", [mobile_number], (err, result) => {
      if (err) {
        console.error("Error checking client existence:", err);
        return;
      }

      if (result.length === 0) {
        db.query(
          "INSERT INTO clients (name, phone, address, service, email, gst_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [customer_name, mobile_number, location_city, purpose, email, gst_number || "", userId],
          (insertErr) => {
            if (insertErr) console.error("Client conversion (walkin insert) failed:", insertErr);
          }
        );
      } else {
        db.query(
          "UPDATE clients SET name=?, address=?, service=?, email=?, gst_number=?, created_by=? WHERE phone=?",
          [customer_name, location_city, purpose, email, gst_number || "", userId, mobile_number],
          (updateErr) => {
            if (updateErr) console.error("Client conversion (walkin update) failed:", updateErr);
          }
        );
      }
    });
  }
};

// POST telecall
router.post("/", verifyToken, (req, res) => {
  const {
    customer_name,
    mobile_number,
    location_city,
    walkin_date,
    purpose,
    staff_name,
    walkin_status,
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
    INSERT INTO Walkins (
      customer_name,
      mobile_number,
      location_city,
      walkin_date,
      purpose,
      staff_name,
      walkin_status,
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
      walkin_date,
      purpose,
      staff_name,
      walkin_status,
      followup_required,
      followup_date,
      followup_notes,
      reminder_required,
      reminder_date,
      reminder_notes,
      reference,
      gst_number,
      email,
      req.user.id
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      syncClient(req.body, req.user.id);
      const newId = result.insertId;

      // Notify when lead is converted
      if (walkin_status === "Converted") {
        const notificationIO = getNotificationIO();
        if (notificationIO) {
          const time = new Date().toLocaleString();
          notificationIO.emitNotification("lead_converted", {
            id: newId,
            customerName: customer_name,
            mobileNumber: mobile_number,
            staffName: staff_name,
            leadType: "Walkins",
            convertedAt: time,
            type: "lead"
          }, null, true);
        }
      }
      db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [newId, "walkin", "Lead Created", `Status: ${walkin_status || "New"}`]);
      if (reminder_required === "Yes" && reminder_date) {
        db.query("INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
          [newId, "walkin", reminder_date, reminder_notes || ""]);
      }

      const notificationIO = getNotificationIO();
      if (notificationIO) {
        notificationIO.emitNotification("new_lead", {
          id: newId,
          customerName: customer_name,
          mobileNumber: mobile_number,
          leadType: "Walkins",
          staffName: staff_name,
          status: walkin_status || "New",
          type: "lead"
        }, null, true);
      }

      res.json({ message: "Walkins added", id: newId });
    }
  );
});


// GET single telecall (EDIT)

router.get("/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  db.query(
    "SELECT * FROM Walkins WHERE id = ?",
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


// Edit 

router.put("/:id", verifyToken, (req, res) => {
  const {
    customer_name,
    mobile_number,
    location_city,
    walkin_date,
    purpose,
    staff_name,
    walkin_status,
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
  db.query("SELECT created_by FROM Walkins WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query(
      `UPDATE Walkins SET
        customer_name=?,
        mobile_number=?,
        location_city=?,
        walkin_date=?,
        purpose=?,
        staff_name=?,
        walkin_status=?,
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
        walkin_date,
        purpose,
        staff_name,
        walkin_status,
        followup_required,
        followup_date,
        followup_notes,
        reminder_required,
        reminder_date,
        reminder_notes,
        reference,
        gst_number,
        email,
        req.params.id
      ],
      (err, result) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ error: err.message });
        }
        syncClient(req.body, results[0].created_by || req.user.id);
      const id = req.params.id;

      // Notify when lead is converted on update
      if (walkin_status === "Converted") {
        const notificationIO = getNotificationIO();
        if (notificationIO) {
          const time = new Date().toLocaleString();
          notificationIO.emitNotification("lead_converted", {
            id: id,
            customerName: customer_name,
            mobileNumber: mobile_number,
            staffName: staff_name,
            leadType: "Walkins",
            convertedAt: time,
            type: "lead"
          }, null, true);
        }
      }

      db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [id, "walkin", "Status Updated", `Outcome: ${walkin_status || "New"}`]);
      if (followup_required === "Yes" && followup_date) {
        db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
          [id, "walkin", "Follow-up Scheduled", `Date: ${followup_date}${followup_notes ? " | Notes: " + followup_notes : ""}`]);
      }
      if (reminder_required === "Yes" && reminder_date) {
        db.query("INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
          [id, "walkin", reminder_date, reminder_notes || ""],
          (e) => {
            if (!e) db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
              [id, "walkin", "Reminder Added", `Date: ${reminder_date}${reminder_notes ? " | " + reminder_notes : ""}`]);
          });
      }
      res.json({ message: "Walkin updated successfully" });
    }
  );
});


 // Delete;
  router.delete("/:id", verifyToken, (req,res) =>{
    // Check ownership
    db.query("SELECT created_by FROM Walkins WHERE id = ?", [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: "Not found" });
      
      if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      db.query(
        "DELETE FROM Walkins WHERE id = ?",
        [req.params.id],
      (err) => {
        if (err) return res.status(500).json({ message: "Delete failed" });
        res.json({ message: "Field deleted" });
      }
      );
    });
  })

module.exports = router;
