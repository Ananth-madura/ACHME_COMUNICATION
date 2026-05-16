const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

const checkDuplicateLead = (phone, email, excludeId, callback) => {
  if (typeof excludeId === 'function') { callback = excludeId; excludeId = null; }
  const checks = [];
  if (phone) checks.push({ sql: "SELECT id, customer_name, mobile_number as phone FROM telecalls WHERE (phone = ? OR mobile_number = ?) AND id != ?", params: [phone, phone, excludeId || 0] });
  if (phone) checks.push({ sql: "SELECT id, customer_name, mobile_number as phone FROM walkins WHERE (phone = ? OR mobile_number = ?) AND id != ?", params: [phone, phone, excludeId || 0] });
  if (phone) checks.push({ sql: "SELECT id, customer_name, mobile_number as phone FROM fields WHERE (phone = ? OR mobile_number = ?) AND id != ?", params: [phone, phone, excludeId || 0] });
  if (email) checks.push({ sql: "SELECT id, customer_name, email as phone FROM telecalls WHERE email = ? AND id != ?", params: [email, excludeId || 0] });
  if (email) checks.push({ sql: "SELECT id, customer_name, email as phone FROM walkins WHERE email = ? AND id != ?", params: [email, excludeId || 0] });
  if (email) checks.push({ sql: "SELECT id, customer_name, email as phone FROM fields WHERE email = ? AND id != ?", params: [email, excludeId || 0] });
  if (phone) checks.push({ sql: "SELECT id, name, phone FROM clients WHERE phone = ?", params: [phone] });
  if (email) checks.push({ sql: "SELECT id, name, email as phone FROM clients WHERE email = ?", params: [email] });

  if (checks.length === 0) return callback(null);

  let completed = 0;
  const results = [];
  checks.forEach((c) => {
    db.query(c.sql, c.params, (err, rows) => {
      if (err) { completed++; if (completed === checks.length) callback(null); return; }
      if (rows.length > 0) results.push({ id: rows[0].id, table: "Lead", name: rows[0].customer_name || rows[0].name, phone: rows[0].phone });
      completed++;
      if (completed === checks.length) callback(results.length > 0 ? results : null);
    });
  });
};

// GET all telecalls
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role, first_name: user_name } = req.user;
  let sql = `
    SELECT w.*, u.first_name as creator_name 
    FROM walkins w
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

const syncClient = (data, userId, leadId, teammemberId) => {
  const { customer_name, mobile_number, location_city, purpose, email, walkin_status, gst_number, staff_name } = data;
  const leadIdDisplay = `W-${leadId}`;

  if (walkin_status === "Converted") {
    db.query("SELECT id FROM clients WHERE original_lead_id = ? AND original_lead_type = 'walkin'", [leadId], (err, result) => {
      if (err) {
        console.error("Error checking client existence:", err);
        return;
      }

      if (result.length === 0) {
        const phoneCheck = mobile_number ? "phone = ?" : "1=0";
        const emailCheck = email ? "OR email = ?" : "";
        const params = [];
        if (mobile_number) params.push(mobile_number);
        if (email) params.push(email);

        db.query(`SELECT id FROM clients WHERE (${phoneCheck}) ${emailCheck} AND (original_lead_id IS NULL OR original_lead_type != 'walkin')`, params, (err2, phoneResult) => {
          if (!err2 && phoneResult.length > 0) {
            db.query(
              `UPDATE clients SET name=?, phone=?, address=?, service=?, email=?, gst_number=?, 
               original_lead_id=?, original_lead_type='walkin', assigned_teammember_id=?,
               lead_staff_name=?, lead_id_display=?, client_status='converted', converted_at=NOW()
               WHERE id=?`,
              [customer_name, mobile_number, location_city, purpose, email, gst_number || "", leadId, teammemberId || null,
               staff_name || "", leadIdDisplay, phoneResult[0].id]
            );
          } else {
            db.query(
              `INSERT INTO clients (name, phone, address, service, email, gst_number, created_by, assigned_teammember_id, 
               original_lead_id, original_lead_type, lead_staff_name, lead_id_display, client_status, converted_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'walkin', ?, ?, 'converted', NOW())`,
              [customer_name, mobile_number, location_city, purpose, email, gst_number || "", userId, teammemberId || null,
               leadId, staff_name || "", leadIdDisplay],
              (insertErr) => {
                if (insertErr) console.error("Client conversion (walkin insert) failed:", insertErr);
              }
            );
          }
        });
      } else {
        db.query(
          `UPDATE clients SET name=?, phone=?, address=?, service=?, email=?, gst_number=?, 
           assigned_teammember_id=?, lead_staff_name=?, lead_id_display=?
           WHERE original_lead_id=? AND original_lead_type='walkin'`,
          [customer_name, mobile_number, location_city, purpose, email, gst_number || "", teammemberId || null,
           staff_name || "", leadIdDisplay, leadId],
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
    INSERT INTO walkins (
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
      created_by,
      assigned_to
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      req.user.id,
    req.body.assigned_to || null
  ],
  (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // Check duplicates before proceeding
    checkDuplicateLead(mobile_number, email, (duplicates) => {
      if (duplicates && duplicates.length > 0) {
        const msgs = duplicates.map(d => `${d.name} (${d.phone || "N/A"})`);
        return res.status(409).json({ message: "Duplicate lead found", duplicates, details: `Phone/Email already exists: ${msgs.join("; ")}` });
      }

    syncClient(req.body, req.user.id, result.insertId, req.body.teammember_id || null);
    const newId = result.insertId;

    // Notify when lead is converted
    if (walkin_status === "Converted") {
      // DISABLED: Old notification system
      /*
      const notificationIO = getNotificationIO();
      if (notificationIO) {
        const time = new Date().toLocaleString();
        notificationIO.emitNotification("lead_converted", {
          id: newId,
          customerName: customer_name,
          mobileNumber: mobile_number,
          staffName: staff_name,
          leadType: "walkins",
          convertedAt: time,
          type: "lead"
        }, null, true);
      }
      */
    }
    db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
      [newId, "walkin", "Lead Created", `Status: ${walkin_status || "New"}`]);
    if (reminder_required === "Yes" && reminder_date) {
      db.query("INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status, employee_id) VALUES (?,?,?,?,'Pending',?)",
        [newId, "walkin", reminder_date, reminder_notes || "", req.user?.id || null]);
    }

    // DISABLED: Old notification system
    /*
    const notificationIO = getNotificationIO();
    if (notificationIO) {
      notificationIO.emitNotification("new_lead", {
        id: newId,
        customerName: customer_name,
        mobileNumber: mobile_number,
        leadType: "walkins",
        staffName: staff_name,
        status: walkin_status || "New",
        type: "lead"
      }, null, true);
    }
    */

      res.json({ message: "walkins added", id: newId });
    }
  );
  });
});


// GET single telecall (EDIT)

router.get("/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  db.query(
    "SELECT * FROM walkins WHERE id = ?",
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

router.put("/:id", verifyToken, isAdmin, (req, res) => {
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
  db.query("SELECT created_by FROM walkins WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check for duplicates (exclude current record)
    checkDuplicateLead(mobile_number, email, Number(req.params.id), (duplicates) => {
      if (duplicates && duplicates.length > 0) {
        const msgs = duplicates.map(d => `${d.name} (${d.phone || "N/A"})`);
        return res.status(409).json({ message: "Duplicate lead found", duplicates, details: `Phone/Email already exists: ${msgs.join("; ")}` });
      }

db.query(
      `UPDATE walkins SET
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
        email=?,
        assigned_to=?
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
        req.body.assigned_to || null,
        req.params.id
      ],
      (err, result) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ error: err.message });
        }
        syncClient(req.body, results[0].created_by || req.user.id, Number(req.params.id), req.body.teammember_id || null);
      const id = req.params.id;

      // Notify when lead is converted on update
      if (walkin_status === "Converted") {
        // DISABLED: Old notification system
        /*
        const notificationIO = getNotificationIO();
        if (notificationIO) {
          const time = new Date().toLocaleString();
          notificationIO.emitNotification("lead_converted", {
            id: id,
            customerName: customer_name,
            mobileNumber: mobile_number,
            staffName: staff_name,
            leadType: "walkins",
            convertedAt: time,
            type: "lead"
          }, null, true);
        }
        */
      }

      db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
        [id, "walkin", "Status Updated", `Outcome: ${walkin_status || "New"}`]);
      if (followup_required === "Yes" && followup_date) {
        db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
          [id, "walkin", "Follow-up Scheduled", `Date: ${followup_date}${followup_notes ? " | Notes: " + followup_notes : ""}`]);
      }
      if (reminder_required === "Yes" && reminder_date) {
        db.query("INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_notes, status, employee_id) VALUES (?,?,?,?,'Pending',?)",
          [id, "walkin", reminder_date, reminder_notes || "", req.user?.id || null],
          (e) => {
            if (!e) db.query("INSERT INTO lead_activity (lead_id, lead_type, action, details) VALUES (?,?,?,?)",
              [id, "walkin", "Reminder Added", `Date: ${reminder_date}${reminder_notes ? " | " + reminder_notes : ""}`]);
          });
      }
      res.json({ message: "Walkin updated successfully" });
    }
  );
    });
  });
});


 // Delete;
  router.delete("/:id", verifyToken, isAdmin, (req,res) =>{
    // Check ownership
    db.query("SELECT created_by FROM walkins WHERE id = ?", [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: "Not found" });
      
      if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      db.query(
        "DELETE FROM walkins WHERE id = ?",
        [req.params.id],
      (err) => {
        if (err) return res.status(500).json({ message: "Delete failed" });
        res.json({ message: "Field deleted" });
      }
      );
    });
  })

module.exports = router;
