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

// GET all telecalls
router.get("/", (req, res) => {
  const { user_id, role, user_name } = req.query;
  let sql = "SELECT * FROM Walkins";
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
  const { customer_name, mobile_number, location_city, purpose, email, walkin_status } = data;

  if (walkin_status === "Converted") {
    db.query("SELECT id FROM clients WHERE phone = ?", [mobile_number], (err, result) => {
      if (err) return;
      if (result.length === 0) {
        db.query(
          "INSERT INTO clients (name, phone, address, service, email) VALUES (?, ?, ?, ?, ?)",
          [customer_name, mobile_number, location_city, purpose, email]
        );
      } else {
        db.query(
          "UPDATE clients SET name=?, address=?, service=?, email=? WHERE phone=?",
          [customer_name, location_city, purpose, email, mobile_number]
        );
      }
    });
  } else {
    db.query("DELETE FROM clients WHERE phone = ?", [mobile_number]);
  }
};

// POST telecall
router.post("/", (req, res) => {
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
      email
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      email
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      syncClient(req.body);
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

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  db.query(
    "SELECT * FROM Walkins WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    }
  );
});


// Edit 

router.put("/:id", (req, res) => {
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
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Walkin not found" });
      }
      syncClient(req.body);
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
  router.delete("/:id",(req,res) =>{
    db.query(
      "DELETE FROM Walkins WHERE id = ?",
      [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Delete failed" });
      res.json({ message: "Field deleted" });
    }
    );
  })

module.exports = router;
