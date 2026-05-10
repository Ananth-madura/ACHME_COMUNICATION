const express = require("express");
const router = express.Router();
const db = require("../config/database");

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
router.get("/", (req, res) => {
  // Admin sees all. Employee sees only leads where staff_name matches their name
  const { user_id, role, user_name } = req.query;
  let sql = "SELECT * FROM Telecalls";
  const params = [];
  if ((role === "user" || role === "employee") && user_name) {
    sql += " WHERE staff_name LIKE ? OR assigned_to = ?";
    params.push(`%${user_name}%`, user_id || 0);
  }
  sql += " ORDER BY id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const syncClient = (data) => {
  const { customer_name, mobile_number, location_city, service_name, email, call_outcome } = data;

  if (call_outcome === "Converted") {
    db.query("SELECT id FROM clients WHERE phone = ?", [mobile_number], (err, result) => {
      if (err) return;
      if (result.length === 0) {
        db.query(
          "INSERT INTO clients (name, phone, address, service, email) VALUES (?, ?, ?, ?, ?)",
          [customer_name, mobile_number, location_city, service_name, email]
        );
      } else {
        db.query(
          "UPDATE clients SET name=?, address=?, service=?, email=? WHERE phone=?",
          [customer_name, location_city, service_name, email, mobile_number]
        );
      }
    });
  } else {
    db.query("DELETE FROM clients WHERE phone = ?", [mobile_number]);
  }
};

// GET single telecall (EDIT)
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  db.query(
    "SELECT * FROM Telecalls WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    }
  );
});


// POST telecall
router.post("/", (req, res) => {
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
    gst_number
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
      gst_number
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      gst_number
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      syncClient(req.body);
      const newId = result.insertId;

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

router.put("/:id", (req, res) => {
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
    gst_number
  } = req.body;

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
      gst_number=?
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
      req.params.id
    ],
    (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Telecall not found" });
      }
      syncClient(req.body);

      const id = req.params.id;

      // Notify when lead is converted on update
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

      // Log status change activity
      db.query(
        "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [id, "telecall", "Status Updated", `Outcome: ${call_outcome || "New"}`]
      );

      // If follow-up set, log it as activity
      if (followup_required === "Yes" && followup_date) {
        db.query(
          "INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
          [id, "telecall", "Follow-up Scheduled", `Date: ${toDateOnly(followup_date)}${followup_notes ? " | Notes: " + followup_notes : ""}`]
        );
      }

      // If reminder set, add to lead_reminders table (history) AND log activity
      if (reminder_required === "Yes" && reminder_date) {
        db.query(
          "INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status) VALUES (?,?,?,?,'Pending')",
          [id, "telecall", toDateOnly(reminder_date), reminder_notes || ""],
          (e, r) => {
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



  // Delete;
  router.delete("/:id",(req,res) =>{
    db.query(
      "DELETE FROM Telecalls WHERE id = ?",
      [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Delete failed" });
      res.json({ message: "Field deleted" });
    }
    );
  })

module.exports = router;
