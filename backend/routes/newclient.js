const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middileware/authMiddleware");

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

/* GET ALL CLIENTS */
router.get("/", verifyToken, (req, res) => {
  let sql = `
    SELECT c.*, u.first_name as creator_name 
    FROM clients c
    LEFT JOIN users u ON c.created_by = u.id
  `;
  const params = [];
  
  if (req.user.role === "employee") {
    sql += " WHERE c.created_by = ?";
    params.push(req.user.id);
  }
  
  sql += " ORDER BY c.id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* CREATE CLIENT */
router.post("/", verifyToken, (req, res) => {
  const { name, company_name, email, phone, address, service, gst_number } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });

  const sql = `INSERT INTO clients (name, company_name, email, phone, address, service, gst_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, company_name || "", email || "", phone || "", address || "", service || "", gst_number || "", req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Insert failed", error: err });
    res.json({ message: "Client created successfully", id: result.insertId });
  });
});

/* UPDATE CLIENT */
router.put("/:id", verifyToken, (req, res) => {
    const { name, company_name, email, phone, address, service, gst_number } = req.body;
    db.query(
      "UPDATE clients SET name=?, company_name=?, email=?, phone=?, address=?, service=?, gst_number=? WHERE id=?",
      [name, company_name || "", email, phone, address, service, gst_number || "", req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Client updated successfully" });
      }
    );
  });
});

/* DELETE CLIENT */
router.delete("/:id", verifyToken, (req, res) => {
  // Check ownership
  db.query("SELECT created_by FROM clients WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query("DELETE FROM clients WHERE id=?", [req.params.id], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Client deleted successfully" });
    });
  });
});

module.exports = router;
