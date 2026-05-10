const express = require("express");
const router = express.Router();
const db = require("../config/database");

// CREATE INVOICE
router.post("/new", (req, res) => {
  const { client_company, project_names, invoice_date, invoice_duedate, category } = req.body;
  db.query(
    `INSERT INTO clientinvoices (client_company, project_names, invoice_date, invoice_duedate, category) VALUES (?,?,?,?,?)`,
    [client_company, project_names, invoice_date, invoice_duedate, category],
    (err, result) => {
      if (err) { console.error(err); return res.status(500).json({ message: "Invoice insert failed" }); }
      res.json({ message: "Invoice created", id: result.insertId });
    }
  );
});

// GET ALL WITH PAYMENTS
router.get("/with-payments", (req, res) => {
  const sql = `
    SELECT i.id, i.client_company, i.invoice_date, i.invoice_duedate, i.project_names, i.category,
      IFNULL(SUM(p.amount), 0) AS paid_amount
    FROM clientinvoices i
    LEFT JOIN payments p ON p.invoice_id = i.id
    GROUP BY i.id ORDER BY i.id DESC`;
  db.query(sql, (err, results) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Fetch failed" }); }
    res.json(results);
  });
});

// GET SINGLE INVOICE BY ID
router.get("/:id", (req, res) => {
  db.query(`SELECT * FROM clientinvoices WHERE id = ?`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Fetch failed" });
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  });
});

// UPDATE INVOICE
router.put("/:id", (req, res) => {
  const { client_company, project_names, invoice_date, invoice_duedate, category } = req.body;
  db.query(
    `UPDATE clientinvoices SET client_company=?, project_names=?, invoice_date=?, invoice_duedate=?, category=? WHERE id=?`,
    [client_company, project_names, invoice_date, invoice_duedate, category, req.params.id],
    (err) => {
      if (err) { console.error(err); return res.status(500).json({ message: "Update failed" }); }
      res.json({ message: "Invoice updated" });
    }
  );
});

// DELETE INVOICE
router.delete("/:id", (req, res) => {
  db.query(`DELETE FROM clientinvoices WHERE id = ?`, [req.params.id], (err) => {
    if (err) { console.error(err); return res.status(500).json({ message: "Delete failed" }); }
    res.json({ message: "Invoice deleted" });
  });
});

module.exports = router;
