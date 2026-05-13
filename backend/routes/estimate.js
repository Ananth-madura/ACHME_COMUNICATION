const express = require("express");
const router = express.Router();
const db = require("../config/database");

/* CREATE ESTIMATE */
router.post("/new", (req, res) => {
  const {
    client_company,
    project_names,
    Estimate_date,
    Expiry_date,
    category,
  } = req.body;

  if (!client_company || !project_names || !Estimate_date || !Expiry_date) {
    return res.status(400).json({ message: "project required" });
  }

  const sql = `
    INSERT INTO estimateclient
    (client_company, project_names, Estimate_date, Expiry_date, category)
    VALUES (?,?,?,?,?)
  `;

  db.query(
    sql,
    [client_company, project_names, Estimate_date, Expiry_date, category],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Insert failed" });
      }
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* FETCH */
router.get("/", (req, res) => {
  db.query("SELECT * FROM estimateclient ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* UPDATE */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const {
    client_company,
    project_names,
    Estimate_date,
    Expiry_date,
    category,
  } = req.body;

  db.query(
    `UPDATE estimateclient SET
      client_company=?,
      project_names=?,
      Estimate_date=?,
      Expiry_date=?,
      category=?
     WHERE id=?`,
    [client_company, project_names, Estimate_date, Expiry_date, category, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Updated" });
    }
  );
});

/* DELETE */
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM estimateclient WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
});

module.exports = router;
