const express = require("express");
const router = express.Router();
const db = require("../config/database");

/* GET ALL TARGETS (Admin) */
router.get("/", (req, res) => {
  db.query(
    `SELECT t.*, 
      COALESCE(a.achieved_amount, 0) as achieved_amount,
      COALESCE(a.month_year, DATE_FORMAT(NOW(), '%Y-%m')) as current_month,
      (t.monthly_target - COALESCE(a.achieved_amount, 0)) as pending_amount
    FROM task_targets t
    LEFT JOIN task_achievements a ON t.id = a.target_id AND a.month_year = DATE_FORMAT(NOW(), '%Y-%m')
    ORDER BY t.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* GET TARGET FOR USER */
router.get("/my", (req, res) => {
  const { user_name } = req.query;
  if (!user_name) return res.status(400).json({ error: "user_name required" });
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  db.query(
    `SELECT t.*, 
      COALESCE(a.achieved_amount, 0) as achieved_amount,
      (t.monthly_target - COALESCE(a.achieved_amount, 0)) as pending_amount
    FROM task_targets t
    LEFT JOIN task_achievements a ON t.id = a.target_id AND a.month_year = ?
    WHERE t.user_name = ?`,
    [currentMonth, user_name],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0] || null);
    }
  );
});

/* CREATE/UPDATE TARGET (Admin) */
router.post("/", (req, res) => {
  const { user_id, user_name, yearly_target, monthly_target, created_by_admin } = req.body;
  
  if (!user_name || !yearly_target) {
    return res.status(400).json({ error: "user_name and yearly_target required" });
  }
  
  const finalMonthlyTarget = monthly_target || Math.round(yearly_target / 12);

  // Check if target exists for user
  db.query(
    "SELECT id FROM task_targets WHERE user_name = ?",
    [user_name],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (rows.length > 0) {
        // Update existing
        db.query(
          "UPDATE task_targets SET yearly_target = ?, monthly_target = ?, updated_at = NOW() WHERE id = ?",
          [yearly_target, finalMonthlyTarget, rows[0].id],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: "Target updated", id: rows[0].id });
          }
        );
      } else {
        // Create new
        db.query(
          "INSERT INTO task_targets (user_id, user_name, yearly_target, monthly_target, created_by_admin) VALUES (?, ?, ?, ?, ?)",
          [user_id, user_name, yearly_target, finalMonthlyTarget, created_by_admin || 1],
          (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: "Target created", id: result.insertId });
          }
        );
      }
    }
  );
});

/* UPDATE ACHIEVEMENT (User) */
router.post("/update", (req, res) => {
  const { user_id, user_name, amount, description } = req.body;
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (!user_name || !amount) {
    return res.status(400).json({ error: "user_name and amount required" });
  }
  
  // Get target for user
  db.query(
    "SELECT id FROM task_targets WHERE user_name = ?",
    [user_name],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: "Target not set for user" });
      
      const targetId = rows[0].id;
      
      // Insert achievement update
      db.query(
        `INSERT INTO task_updates (user_id, user_name, target_id, month_year, amount, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, user_name, targetId, currentMonth, amount, description],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          
          // Update monthly achievement
          db.query(
            `INSERT INTO task_achievements (user_id, user_name, target_id, month_year, achieved_amount) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE achieved_amount = achieved_amount + ?`,
            [user_id, user_name, targetId, currentMonth, amount, amount],
            (err3) => {
              if (err3) return res.status(500).json({ error: err3.message });
              
              // Log activity
              db.query(
                "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
                [targetId, "Target Update", `${user_name} updated achievement by ${amount}`]
              );
              
              // Check if completed to notify Admin
              db.query(
                `SELECT t.monthly_target, a.achieved_amount 
                 FROM task_targets t 
                 JOIN task_achievements a ON t.id = a.target_id 
                 WHERE t.id = ? AND a.month_year = ?`,
                [targetId, currentMonth],
                (err4, checkRows) => {
                   if (!err4 && checkRows.length > 0) {
                     const { monthly_target, achieved_amount } = checkRows[0];
                     // Trigger if they just crossed or reached the 100% threshold
                     if (achieved_amount >= monthly_target && (achieved_amount - amount) < monthly_target) {
                       const io = req.app.get("io");
                       if (io && io.emitNotification) {
                         const percentage = Math.round((achieved_amount / monthly_target) * 100);
                         io.emitNotification("target_achieved", {
                           userName: user_name,
                           percentage: percentage
                         }, null, true);
                       }
                     }
                   }
                }
              );
              
              res.json({ message: "Achievement updated", target_id: targetId });
            }
          );
        }
      );
    }
  );
});

/* GET ACHIEVEMENT HISTORY */
router.get("/history", (req, res) => {
  const { user_name, months } = req.query;
  const limit = parseInt(months) || 12;
  
  let sql = `
    SELECT a.month_year, a.achieved_amount,
      (SELECT monthly_target FROM task_targets WHERE id = a.target_id) as monthly_target
    FROM task_achievements a
    WHERE a.user_name = ?
    ORDER BY a.month_year DESC
    LIMIT ?
  `;
  
  db.query(sql, [user_name, limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* GET TARGET GRAPH DATA */
router.get("/graph", (req, res) => {
  const { user_id, user_name } = req.query;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  db.query(
    `SELECT 
      t.yearly_target,
      t.monthly_target,
      COALESCE(a.achieved_amount, 0) as achieved_amount,
      (t.monthly_target - COALESCE(a.achieved_amount, 0)) as pending,
      (t.yearly_target / 12) as per_month_avg
    FROM task_targets t
    LEFT JOIN task_achievements a ON t.id = a.target_id AND a.month_year = ?
    WHERE t.user_name = ? OR t.user_id = ?`,
    [currentMonth, user_name, user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0] || {});
    }
  );
});

module.exports = router;