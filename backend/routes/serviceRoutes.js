const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// MULTER CONFIG
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// GET ALL SERVICES
router.get("/", verifyToken, (req, res) => {
  const sql = "SELECT * FROM services ORDER BY created_at DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// CREATE SERVICE (WITH IMAGES)
router.post("/", upload.array("images", 10), verifyToken, (req, res) => {
  const { client, material, warranty, amc, date, issues } = req.body;
  const imageFiles = req.files.map((file) => file.filename);

  const sql = "INSERT INTO services (client, material, warranty, amc, date, images, issues) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [
    client,
    material,
    warranty,
    amc === "true" || amc === true ? 1 : 0,
    date,
    JSON.stringify(imageFiles),
    issues
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.status(201).json({ message: "Service added successfully!", id: result.insertId });
  });
});

// DELETE SERVICE
router.delete("/:id", verifyToken, (req, res) => {
  const sql = "DELETE FROM services WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Service deleted successfully" });
  });
});

// UPDATE SERVICE
router.put("/:id", upload.array("images", 10), verifyToken, (req, res) => {
  const { client, material, warranty, amc, date, issues } = req.body;
  let sql, values;

  if (req.files && req.files.length > 0) {
    const imageFiles = req.files.map((file) => file.filename);
    sql = "UPDATE services SET client=?, material=?, warranty=?, amc=?, date=?, images=?, issues=? WHERE id=?";
    values = [client, material, warranty, amc === "true" || amc === true ? 1 : 0, date, JSON.stringify(imageFiles), issues, req.params.id];
  } else {
    sql = "UPDATE services SET client=?, material=?, warranty=?, amc=?, date=?, issues=? WHERE id=?";
    values = [client, material, warranty, amc === "true" || amc === true ? 1 : 0, date, issues, req.params.id];
  }

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Service updated successfully" });
  });
});

module.exports = router;
