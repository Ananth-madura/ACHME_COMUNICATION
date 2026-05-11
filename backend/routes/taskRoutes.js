const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middileware/authMiddleware");

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

const findUserForTask = (nameOrEmail, callback) => {
  if (!nameOrEmail) return callback(null, null);

  db.query(
    `SELECT u.id, u.first_name, u.email
     FROM users u
     LEFT JOIN teammember t ON t.emp_email = u.email
     WHERE u.id = ? OR u.email = ? OR u.first_name = ? OR CONCAT_WS(' ', t.first_name, t.last_name) = ? OR t.emp_email = ?
     LIMIT 1`,
    [nameOrEmail, nameOrEmail, nameOrEmail, nameOrEmail, nameOrEmail],
    (err, rows) => callback(err, rows && rows.length ? rows[0] : null)
  );
};

const notifyTaskAssigned = (task, assignedTo) => {
  findUserForTask(assignedTo, (err, user) => {
    if (err) {
      console.warn("task assignee lookup skipped:", err.message);
      return;
    }

    const message = `New task assigned: "${task.task_title || task.project_name || "Task"}"${task.due_date ? ` (Due: ${task.due_date})` : ""}`;

    const notificationIO = getNotificationIO();
    if (notificationIO && user?.id) {
      notificationIO.emitNotification("task_assigned", {
        taskId: task.id,
        taskName: task.task_title || task.project_name,
        userId: user.id,
        userName: user.first_name || assignedTo,
        dueDate: task.due_date,
        priority: task.project_priority,
        type: "task"
      }, user.id, false);
      return;
    }

    db.query(
      "INSERT INTO notifications (task_id, user_id, type, title, description) VALUES (?, ?, ?, ?, ?)",
      [task.id, user?.id || null, "task_assigned", "New Task Assigned", message],
      (notifErr) => { if (notifErr) console.warn("notifications insert skipped:", notifErr.message); }
    );
  });
};

const notifyTargetAssigned = (target, assignedTo) => {
  findUserForTask(assignedTo, (err, user) => {
    if (err) {
      console.warn("target assignee lookup skipped:", err.message);
      return;
    }

    const message = `New target assigned to you: ₹${Number(target.yearly_target || 0).toLocaleString()}/year`;

    const notificationIO = getNotificationIO();
    if (notificationIO && user?.id) {
      notificationIO.emitNotification("new_target", {
        id: target.id,
        userId: user.id,
        userName: user.first_name || assignedTo,
        targetAmount: target.yearly_target,
        type: "target"
      }, user.id, false);
      return;
    }

    db.query(
      "INSERT INTO notifications (user_id, type, title, description) VALUES (?, ?, ?, ?)",
      [user?.id || null, "target_assigned", "New Target Assigned", message],
      (notifErr) => { if (notifErr) console.warn("notifications insert skipped:", notifErr.message); }
    );
  });
};

const notifyTaskCompleted = (assignment) => {
  const notificationIO = getNotificationIO();
  if (notificationIO) {
    notificationIO.emitNotification("task_completed", {
      taskId: assignment.task_id,
      taskName: assignment.task_title || "Task",
      userId: assignment.assigned_to_user_id,
      userName: assignment.assigned_to_user_name,
      type: "task",
      priority: "high"
     }, null, true);
     return;
   }

   db.query(
     "INSERT INTO admin_notifications (type, user_id, message) VALUES (?, ?, ?)",
     ["task_completed", assignment.assigned_to_user_id || null, `${assignment.assigned_to_user_name || "Employee"} completed task: "${assignment.task_title || "Task"}"`]
   );
};

// Function to check for overdue tasks and send notifications
const checkOverdueTasks = () => {
  const query = `
    SELECT ta.*, t.task_title, t.due_date 
    FROM task_assignments ta 
    JOIN tasks t ON ta.task_id = t.id 
    WHERE ta.status NOT IN ('Completed', 'Declined') 
    AND t.due_date < CURDATE()
  `;

  db.query(query, (err, overdueTasks) => {
    if (err) {
      console.error("Error checking overdue tasks:", err);
      return;
    }

    overdueTasks.forEach(task => {
      // Notify admin about overdue task
      const notificationIO = getNotificationIO();
      if (notificationIO) {
        notificationIO.emitNotification("task_overdue", {
          taskId: task.task_id,
          taskName: task.task_title,
          assignedTo: task.assigned_to_user_name,
          dueDate: task.due_date,
          daysOverdue: Math.floor((new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24)),
          type: "task",
          priority: "high"
        }, null, true); // true for admin notification
      }

      // Also create a notification record
      db.query(
        "INSERT INTO admin_notifications (type, user_id, message) VALUES (?, ?, ?)",
        ["task_overdue", 0, `Task "${task.task_title}" assigned to ${task.assigned_to_user_name} is overdue by ${Math.floor((new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24))} days`]
      );
    });
  });
};

// Function to check for tasks due soon and send warnings
const checkUpcomingDeadlines = () => {
  const query = `
    SELECT ta.*, t.task_title, t.due_date 
    FROM task_assignments ta 
    JOIN tasks t ON ta.task_id = t.id 
    WHERE ta.status NOT IN ('Completed', 'Declined') 
    AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
  `;

  db.query(query, (err, upcomingTasks) => {
    if (err) {
      console.error("Error checking upcoming deadlines:", err);
      return;
    }

    upcomingTasks.forEach(task => {
      // Notify admin about upcoming deadline
      const notificationIO = getNotificationIO();
      if (notificationIO) {
        notificationIO.emitNotification("task_overdue_warning", {
          taskId: task.task_id,
          taskName: task.task_title,
          assignedTo: task.assigned_to_user_name,
          dueDate: task.due_date,
          daysUntilDue: Math.floor((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
          type: "task",
          priority: "medium"
        }, null, true); // true for admin notification
      }

      // Also create a notification record
      db.query(
        "INSERT INTO admin_notifications (type, user_id, message) VALUES (?, ?, ?)",
        ["task_overdue_warning", 0, `Task "${task.task_title}" assigned to ${task.assigned_to_user_name} is due in ${Math.floor((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days`]
      );
    });
  });
};

// Set up periodic checks for overdue tasks and upcoming deadlines (every hour)
setInterval(checkOverdueTasks, 60 * 60 * 1000); // Every hour
setInterval(checkUpcomingDeadlines, 60 * 60 * 1000); // Every hour

/* GET ALL TASKS - Authenticated users */



/* GET ALL TASKS - Authenticated users */
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role, first_name: user_name } = req.user;
  let sql = `
    SELECT t.*, u.first_name as creator_name 
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
  `;
  const params = [];
  
  if (role === "employee") {
    sql += " WHERE t.created_by = ? OR t.staff_name LIKE ? OR t.assigned_to = ?";
    params.push(user_id, `%${user_name}%`, user_id);
  }
  
  sql += " ORDER BY t.id DESC";
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/*  CREATE TASK - Admin Only */
router.post("/", verifyToken, isAdmin, (req, res) => {
  const {
    project_name, staff_name, task_title,
    project_status, project_priority, client_name, created_date, due_date, assigned_to
  } = req.body;

  const finalStaffName = assigned_to || staff_name || "";

  const sql = `
    INSERT INTO tasks
    (project_name, task_title, project_status, project_priority, staff_name, client_name, created_date, due_date, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql,
    [project_name, task_title, project_status, project_priority, finalStaffName, client_name, created_date, due_date, assigned_to || null, req.user.id],
    (err, result) => {
      if (err) {
        console.error("Task create error:", err);
        return res.status(500).json({ message: err.message });
      }

      const taskId = result.insertId;

      // Non-fatal: log activity if table exists
      db.query(
        "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
        [taskId, "Created", `Task "${task_title}" created`],
        (logErr) => { if (logErr) console.warn("task_activity insert skipped:", logErr.message); }
      );

      // Non-fatal: notification if table exists
      db.query(
        "INSERT INTO notifications (task_id, title, description) VALUES (?, ?, ?)",
        [taskId, "New Task", `Task "${task_title}" added (${project_priority})`],
        (notifErr) => { if (notifErr) console.warn("notifications insert skipped:", notifErr.message); }
      );

      notifyTaskAssigned({
        id: taskId,
        task_title,
        project_name,
        project_priority,
        due_date
      }, finalStaffName);

      res.json({ message: "Task created", id: taskId });
    }
  );
});

/* ================= UPDATE TASK - Authenticated users */
router.put("/:id", verifyToken, (req, res) => {
  const {
    project_name,
    task_title,
    project_status,
    project_priority,
    client_name,
    staff_name,
    created_date,
    due_date,
    assigned_to
  } = req.body;

  const finalStaffName = assigned_to || staff_name || "";

  const sql = `
    UPDATE tasks SET
      project_name = ?,
      task_title = ?,
      project_status = ?,
      project_priority = ?,
      client_name = ?,
      staff_name = ?,
      created_date = ?,
      due_date = ?,
      assigned_to = ?
    WHERE id = ?
  `;

  // Check ownership
  db.query("SELECT created_by FROM tasks WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query(
      sql,
      [
        project_name,
        task_title,
        project_status,
        project_priority,
        client_name,
        finalStaffName,
        created_date,
        due_date,
        assigned_to || null,
        req.params.id
      ],
      (err) => {
      if (err) return res.status(500).json(err);

      // Task Activity
      db.query(
        "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
        [req.params.id, "Updated", `Task "${task_title}" updated`]
      );

      // Notification
      db.query(
        "INSERT INTO notifications (task_id, title, description) VALUES (?, ?, ?)",
        [
          req.params.id,
          "Task Updated",
          `Task "${task_title}" details changed`
        ]
      );

      if (project_status === "Completed") {
        const notificationIO = getNotificationIO();
        if (notificationIO) {
          notificationIO.emitNotification("task_completed", {
            taskId: req.params.id,
            taskName: task_title,
            userName: finalStaffName || "Employee",
            type: "task",
            priority: "high"
          }, null, true);
        }
      }

      res.json({ message: "Task updated" });
    }
  );
});

/* ================= DELETE TASK - Admin Only ================= */
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  // Check ownership
  db.query("SELECT created_by FROM tasks WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "Not found" });
    
    if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    db.query(
      "DELETE FROM tasks WHERE id = ?",
      [req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);

        // Optional activity log
        db.query(
          "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
          [req.params.id, "Deleted", "Task deleted"]
        );

        res.json({ message: "Task deleted" });
      }
    );
  });
});

/* ================= DASHBOARD TASKS (READ ONLY) ================= */
router.get("/dashboard/tasks", (req, res) => {
  db.query(
    `SELECT id, task_title, project_status, project_priority, created_date
     FROM tasks
     ORDER BY created_date DESC
     LIMIT 5`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ================= TASK TARGETS ================= */

/* GET ALL TASK TARGETS (Admin Only) */
router.get("/targets", verifyToken, isAdmin, (req, res) => {
  db.query(
    `SELECT t.*, COALESCE(a.achieved_count, 0) as achieved_count,
      (t.monthly_target - COALESCE(a.achieved_count, 0)) as pending_count
    FROM task_targets t
    LEFT JOIN task_achievements a ON t.id = a.target_id AND a.month_year = DATE_FORMAT(NOW(), '%Y-%m')
    ORDER BY t.create_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* GET MY TASK TARGET (Employee) */
router.get("/targets/my", verifyToken, (req, res) => {
  const user_name = req.user.name || req.query.user_name;
  if (!user_name) return res.status(400).json({ error: "User name required" });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();

  db.query(
    "SELECT id, yearly_target, monthly_target FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, targetRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (targetRows.length === 0) return res.json({ message: "No target set", hasTarget: false });

      const targetId = targetRows[0].id;
      const monthlyTarget = targetRows[0].monthly_target;

      db.query(
        "SELECT achieved_count FROM task_achievements WHERE user_name = ? AND month_year = ?",
        [user_name, currentMonth],
        (err2, currentRows) => {
          const achievedCount = currentRows.length > 0 ? currentRows[0].achieved_count : 0;
          const pendingCount = Math.max(0, monthlyTarget - achievedCount);

          res.json({
            ...targetRows[0],
            hasTarget: true,
            achieved_count: achievedCount,
            pending_count: pendingCount,
            current_month: currentMonth
          });
        }
      );
    }
  );
});
/* GET TASK TARGET FOR USER - With Carry Forward (Legacy - keep for backward compatibility) */
router.get("/targets/user", verifyToken, (req, res) => {
  const { user_name } = req.query;
  if (!user_name) return res.status(400).json({ error: "user_name required" });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();

  // Get current year's target
  db.query(
    "SELECT id, yearly_target, monthly_target FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, targetRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (targetRows.length === 0) return res.json(null);

      const targetId = targetRows[0].id;
      const monthlyTarget = targetRows[0].monthly_target;

      // Check previous month's carry forward
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 7);

      db.query(
        "SELECT achieved_count FROM task_achievements WHERE user_name = ? AND month_year = ?",
        [user_name, prevMonthStr],
        (err2, prevRows) => {
          let carryForward = 0;
          if (prevRows.length > 0 && prevRows[0].achieved_count < monthlyTarget) {
            carryForward = monthlyTarget - prevRows[0].achieved_count;
          }

          // Get current month's achievement
          db.query(
            "SELECT achieved_count FROM task_achievements WHERE user_name = ? AND month_year = ?",
            [user_name, currentMonth],
            (err3, currentRows) => {
              const achievedCount = currentRows.length > 0 ? currentRows[0].achieved_count : 0;
              const effectiveTarget = monthlyTarget + carryForward;
              const pendingCount = Math.max(0, effectiveTarget - achievedCount);

              const result = {
                ...targetRows[0],
                achieved_count: achievedCount,
                pending_count: pendingCount,
                carry_forward: carryForward,
                effective_target: effectiveTarget,
                current_month: currentMonth
              };

              res.json(result);
            }
          );
        }
      );
    }
  );
});

/* CREATE/UPDATE TASK TARGET (Admin) - Yearly Based in INR */
router.post("/targets", verifyToken, isAdmin, (req, res) => {
  const { user_id, user_name, yearly_target, created_by_admin } = req.body;

  if (!user_name || !yearly_target) {
    return res.status(400).json({ error: "user_name and yearly_target (in INR) required" });
  }

  const currentYear = new Date().getFullYear();
  const monthlyTarget = Math.round(yearly_target / 12);

  db.query(
    "SELECT id FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const notificationIO = getNotificationIO();
      const isNewTarget = rows.length === 0;

      if (rows.length > 0) {
        db.query(
          "UPDATE task_targets SET yearly_target = ?, monthly_target = ?, updated_at = NOW() WHERE id = ?",
          [yearly_target, monthlyTarget, rows[0].id],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            if (notificationIO) {
              notificationIO.emitNotification("target_updated", {
                id: rows[0].id,
                userId: user_id,
                userName: user_name,
                newAmount: yearly_target,
                type: "target"
              }, user_id, true);
            }
            res.json({ message: "Target updated", id: rows[0].id, yearly_target, monthly_target: monthlyTarget });
          }
        );
      } else {
        db.query(
          "INSERT INTO task_targets (user_id, user_name, yearly_target, monthly_target, created_by_admin) VALUES (?, ?, ?, ?, ?)",
          [user_id, user_name, yearly_target, monthlyTarget, created_by_admin],
          (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            if (notificationIO) {
              notificationIO.emitNotification("new_target", {
                id: result.insertId,
                userId: user_id,
                userName: user_name,
                targetAmount: yearly_target,
                monthlyTarget,
                type: "target"
              }, user_id, true);
            }
            res.json({ message: "Yearly target created", id: result.insertId, yearly_target, monthly_target: monthlyTarget });
          }
        );
      }
    }
  );
});

/* UPDATE TASK ACHIEVEMENT (Employee) - With Carry Forward in INR */
router.post("/targets/update", verifyToken, (req, res) => {
  const { user_id, user_name, amount, description } = req.body;
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (!user_name || !amount) {
    return res.status(400).json({ error: "user_name and amount (in INR) required" });
  }

  // Get current year's target for user
  const currentYear = new Date().getFullYear();
  db.query(
    "SELECT id, yearly_target, monthly_target FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: "Yearly target not set for user" });

      const targetId = rows[0].id;
      const monthlyTarget = rows[0].monthly_target;

      // Check previous month's carry forward
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 7);

      db.query(
        "SELECT achieved_amount FROM task_achievements WHERE user_name = ? AND month_year = ?",
        [user_name, prevMonthStr],
        (err2, prevRows) => {
          let carryForward = 0;
          if (prevRows.length > 0 && prevRows[0].achieved_amount < monthlyTarget) {
            carryForward = monthlyTarget - prevRows[0].achieved_amount;
          }

          // Calculate effective target for current month
          const effectiveTarget = monthlyTarget + carryForward;

          // Insert achievement update
          db.query(
            `INSERT INTO task_updates (user_id, user_name, target_id, month_year, amount, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, user_name, targetId, currentMonth, amount, description],
            (err3) => {
              if (err3) return res.status(500).json({ error: err3.message });

              // Update monthly achievement (amount in INR)
              db.query(
                `INSERT INTO task_achievements (user_id, user_name, target_id, month_year, achieved_amount)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE achieved_amount = achieved_amount + ?`,
                [user_id, user_name, targetId, currentMonth, amount, amount],
                (err4) => {
                  if (err4) return res.status(500).json({ error: err4.message });

                  // Log activity
                  db.query(
                    "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
                    [targetId, "Task Achievement Update", `${user_name} achieved ₹${amount} (effective target: ₹${effectiveTarget})`]
                  );

                  const notificationIO = getNotificationIO();
                  if (notificationIO) {
                    const percentage = Math.round((amount / effectiveTarget) * 100);
                    notificationIO.emitNotification("target_updated", {
                      id: targetId,
                      userId: user_id,
                      userName: user_name,
                      newAmount: amount,
                      percentage,
                      type: "achievement"
                    }, null, true);

                    if (percentage >= 100) {
                      notificationIO.emitNotification("target_achieved", {
                        id: targetId,
                        userId: user_id,
                        userName: user_name,
                        percentage,
                        type: "achievement"
                      }, null, true);
                    }
                  }

                  res.json({
                    message: "Achievement updated",
                    target_id: targetId,
                    carry_forward: carryForward,
                    effective_target: effectiveTarget,
                    amount_updated: amount
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

/* GET TASK ACHIEVEMENT HISTORY */
router.get("/targets/history", (req, res) => {
  const { user_name, months } = req.query;
  const limit = parseInt(months) || 12;

  let sql = `
    SELECT a.month_year, a.achieved_count,
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

/* ASSIGN TASK/TARGET TO USER - Admin Only */
router.post("/assign", verifyToken, isAdmin, (req, res) => {
   const { task_id, target_id, assigned_to_user_id, assigned_to_user_name, assigned_by, due_date, priority, notes, type, amount } = req.body;

   // Validate required fields
   if (!assigned_to_user_name) {
     return res.status(400).json({ error: "assigned_to_user_name is required" });
   }

   // Determine if assigning task or target
   const isTaskAssignment = type === "task" && task_id;
   const isTargetAssignment = type === "target"; // Can be new or existing

   if (!isTaskAssignment && !isTargetAssignment) {
     return res.status(400).json({ error: "Either task_id (for task) or target_id (for target) is required" });
   }

   // For task assignment, update the task with staff_name
   if (isTaskAssignment) {
     db.query(
       "UPDATE tasks SET staff_name = ?, assigned_to = ? WHERE id = ?",
       [assigned_to_user_name, assigned_to_user_id || null, task_id],
       (updateErr) => {
         if (updateErr) return res.status(500).json({ error: updateErr.message });

         // Then create assignment record
         db.query(
           `INSERT INTO task_assignments
            (task_id, assigned_to_user_id, assigned_to_user_name, assigned_by, assigned_date, due_date, priority, notes)
            VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)`,
           [task_id, assigned_to_user_id, assigned_to_user_name, assigned_by, due_date, priority, notes],
           (err, result) => {
             if (err) return res.status(500).json({ error: err.message });

             // Update task activity
             db.query(
               "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
               [task_id, "Task Assigned", `Task assigned to ${assigned_to_user_name}`]
             );

             // Notify assigned user via socket
             notifyTaskAssigned({
               id: task_id,
               task_title: `Task #${task_id}`,
               project_priority: priority,
               due_date
             }, assigned_to_user_id || assigned_to_user_name);

             res.json({ message: "Task assigned successfully", id: result.insertId });
           }
         );
       }
     );
   } 
   // For target assignment
   else if (isTargetAssignment) {
      // If amount is provided, we create/update the target in task_targets table
      if (amount) {
        const yearly_target = parseFloat(amount);
        const monthlyTarget = Math.round(yearly_target / 12);
        
        db.query(
          "SELECT id FROM task_targets WHERE user_name = ? OR user_id = ?",
          [assigned_to_user_name, assigned_to_user_id],
          (targetErr, targetRows) => {
            if (targetErr) return res.status(500).json({ error: targetErr.message });
            
            if (targetRows.length > 0) {
              // Update existing target
              db.query(
                "UPDATE task_targets SET yearly_target = ?, monthly_target = ?, updated_at = NOW() WHERE id = ?",
                [yearly_target, monthlyTarget, targetRows[0].id]
              );
            } else {
              // Create new target
              db.query(
                "INSERT INTO task_targets (user_id, user_name, yearly_target, monthly_target, created_by_admin) VALUES (?, ?, ?, ?, 1)",
                [assigned_to_user_id, assigned_to_user_name, yearly_target, monthlyTarget]
              );
            }
          }
        );
      }

      // Create a target assignment record
      db.query(
        `INSERT INTO task_assignments
         (task_id, assigned_to_user_id, assigned_to_user_name, assigned_by, assigned_date, due_date, priority, notes)
         VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)`,
        [target_id || 0, assigned_to_user_id, assigned_to_user_name, assigned_by, due_date, priority, notes],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });

          // Update task activity for target assignment
          db.query(
            "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
            [target_id || 0, "Target Assigned", `Target assigned to ${assigned_to_user_name}`]
          );

          // Notify assigned user via socket about target assignment
          notifyTargetAssigned({
            id: target_id || 0,
            yearly_target: amount || 0,
            target_name: `Target for ${assigned_to_user_name}`
          }, assigned_to_user_id || assigned_to_user_name);

          res.json({ message: "Target assigned successfully", id: result.insertId });
        }
      );
   }
});

/* GET ASSIGNED TASKS FOR USER */
router.get("/assigned/:user_name", (req, res) => {
  const { user_name } = req.params;
  const { status } = req.query;

  let sql = `
    SELECT ta.*, t.task_title, t.project_name, t.client_name, t.created_date
    FROM task_assignments ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.assigned_to_user_name = ?
  `;

  const params = [user_name];

  if (status) {
    sql += " AND ta.status = ?";
    params.push(status);
  }

  sql += " ORDER BY ta.created_at DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ACCEPT OR DECLINE TASK ASSIGNMENT */
router.put("/assignment/:id/respond", (req, res) => {
  const { action, notes } = req.body;

  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: "Invalid action. Use 'accept' or 'decline'" });
  }

  const newStatus = action === "accept" ? "Accepted" : "Declined";

  db.query(
    "SELECT ta.*, t.task_title, t.project_name FROM task_assignments ta JOIN tasks t ON ta.task_id = t.id WHERE ta.id = ?",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: "Assignment not found" });

      const assignment = rows[0];

      db.query(
        "UPDATE task_assignments SET status = ?, response_notes = ?, updated_at = NOW() WHERE id = ?",
        [newStatus, notes || null, req.params.id],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          // Create admin notification
          const notifMessage = action === "accept" 
            ? `${assignment.assigned_to_user_name} ACCEPTED task: "${assignment.task_title}"`
            : `${assignment.assigned_to_user_name} DECLINED task: "${assignment.task_title}"${notes ? ` - Reason: ${notes}` : ""}`;

          db.query(
            "INSERT INTO admin_notifications (type, user_id, message) VALUES (?, ?, ?)",
            ["task_response", assignment.assigned_to_user_id || 0, notifMessage]
          );

          // Log activity
          db.query(
            "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
            [assignment.task_id, newStatus, `${assignment.assigned_to_user_name} ${newStatus.toLowerCase()} the task${notes ? `: ${notes}` : ""}`]
          );

          res.json({ message: `Task ${newStatus.toLowerCase()} successfully`, status: newStatus });
        }
      );
    }
  );
});

/* UPDATE TASK ASSIGNMENT STATUS */
router.put("/assignment/:id/status", (req, res) => {
  const { status } = req.body;

  if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  // First get current assignment info
  db.query(
    "SELECT ta.task_id, ta.assigned_to_user_name, ta.assigned_to_user_id, ta.status as old_status, t.task_title FROM task_assignments ta LEFT JOIN tasks t ON t.id = ta.task_id WHERE ta.id = ?",
    [req.params.id],
    (err, currentRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (currentRows.length === 0) return res.status(404).json({ error: "Assignment not found" });

      const assignment = currentRows[0];
      const wasCompleted = assignment.old_status === "Completed";
      const nowCompleted = status === "Completed";

      // Update assignment status
      db.query(
        "UPDATE task_assignments SET status = ?, updated_at = NOW() WHERE id = ?",
        [status, req.params.id],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          // If status changed to/from Completed, update user achievement
          if (!wasCompleted && nowCompleted) {
            // Task just completed - add to achievement
            updateTaskAchievement(assignment.assigned_to_user_id, assignment.assigned_to_user_name, 1, "Task completed");
            notifyTaskCompleted(assignment);
          } else if (wasCompleted && !nowCompleted) {
            // Task status changed from completed - subtract from achievement
            updateTaskAchievement(assignment.assigned_to_user_id, assignment.assigned_to_user_name, -1, "Task status changed from completed");
          }

          // Log activity
          db.query(
            "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
            [assignment.task_id, "Status Updated", `Task status updated to ${status} by ${assignment.assigned_to_user_name}`]
          );

          res.json({ message: "Status updated" });
        }
      );
    }
  );
});

// Helper function to update task achievement
function updateTaskAchievement(user_id, user_name, count, description) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Get current year's target
  const currentYear = new Date().getFullYear();
  db.query(
    "SELECT id, yearly_target, monthly_target FROM task_targets WHERE user_name = ? AND YEAR(created_at) = ?",
    [user_name, currentYear],
    (err, targetRows) => {
      if (err || targetRows.length === 0) return;

      const targetId = targetRows[0].id;
      const monthlyTarget = targetRows[0].monthly_target;

      // Check previous month's carry forward
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 7);

      db.query(
        "SELECT achieved_count FROM task_achievements WHERE user_name = ? AND month_year = ?",
        [user_name, prevMonthStr],
        (err2, prevRows) => {
          let carryForward = 0;
          if (prevRows.length > 0 && prevRows[0].achieved_count < monthlyTarget) {
            carryForward = monthlyTarget - prevRows[0].achieved_count;
          }

          // Insert achievement update
          db.query(
            `INSERT INTO task_updates (user_id, user_name, target_id, month_year, count, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, user_name, targetId, currentMonth, count, description],
            () => {
              // Update monthly achievement
              db.query(
                `INSERT INTO task_achievements (user_id, user_name, target_id, month_year, achieved_count)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE achieved_count = achieved_count + ?`,
                [user_id, user_name, targetId, currentMonth, count, count],
                () => {
                  // Log activity
                  db.query(
                    "INSERT INTO task_activity (task_id, action, message) VALUES (?, ?, ?)",
                    [targetId, "Task Achievement Update", `${user_name} ${description} (${count > 0 ? '+' : ''}${count})`]
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}

/* ================= NOTIFICATIONS ================= */
router.get("/notifications", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  const params = [];
  let sql = "SELECT * FROM notifications";
  
  if (role === "employee") {
    sql += " WHERE user_id = ? OR user_id IS NULL";
    params.push(user_id);
  } else if (req.query.user_id) {
    sql += " WHERE user_id = ?";
    params.push(req.query.user_id);
  }
  
  sql += " ORDER BY created_at DESC";

  db.query(
    sql,
    params,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.put("/notifications/:id/read", (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

/* ================= TASK ACTIVITY ================= */
router.get("/activity", (req, res) => {
  db.query(
    "SELECT * FROM task_activity ORDER BY created_at DESC LIMIT 10",
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

module.exports = router;
