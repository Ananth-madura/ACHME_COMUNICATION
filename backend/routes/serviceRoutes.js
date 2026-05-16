const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");

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
  const imageFiles = req.files && req.files.length > 0 ? req.files.map((file) => file.filename) : [];

  const sql = "INSERT INTO services (client, material, warranty, amc, date, images, issues) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [
    client,
    material,
    warranty,
    amc === "true" || amc === true ? 1 : 0,
    date,
    imageFiles.length > 0 ? JSON.stringify(imageFiles) : null,
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
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  const sql = "DELETE FROM services WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Service deleted successfully" });
  });
});

// UPDATE SERVICE
router.put("/:id", upload.array("images", 10), verifyToken, isAdmin, (req, res) => {
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

// SEND EMAIL FOR SERVICE
router.post("/send-email/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { to, subject, cc } = req.body;

  db.query("SELECT * FROM services WHERE id = ?", [id], async (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json({ message: "Service not found" });

    const service = rows[0];
    const recipientEmail = to;
    if (!recipientEmail) return res.status(400).json({ message: "No email address provided" });

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const svcNumber = `SVC-${new Date(service.date).getFullYear()}-${String(service.id).padStart(3, "0")}`;

      await transporter.sendMail({
        from: `"Achme Communication" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        cc: cc || undefined,
        subject: subject || `Service Report ${svcNumber}`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;">
          <p style="font-size:16px;color:#1e293b;">Dear Customer,</p>
          <p style="font-size:14px;color:#374151;margin-top:12px;">Please find your <strong>Service Report ${svcNumber}</strong> details below.</p>
          <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:16px;">
            <p><strong>Client:</strong> ${service.client}</p>
            <p><strong>Material:</strong> ${service.material || "—"}</p>
            <p><strong>Warranty:</strong> ${service.warranty || "—"}</p>
            <p><strong>AMC:</strong> ${service.amc ? "Yes" : "No"}</p>
            <p><strong>Date:</strong> ${service.date ? new Date(service.date).toLocaleDateString("en-IN") : "—"}</p>
            <p><strong>Issues:</strong> ${service.issues || "—"}</p>
          </div>
          <p style="font-size:14px;color:#374151;margin-top:16px;">Thank you for your business.</p>
          <p style="font-size:14px;color:#374151;margin-top:16px;">Regards,<br/><strong>Achme Communication</strong></p>
        </div>`,
      });

      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ message: "Failed to send email", error: error.message });
    }
  });
});

module.exports = router;
