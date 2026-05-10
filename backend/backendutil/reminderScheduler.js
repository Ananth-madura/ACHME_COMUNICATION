"use strict";
/**
 * Reminder Scheduler — runs every 15 minutes automatically
 * Marks overdue reminders as Missed, triggers escalation at 3+ missed
 */
const schedule = require("node-schedule");
const db = require("../config/database");

const toDateOnly = (val) => (!val ? null : val.toString().slice(0, 10));

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

function runCheckMissed() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8);

  // 1. Mark overdue Pending reminders as Missed + increment missed_count
  db.query(
    `UPDATE lead_reminders SET status='Missed', missed_count = missed_count + 1
     WHERE status='Pending' AND (
       reminder_date < ?
       OR (reminder_date = ? AND reminder_time IS NOT NULL AND TIME(reminder_time) < ?)
     )`,
    [today, today, currentTime],
    (err, result) => {
      if (err) { console.error("[Scheduler] check-missed error:", err.message); return; }
      if (result.affectedRows > 0) {
        console.log(`[Scheduler] Marked ${result.affectedRows} reminders as Missed`);
      }

      // 2. Find leads with 3+ missed reminders → escalate
      const escalateSql = `
        SELECT lr.lead_id, lr.lead_type, COUNT(*) as total_missed,
               COALESCE(t.customer_name, w.customer_name, f.customer_name) as customer_name,
               COALESCE(t.mobile_number, w.mobile_number, f.mobile_number) as mobile_number,
               COALESCE(t.staff_name, w.staff_name, f.staff_name) as staff_name,
               COALESCE(t.followup_date, w.followup_date, f.followup_date) as followup_date,
               MAX(lr.reminder_date) as last_reminder_date
        FROM lead_reminders lr
        LEFT JOIN Telecalls t ON t.id = lr.lead_id AND lr.lead_type = 'telecall'
        LEFT JOIN Walkins w ON w.id = lr.lead_id AND lr.lead_type = 'walkin'
        LEFT JOIN fields f ON f.id = lr.lead_id AND lr.lead_type = 'field'
        WHERE lr.status = 'Missed'
        GROUP BY lr.lead_id, lr.lead_type
        HAVING total_missed >= 3
      `;

      db.query(escalateSql, (err2, leads) => {
        if (err2 || !leads.length) return;

        leads.forEach(lead => {
          db.query(
            "SELECT id FROM lead_escalations WHERE lead_id=? AND lead_type=? AND status='Open'",
            [lead.lead_id, lead.lead_type],
            (e, existing) => {
              if (existing && existing.length > 0) {
                // Update missed count
                db.query(
                  "UPDATE lead_escalations SET missed_count=?, last_followup_date=? WHERE id=?",
                  [lead.total_missed, toDateOnly(lead.last_reminder_date), existing[0].id]
                );

                // Send notification for updated missed count (only at 3, 5, 7, etc.)
                if ([3, 5, 7, 9, 10].includes(lead.total_missed)) {
                  const notificationIO = getNotificationIO();
                  if (notificationIO) {
                    const time = new Date().toLocaleString();
                    notificationIO.emitNotification("missed_calls", {
                      leadId: lead.lead_id,
                      leadType: lead.lead_type,
                      userName: lead.staff_name,
                      customerName: lead.customer_name,
                      mobileNumber: lead.mobile_number,
                      count: lead.total_missed,
                      missedAt: time,
                      type: "lead"
                    }, null, true);
                  }
                }
              } else {
                // Create new escalation
                db.query(
                  `INSERT INTO lead_escalations 
                   (lead_id, lead_type, customer_name, mobile_number, staff_name, last_followup_date, missed_count)
                   VALUES (?,?,?,?,?,?,?)`,
                  [lead.lead_id, lead.lead_type, lead.customer_name, lead.mobile_number,
                   lead.staff_name, toDateOnly(lead.last_reminder_date), lead.total_missed],
                  (e2) => {
                    if (!e2) {
                      console.log(`[Scheduler] Escalation created for lead ${lead.lead_id} (${lead.lead_type})`);

                      // Send notification for first escalation (3 missed calls)
                      const notificationIO = getNotificationIO();
                      if (notificationIO) {
                        const time = new Date().toLocaleString();
                        notificationIO.emitNotification("missed_calls", {
                          leadId: lead.lead_id,
                          leadType: lead.lead_type,
                          userName: lead.staff_name,
                          customerName: lead.customer_name,
                          mobileNumber: lead.mobile_number,
                          count: lead.total_missed,
                          missedAt: time,
                          type: "lead"
                        }, null, true);
                      }
                    }
                  }
                );
              }
            }
          );
        });
      });
    }
  );
}

// Run every 15 minutes
schedule.scheduleJob("*/15 * * * *", runCheckMissed);

// Also run once on startup
setTimeout(runCheckMissed, 3000);

console.log("[Scheduler] Reminder escalation scheduler started (every 15 min)");

// End of day task check - runs daily at 6 PM
function runDailyTaskCheck() {
  const today = new Date().toISOString().slice(0, 10);

  db.query(
    `SELECT t.*, t.staff_name as user_name FROM tasks t
     WHERE t.due_date < ? AND t.project_status != 'Completed'`,
    [today],
    (err, incompleteTasks) => {
      if (err) {
        console.error("[Scheduler] Daily task check error:", err.message);
        return;
      }

      if (incompleteTasks.length === 0) {
        console.log("[Scheduler] No incomplete tasks for end-of-day check");
        return;
      }

      // Group by employee
      const employeeTasks = {};
      incompleteTasks.forEach(task => {
        const empName = task.staff_name || task.assigned_to || task.user_name || "Unknown";
        if (!employeeTasks[empName]) {
          employeeTasks[empName] = [];
        }
        employeeTasks[empName].push(task);
      });

      const notificationIO = getNotificationIO();
      if (!notificationIO) return;

      // Send notification for each employee with incomplete tasks
      Object.keys(employeeTasks).forEach(empName => {
        const tasks = employeeTasks[empName];
        tasks.forEach(task => {
          notificationIO.emitNotification("task_not_completed", {
            taskId: task.id,
            taskName: task.project_name || task.task_title || "Task",
            employeeName: empName,
            dueDate: task.due_date,
            status: task.project_status,
            type: "task"
          }, null, true);
        });
      });

      // Also send summary notification
      const uniqueEmployees = Object.keys(employeeTasks).length;
      notificationIO.emitNotification("daily_task_summary", {
        incompleteCount: incompleteTasks.length,
        employeeCount: uniqueEmployees,
        date: today,
        type: "summary"
      }, null, true);

      console.log(`[Scheduler] End-of-day task check: ${incompleteTasks.length} incomplete tasks from ${uniqueEmployees} employees`);
    }
  );
}

// Run daily at 6 PM
schedule.scheduleJob("0 18 * * *", runDailyTaskCheck);

// Also run once on startup (with delay)
setTimeout(() => {
  console.log("[Scheduler] Running initial task check...");
  runDailyTaskCheck();
}, 10000);

console.log("[Scheduler] End-of-day task scheduler started (daily at 6 PM)");

module.exports = { runCheckMissed, runDailyTaskCheck };
