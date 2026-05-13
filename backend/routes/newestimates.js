const express = require("express");
const router = express.Router();
const db = require("../config/database");

router.post("/new", (req, res) => {
  const { company_name, client_firstname, client_lastname, client_email } = req.body;

  if (!company_name || !client_firstname || !client_lastname || !client_email) {
    return res.status(400).json({ message: "filed required" });
  }

  db.query(
    `INSERT INTO estimatenew 
     (company_name, client_firstname, client_lastname, client_email)
     VALUES (?,?,?,?)`,
    [company_name, client_firstname, client_lastname, client_email],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true, id: result.insertId });
    }
  );
});


// SEARCH CLIENT
router.get("/search", (req, res) => {
  const search = req.query.name || "";

  db.query(
    "SELECT company_name FROM estimatenew WHERE company_name LIKE ?",
    [`${search}%`],   
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});


module.exports = router;
