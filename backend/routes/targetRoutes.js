const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) { return null; }
};

/* GET ALL TARGETS (Admin) */
router.get("/", verifyToken, isAdmin, (req, res) => {
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
router.get("/my", verifyToken, (req, res) => {
  const user_id = req.user.id;
  const user_name = req.query.user_name || req.user.first_name || req.user.name;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  
  db.query(
    `SELECT t.*, 
      COALESCE(a.achieved_amount, 0) as achieved_amount,
      COALESCE(a.achieved_count, 0) as achieved_count,
      (t.monthly_target - COALESCE(a.achieved_amount, 0)) as pending_amount
    FROM task_targets t
    LEFT JOIN task_achievements a ON t.id = a.target_id AND a.month_year = ?
    WHERE (t.user_id = ? OR t.user_name = ?) AND YEAR(t.created_at) = ?`,
    [currentMonth, user_id, user_name, currentYear],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows[0] || null);
    }
  );
});

/* CREATE/UPDATE TARGET (Admin) */
router.post("/", verifyToken, isAdmin, (req, res) => {
  const { user_id, user_name, yearly_target, monthly_target, created_by_admin, teammember_id } = req.body;
  
  if (!user_name || !yearly_target) {
    return res.status(400).json({ error: "user_name and yearly_target required" });
  }
  
  const finalMonthlyTarget = monthly_target || Math.round(yearly_target / 12);
  const tmId = parseInt(teammember_id) || null;
  const currentYear = new Date().getFullYear();

  db.query(
    "SELECT id FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const notificationIO = getNotificationIO();

      if (rows.length > 0) {
        db.query(
          "UPDATE task_targets SET yearly_target = ?, monthly_target = ?, teammember_id = ?, updated_at = NOW() WHERE id = ?",
          [yearly_target, finalMonthlyTarget, tmId, rows[0].id],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (notificationIO) notificationIO.emitNotification("target_updated", { id: rows[0].id, userId: user_id, userName: user_name, newAmount: yearly_target, type: "target" }, null, true);
            res.json({ message: "Target updated", id: rows[0].id });
          }
        );
      } else {
        db.query(
          "INSERT INTO task_targets (user_id, user_name, yearly_target, monthly_target, created_by_admin, teammember_id) VALUES (?, ?, ?, ?, ?, ?)",
          [user_id, user_name, yearly_target, finalMonthlyTarget, created_by_admin || 1, tmId],
          (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const newTargetId = result.insertId;
            const message = `New target assigned to you: Rs.${Number(yearly_target || 0).toLocaleString()}/year (Monthly: Rs.${finalMonthlyTarget.toLocaleString()})`;
            if (tmId) {
              db.query("SELECT u.id, u.first_name FROM users u LEFT JOIN teammember t ON t.user_id = u.id WHERE t.id = ? LIMIT 1",
                [tmId],
                (userErr, userRows) => {
                  if (!userErr && userRows.length && userRows[0].id) {
                    const targetUser = userRows[0];
                    if (notificationIO) {
                      notificationIO.emitNotification("new_target", { id: newTargetId, userId: targetUser.id, userName: targetUser.first_name || user_name, targetAmount: yearly_target, monthlyTarget: finalMonthlyTarget, type: "target" }, targetUser.id, false);
                    }
                    db.query("INSERT INTO notifications (task_id, user_id, type, title, description) VALUES (?, ?, ?, ?, ?)",
                      [0, targetUser.id, "target_assigned", "New Target Assigned", message],
                      () => {}
                    );
                  }
                }
              );
            }
            if (notificationIO) notificationIO.emitNotification("new_target", { id: newTargetId, userId: user_id, userName: user_name, targetAmount: yearly_target, monthlyTarget: finalMonthlyTarget, type: "target" }, null, true);
            res.json({ message: "Target created", id: newTargetId });
          }
        );
      }
    }
  );
});

/* UPDATE ACHIEVEMENT (User) */
router.post("/update", verifyToken, (req, res) => {
  const { user_id, user_name, amount, description } = req.body;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  
  if (!user_name || !amount) {
    return res.status(400).json({ error: "user_name and amount required" });
  }
  
  db.query(
    "SELECT id, monthly_target FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: "Target not set for user" });
      
      const targetId = rows[0].id;
      const monthlyTarget = rows[0].monthly_target;
      
      db.query(
        `INSERT INTO task_updates (user_id, user_name, target_id, month_year, amount, description) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, user_name, targetId, currentMonth, amount, description],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          
          db.query(
            `INSERT INTO task_achievements (user_id, user_name, target_id, month_year, achieved_amount) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE achieved_amount = achieved_amount + ?`,
            [user_id, user_name, targetId, currentMonth, amount, amount],
            (err3) => {
              if (err3) return res.status(500).json({ error: err3.message });
              
              db.query("INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
                [targetId, "Target Update", `${user_name} updated achievement by Rs.${Number(amount).toLocaleString()}`]);

              const notificationIO = getNotificationIO();
              db.query("SELECT SUM(achieved_amount) as total FROM task_achievements WHERE user_name = ? AND month_year = ?",
                [user_name, currentMonth],
                (selErr, selRows) => {
                  const totalAchieved = selRows[0]?.total || 0;
                  const percentage = monthlyTarget > 0 ? Math.round((totalAchieved / monthlyTarget) * 100) : 0;

                  if (notificationIO) {
                    notificationIO.emitNotification("target_updated", { id: targetId, userId: user_id, userName: user_name, newAmount: amount, totalAchieved, percentage, type: "achievement" }, null, true);
                    if (percentage >= 100) notificationIO.emitNotification("target_achieved", { id: targetId, userId: user_id, userName: user_name, percentage, type: "achievement" }, null, true);
                  }

                  db.query("INSERT INTO admin_notifications (type, user_id, message, related_id, related_type, priority) VALUES (?, ?, ?, ?, ?, ?)",
                    ["target_achievement", user_id, `${user_name} achieved Rs.${Number(amount).toLocaleString()} - Total: Rs.${Number(totalAchieved).toLocaleString()} (${percentage}%)`, targetId, "target", percentage >= 100 ? "high" : "normal"],
                    () => {}
                  );
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
router.get("/history", verifyToken, (req, res) => {
  const { user_name, months } = req.query;
  const limit = parseInt(months) || 12;
  
  db.query(
    `SELECT a.month_year, a.achieved_amount,
      (SELECT monthly_target FROM task_targets WHERE id = a.target_id) as monthly_target
    FROM task_achievements a
    WHERE a.user_name = ?
    ORDER BY a.month_year DESC
    LIMIT ?`,
    [user_name, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* GET TARGET GRAPH DATA */
router.get("/graph", verifyToken, (req, res) => {
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