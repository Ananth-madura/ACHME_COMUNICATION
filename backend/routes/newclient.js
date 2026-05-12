const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

/* SEARCH CLIENT */
router.get("/search", verifyToken, (req, res) => {
  const search = `%${req.query.name || ""}%`;
  let sql = "SELECT id, name, company_name FROM clients WHERE (name LIKE ? OR company_name LIKE ?)";
  const params = [search, search];

  if (req.user.role === "employee") {
    sql += " AND created_by = ?";
    params.push(req.user.id);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Search failed" });
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
    sql += " AND c.created_by = ?";
    params.push(req.user.id);
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
  const { name, company_name, email, phone, address, service, gst_number, assigned_teammember_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });

  const sql = `INSERT INTO clients (name, company_name, email, phone, address, service, gst_number, created_by, assigned_teammember_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, company_name || "", email || "", phone || "", address || "", service || "", gst_number || "", req.user.id, assigned_teammember_id || null], (err, result) => {
    if (err) return res.status(500).json({ message: "Insert failed", error: err });
    res.json({ message: "Client created successfully", id: result.insertId });
  });
});

/* UPDATE CLIENT */
router.put("/:id", verifyToken, (req, res) => {
  const { name, company_name, email, phone, address, service, gst_number, assigned_teammember_id } = req.body;
  db.query(
    "UPDATE clients SET name=?, company_name=?, email=?, phone=?, address=?, service=?, gst_number=?, assigned_teammember_id=? WHERE id=?",
    [name, company_name || "", email, phone, address, service, gst_number || "", assigned_teammember_id || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Client updated successfully" });
    }
  );
});

/* DELETE CLIENT */
router.delete("/:id", verifyToken, (req, res) => {
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
