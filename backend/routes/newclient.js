const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/* SEARCH CLIENT */
router.get("/search", verifyToken, (req, res) => {
  const search = `%${req.query.name || ""}%`;
  let sql = `SELECT id, name, company_name, phone, email, gst_number,
              address, lead_city, city, state, pincode
              FROM clients WHERE (name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
  const params = [search, search, search, search];

  if (req.user.role === "employee") {
    sql += " AND (created_by = ? OR assigned_teammember_id = ?)";
    params.push(req.user.id, req.user.id);
  }

  sql += " ORDER BY name ASC LIMIT 50";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Client search error:", err);
      return res.status(500).json({ message: "Search failed", error: err.message });
    }
    res.json(results);
  });
});

/* GET client converted from a specific lead */
router.get("/converted-from/:leadType/:leadId", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM clients WHERE original_lead_id = ? AND original_lead_type = ?",
    [req.params.leadId, req.params.leadType],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0] || null);
    }
  );
});

/* GET ALL CLIENTS with optional filters */
router.get("/", verifyToken, (req, res) => {
  const { search, source, date_from, date_to } = req.query;
  let sql = `
    SELECT c.*, u.first_name as creator_name,
           tm.first_name as assigned_staff_name, tm.emp_role as assigned_staff_role
    FROM clients c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN teammember tm ON c.assigned_teammember_id = tm.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === "employee") {
    sql += " AND (c.created_by = ? OR c.assigned_teammember_id = ?)";
    params.push(req.user.id, req.user.id);
  }

  if (search) {
    sql += " AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company_name LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (source) {
    sql += " AND c.original_lead_type = ?";
    params.push(source);
  }

  if (date_from) {
    sql += " AND c.created_at >= ?";
    params.push(date_from);
  }

  if (date_to) {
    sql += " AND c.created_at <= ?";
    params.push(date_to + " 23:59:59");
  }

  sql += " ORDER BY c.id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* GET single client */
router.get("/:id", verifyToken, (req, res) => {
  db.query(
    `SELECT c.*, u.first_name as creator_name,
            tm.first_name as assigned_staff_name, tm.emp_role as assigned_staff_role
     FROM clients c
     LEFT JOIN users u ON c.created_by = u.id
     LEFT JOIN teammember tm ON c.assigned_teammember_id = tm.id
     WHERE c.id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(404).json({ message: "Client not found" });
      res.json(result[0]);
    }
  );
});

/* CREATE CLIENT */
router.post("/", verifyToken, (req, res) => {
  const { name, company_name, email, phone, alternate_phone, address, city, state, pincode, service, gst_number, notes, client_status, assigned_teammember_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });

  // Check duplicates
  const checks = [];
  if (phone) checks.push({ sql: "SELECT id, name, phone FROM clients WHERE phone = ?", params: [phone] });
  if (email) checks.push({ sql: "SELECT id, name, email FROM clients WHERE email = ?", params: [email] });

  if (checks.length === 0) {
    return doInsertClient();
  }

  let completed = 0;
  const duplicates = [];
  checks.forEach((c) => {
    db.query(c.sql, c.params, (err, rows) => {
      if (err) {
        console.error("Client duplicate check error:", err);
        completed++;
        if (completed === checks.length) doInsertClient();
        return;
      }
      if (rows.length > 0) duplicates.push({ name: rows[0].name, phone: rows[0].phone || rows[0].email });
      completed++;
      if (completed === checks.length) {
        if (duplicates.length > 0) {
          const msgs = duplicates.map(d => `${d.name} (${d.phone || "N/A"})`);
          return res.status(409).json({ message: "Duplicate client found", duplicates, details: `Phone/Email already exists: ${msgs.join("; ")}` });
        }
        doInsertClient();
      }
    });
  });

  function doInsertClient() {
    const sql = `INSERT INTO clients (name, company_name, email, phone, alternate_phone, address, city, state, pincode, service, gst_number, notes, client_status, created_by, assigned_teammember_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      name.trim(),
      company_name || "",
      email || "",
      phone || "",
      alternate_phone || "",
      address || "",
      city || "",
      state || "",
      pincode || "",
      service || "",
      gst_number || "",
      notes || "",
      client_status || "active",
      req.user.id,
      assigned_teammember_id || null
    ];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Client insert error:", err);
        return res.status(500).json({ message: "Insert failed", error: err.message, sql: err.sql });
      }
      res.json({ message: "Client created successfully", id: result.insertId });
    });
  }
});

/* UPDATE CLIENT */
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const { name, company_name, email, phone, alternate_phone, address, city, state, pincode, service, gst_number, notes, client_status, assigned_teammember_id } = req.body;

  // Check duplicates (exclude current client)
  const checks = [];
  if (phone) checks.push(db.query("SELECT id, name, phone FROM clients WHERE phone = ? AND id != ?", [phone, req.params.id]));
  if (email) checks.push(db.query("SELECT id, name, email FROM clients WHERE email = ? AND id != ?", [email, req.params.id]));

  if (checks.length === 0) {
    return doUpdateClient();
  }

  let completed = 0;
  const duplicates = [];
  checks.forEach((q) => {
    q((err, rows) => {
      if (err) { completed++; if (completed === checks.length) doUpdateClient(); return; }
      if (rows.length > 0) duplicates.push({ name: rows[0].name, phone: rows[0].phone || rows[0].email });
      completed++;
      if (completed === checks.length) {
        if (duplicates.length > 0) {
          const msgs = duplicates.map(d => `${d.name} (${d.phone || "N/A"})`);
          return res.status(409).json({ message: "Duplicate client found", duplicates, details: `Phone/Email already exists: ${msgs.join("; ")}` });
        }
        doUpdateClient();
      }
    });
  });

  function doUpdateClient() {
    db.query(
      "UPDATE clients SET name=?, company_name=?, email=?, phone=?, alternate_phone=?, address=?, city=?, state=?, pincode=?, service=?, gst_number=?, notes=?, client_status=?, assigned_teammember_id=? WHERE id=?",
      [name, company_name || "", email || "", phone || "", alternate_phone || "",
       address || "", city || "", state || "", pincode || "",
       service || "", gst_number || "", notes || "", client_status || "active",
       assigned_teammember_id || null, req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Client updated successfully" });
      }
    );
  }
});

/* DELETE CLIENT */
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  db.query("SELECT created_by FROM clients WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });

    if (req.user.role !== "admin" && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query("DELETE FROM clients WHERE id=?", [req.params.id], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Client deleted successfully" });
    });
  });
});

module.exports = router;
