const express = require("express");
const router = express.Router();
const db = require ("../config/database")

// CREATE PAYMENT
router.post("/new", (req, res) => {
  const { invoice_id, amount, payment_date, payment_method, Transaction_ID, invoice_email } = req.body;

  // Backend validation
  const invoiceIdNum = Number(invoice_id);
  if (!invoice_id || isNaN(invoiceIdNum) || invoiceIdNum <= 0 || !Number.isInteger(invoiceIdNum)) {
    return res.status(400).json({ message: "Invoice ID must be a valid positive integer" });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }
  if (!payment_method) {
    return res.status(400).json({ message: "Payment method is required" });
  }
  if (Transaction_ID !== null && Transaction_ID !== undefined && Transaction_ID !== "") {
    if (!/^\d+$/.test(String(Transaction_ID))) {
      return res.status(400).json({ message: "Transaction ID must contain numbers only" });
    }
  }

  db.query(
    `INSERT INTO payments (invoice_id, amount, payment_date, payment_method, Transaction_ID, invoice_email) VALUES (?,?,?,?,?,?)`,
    [
      invoiceIdNum,
      Number(amount),
      payment_date,
      payment_method,
      Transaction_ID ? Number(Transaction_ID) : null,
      invoice_email ? 1 : 0,
    ],
    (err, result) => {
      if (err) { console.error("MYSQL ERROR:", err); return res.status(500).json({ message: err.message }); }
      res.json({ message: "Payment added", id: result.insertId });
    }
  );
});

// GET PAYMENTS
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      id,
      invoice_id,
      DATE(payment_date) AS payment_date,
      amount,
      payment_method,
      Transaction_ID,
      invoice_email
    FROM payments
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// UPDATE
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { invoice_id, amount, payment_date, payment_method, Transaction_ID, invoice_email } = req.body;

  if (Transaction_ID !== null && Transaction_ID !== undefined && Transaction_ID !== "") {
    if (!/^\d+$/.test(String(Transaction_ID))) {
      return res.status(400).json({ message: "Transaction ID must contain numbers only" });
    }
  }

  db.query(
    `UPDATE payments SET invoice_id=?, amount=?, payment_date=?, payment_method=?, Transaction_ID=?, invoice_email=? WHERE id=?`,
    [Number(invoice_id), Number(amount), payment_date, payment_method, Transaction_ID ? Number(Transaction_ID) : null, invoice_email, id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: "Payment updated" });
    }
  );
});

// DELETE

router.delete("/:id", (req, res) => {
  db.query(
    "DELETE FROM payments WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Payment deleted" });
    }
  );
});



module.exports = router;
