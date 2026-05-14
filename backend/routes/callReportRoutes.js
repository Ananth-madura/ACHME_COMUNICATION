const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all call reports (with optional date filter)
router.get("/", verifyToken, (req, res) => {
  const { from, to } = req.query;
  let sql = "SELECT * FROM call_reports";
  const params = [];
  if (from && to) {
    sql += " WHERE report_date BETWEEN ? AND ?";
    params.push(from, to);
  } else if (from) {
    sql += " WHERE report_date >= ?";
    params.push(from);
  } else if (to) {
    sql += " WHERE report_date <= ?";
    params.push(to);
  }
  sql += " ORDER BY report_date DESC, id DESC";
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// GET reports by session
router.get("/session/:sessionId", verifyToken, (req, res) => {
  if (req.params.sessionId.startsWith("NOSESS-")) {
    const id = req.params.sessionId.split("-")[1];
    db.query("SELECT * FROM call_reports WHERE id = ?", [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  } else {
    db.query(
      "SELECT * FROM call_reports WHERE session_id = ? ORDER BY call_sequence ASC",
      [req.params.sessionId],
      (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
      }
    );
  }
});

// GET staff performance stats
router.get("/performance", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      staff_name,
      COUNT(*) as total_calls,
      SUM(CASE WHEN is_exceeded = 1 THEN 1 ELSE 0 END) as exceeded_calls,
      SUM(actual_duration) as total_duration,
      SUM(assigned_time) as total_assigned_time,
      ROUND((SUM(CASE WHEN is_exceeded = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as performance_rating
    FROM call_reports
    GROUP BY staff_name
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST — create or update session
router.post("/", verifyToken, (req, res) => {
  const calls = Array.isArray(req.body) ? req.body : [req.body];
  if (calls.length === 0) return res.status(400).json({ error: "No data provided" });

  const sessionId = calls[0].session_id || `SES-${Date.now()}`;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    const cleanupQuery = sessionId.startsWith("NOSESS-")
      ? "DELETE FROM call_reports WHERE id = ?"
      : "DELETE FROM call_reports WHERE session_id = ?";
    const cleanupParam = sessionId.startsWith("NOSESS-")
      ? sessionId.split("-")[1]
      : sessionId;

    db.query(cleanupQuery, [cleanupParam], (err) => {
      if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

      const newSessionId = sessionId.startsWith("NOSESS-") ? `SES-${Date.now()}` : sessionId;

      // Helper: combine date + HH:MM time into MySQL datetime
      const toDatetime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return null;
        return `${dateStr} ${timeStr}:00`;
      };

      const values = calls.map(c => [
        newSessionId,
        c.client_name,
        c.staff_name,
        c.executive_name || "",
        c.phone || "",
        c.location || "",
        c.call_sequence || 1,
        toDatetime(c.report_date, c.start_time),
        toDatetime(c.report_date, c.end_time),
        c.assigned_time || 30,
        c.actual_duration || 0,
        c.is_exceeded ? 1 : 0,
        c.remarks || "",
        c.report_date,
        c.complaint || "",
        c.km != null ? c.km : null,
      ]);

      const insertSql = `
        INSERT INTO call_reports 
        (session_id, client_name, staff_name, executive_name, phone, location, call_sequence,
         start_time, end_time, assigned_time, actual_duration, is_exceeded, remarks,
         report_date, complaint, km)
        VALUES ?
      `;

      db.query(insertSql, [values], (err, result) => {
        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
        db.commit((err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
          res.json({ message: "Session saved", sessionId: newSessionId, count: result.affectedRows });
        });
      });
    });
  });
});

// DELETE call report
router.delete("/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM call_reports WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
});

module.exports = router;
