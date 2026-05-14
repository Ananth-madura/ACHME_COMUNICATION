const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// CREATE INVOICE
router.post("/new", verifyToken, (req, res) => {
  const { client_company, project_names, invoice_date, invoice_duedate, category } = req.body;
  db.query(
    `INSERT INTO clientinvoices (client_company, project_names, invoice_date, invoice_duedate, category, created_by) VALUES (?,?,?,?,?,?)`,
    [client_company, project_names, invoice_date, invoice_duedate, category, req.user.id],
    (err, result) => {
      if (err) { console.error(err); return res.status(500).json({ message: "Invoice insert failed" }); }
      res.json({ message: "Invoice created", id: result.insertId });
    }
  );
});

// GET ALL WITH PAYMENTS
router.get("/with-payments", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  const sql = `
    SELECT i.id, i.client_company, i.invoice_date, i.invoice_duedate, i.project_names, i.category,
      IFNULL(SUM(p.amount), 0) AS paid_amount
    FROM clientinvoices i
    LEFT JOIN payments p ON p.invoice_id = i.id
    ${role === 'employee' ? 'WHERE i.created_by = ?' : ''}
    GROUP BY i.id ORDER BY i.id DESC`;
  const params = role === 'employee' ? [user_id] : [];
  db.query(sql, params, (err, results) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Fetch failed" }); }
    res.json(results);
  });
});

// GET SINGLE INVOICE BY ID
router.get("/:id", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  db.query(`SELECT * FROM clientinvoices WHERE id = ? ${role === 'employee' ? 'AND created_by = ?' : ''}`, 
    role === 'employee' ? [req.params.id, user_id] : [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Fetch failed" });
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  });
});

// UPDATE INVOICE
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const { client_company, project_names, invoice_date, invoice_duedate, category } = req.body;
  db.query(
    `UPDATE clientinvoices SET client_company=?, project_names=?, invoice_date=?, invoice_duedate=?, category=? WHERE id=? AND (created_by=? OR 'admin'=?)`,
    [client_company, project_names, invoice_date, invoice_duedate, category, req.params.id, req.user.id, req.user.role],
    (err) => {
      if (err) { console.error(err); return res.status(500).json({ message: "Update failed" }); }
      res.json({ message: "Invoice updated" });
    }
  );
});

// DELETE INVOICE
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  db.query(`DELETE FROM clientinvoices WHERE id = ? AND (created_by=? OR 'admin'=?)`, [req.params.id, req.user.id, req.user.role], (err) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Delete failed" }); }
    res.json({ message: "Invoice deleted" });
  });
});

module.exports = router;
