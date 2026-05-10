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

/* AUTO CREATE CLIENT IF CONVERTED */
const syncClient = (data) => {
  const { customer_name, mobile_number, location_city, purpose, email, field_outcome } = data;

  if (field_outcome === "Converted") {
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

/* CREATE FIELD */
router.post("/new", (req, res) => {
  const data = req.body;

  if (!data.customer_name || !data.visit_date) {
    return res.status(400).json({ message: "Customer name & visit date required" });
  }

  db.query("INSERT INTO fields SET ?", data, (err, result) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Insert failed" }); }
    syncClient(data);
    const newId = result.insertId;

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
router.put("/:id", (req, res) => {
  const data = req.body;

  db.query(
    `UPDATE fields SET ? WHERE id=?`,
    [data, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.sqlMessage });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Field not found" });
      syncClient(data);
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

/* GET ALL */
router.get("/", (req, res) => {
  const { user_id, role, user_name } = req.query;
  let sql = "SELECT * FROM fields";
  const params = [];
  if ((role === "user" || role === "employee") && user_name) {
    sql += " WHERE staff_name LIKE ? OR assigned_to = ?";
    params.push(`%${user_name}%`, user_id || 0);
  }
  sql += " ORDER BY id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Fetch failed" });
    res.json(results);
  });
});

/* DELETE */
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM fields WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Delete failed" });
    res.json({ message: "Field deleted" });
  });
});

module.exports = router;