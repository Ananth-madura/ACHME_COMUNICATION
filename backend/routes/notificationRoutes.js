const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// GET employee notifications for current user
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  const { type, limit, offset } = req.query;
  const params = [];

  let sql = "SELECT * FROM notifications WHERE 1=1";

  if (role === "employee") {
    sql += " AND (user_id = ? OR user_id IS NULL)";
    params.push(user_id);
  } else if (req.query.user_id) {
    sql += " AND user_id = ?";
    params.push(req.query.user_id);
  }

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }

  sql += " ORDER BY created_at DESC";

  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit));
    if (offset) {
      sql += " OFFSET ?";
      params.push(parseInt(offset));
    }
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// GET unread count for current user
router.get("/unread-count", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  let sql = "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0";
  const params = [];

  if (role === "employee") {
    sql += " AND (user_id = ? OR user_id IS NULL)";
    params.push(user_id);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ count: result[0].count });
  });
});

// PUT mark single notification as read
router.put("/:id/read", verifyToken, (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// PUT mark all notifications as read
router.put("/read-all", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  let sql = "UPDATE notifications SET is_read = 1 WHERE is_read = 0";
  const params = [];

  if (role === "employee") {
    sql += " AND (user_id = ? OR user_id IS NULL)";
    params.push(user_id);
  }

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// DELETE single notification
router.delete("/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM notifications WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// GET admin notifications (admin only)
router.get("/admin", verifyToken, isAdmin, (req, res) => {
  const { type, priority, limit } = req.query;
  const params = [];

  let sql = `
    SELECT an.*, tm.first_name as employee_name
    FROM admin_notifications an
    LEFT JOIN teammember tm ON an.user_id = tm.user_id
    WHERE 1=1
  `;

  if (type) {
    sql += " AND an.type = ?";
    params.push(type);
  }

  if (priority) {
    sql += " AND an.priority = ?";
    params.push(priority);
  }

  sql += " ORDER BY an.created_at DESC";

  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit));
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// GET admin unread count
router.get("/admin/unread-count", verifyToken, isAdmin, (req, res) => {
  db.query(
    "SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ count: result[0].count });
    }
  );
});

// PUT mark admin notification as read
router.put("/admin/:id/read", verifyToken, isAdmin, (req, res) => {
  db.query(
    "UPDATE admin_notifications SET is_read = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// PUT mark all admin notifications as read
router.put("/admin/read-all", verifyToken, isAdmin, (req, res) => {
  db.query(
    "UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0",
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// DELETE admin notification
router.delete("/admin/:id", verifyToken, isAdmin, (req, res) => {
  db.query("DELETE FROM admin_notifications WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

module.exports = router;
