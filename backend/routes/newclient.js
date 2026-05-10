const express = require("express");
const router = express.Router();
const db = require("../config/database");

/* SEARCH CLIENT */
router.get("/search", (req, res) => {
  const search = `%${req.query.name || ""}%`;

  db.query(
    "SELECT id, name, company_name FROM clients WHERE name LIKE ? OR company_name LIKE ?",
    [search, search],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Search failed" });
      res.json(results);
    }
  );
});

/* GET ALL CLIENTS */
router.get("/", (req, res) => {
  db.query("SELECT * FROM clients ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* CREATE CLIENT */
router.post("/", (req, res) => {
  const { name, company_name, email, phone, address, service } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });

  const sql = `INSERT INTO clients (name, company_name, email, phone, address, service) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, company_name || "", email || "", phone || "", address || "", service || ""], (err, result) => {
    if (err) return res.status(500).json({ message: "Insert failed", error: err });
    res.json({ message: "Client created successfully", id: result.insertId });
  });
});

/* UPDATE CLIENT */
router.put("/:id", (req, res) => {
  const { name, email, phone, address, service } = req.body;
  db.query(
    "UPDATE clients SET name=?, email=?, phone=?, address=?, service=? WHERE id=?",
    [name, email, phone, address, service, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Client updated successfully" });
    }
  );
});

/* DELETE CLIENT */
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM clients WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Client deleted successfully" });
  });
});

module.exports = router;
