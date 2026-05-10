// const express = require("express");
// const router = express.Router();
// const db = require("../config/database");
// const multer = require("multer");
// const path = require("path");

// router.get("/history/:sender/:receiver", (req, res) => {
//   const { sender, receiver } = req.params;

//   const sql = `
//     SELECT m.*, u.first_name
//     FROM messages m
//     JOIN users u ON m.sender_id = u.id
//     WHERE (m.sender_id=? AND m.receiver_id=?)
//        OR (m.sender_id=? AND m.receiver_id=?)
//     ORDER BY m.id ASC
//   `;

//   db.query(sql, [sender, receiver, receiver, sender], (err, rows) => {
//     if (err) return res.status(500).json(err);
//     res.json(rows);
//   });
// });

// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage });

// router.post("/upload", upload.single("file"), (req, res) => {
//   const { sender_id, receiver_id } = req.body;

//   const sql = `
//     INSERT INTO messages (sender_id, receiver_id, message, type)
//     VALUES (?, ?, ?, 'file')
//   `;

//   db.query(sql, [sender_id, receiver_id, req.file.filename], (err, result) => {
//     if (err) return res.status(500).json(err);

//     res.json({
//       id: result.insertId,
//       filename: req.file.filename
//     });
//   });
// });

// module.exports = router;
