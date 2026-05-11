const { Server } = require("socket.io");
const db = require("../config/database");

function initNotificationsSocket(io, corsOrigin = "*") {
  const notifIO = io.of("/notifications");

  notifIO.on("connection", (socket) => {
    socket.on("join_notifications", (userId) => {
      if (!userId) return;
      socket.join(`notifications:${userId}`);
      console.log(`User ${userId} joined notifications channel`);
    });

    socket.on("join_admin", () => {
      socket.join("admin_notifications");
      console.log("Admin joined notifications channel");
    });

    socket.on("mark_read", (notificationId) => {
      if (!notificationId) return;
      db.query("UPDATE admin_notifications SET is_read = 1 WHERE id = ?", [notificationId], (err) => {
        db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [notificationId], () => {
          notifIO.emit("notification_read", { notificationId });
        });
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected from notifications");
    });
  });

  const emitNotification = (type, data, targetUserId = null, isAdmin = true) => {
    const notification = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date().toISOString(),
      is_read: 0
    };

    const message = data.message || getNotificationMessage(type, data);
    const priority = data.priority || "normal";

    const emitToEmployee = () => {
      if (!targetUserId) return;

      db.query(
        "INSERT INTO notifications (task_id, user_id, type, title, description) VALUES (?, ?, ?, ?, ?)",
        [data.taskId || data.id || null, targetUserId, type, data.title || type, message],
        (err, result) => {
          if (err) {
            console.warn("employee notification insert skipped:", err.message);
            notifIO.to(`notifications:${targetUserId}`).emit("new_notification", notification);
            return;
          }

          notifIO.to(`notifications:${targetUserId}`).emit("new_notification", {
            ...notification,
            dbId: result.insertId
          });
        }
      );
    };

    if (!isAdmin) {
      emitToEmployee();
      return;
    }

    db.query(
      "INSERT INTO admin_notifications (type, message, related_id, related_type, created_by, priority) VALUES (?, ?, ?, ?, ?, ?)",
      [type, message, data.id || data.taskId || data.leadId || null, data.type || null, data.userId || null, priority],
      (err, result) => {
        if (err) {
          console.warn("admin notification insert skipped:", err.message);
          return emitToEmployee();
        }

        notification.dbId = result.insertId;
        notifIO.to("admin_notifications").emit("new_notification", notification);
        emitToEmployee();
      }
    );
  };

  const getNotificationMessage = (type, data) => {
    switch (type) {
      case "new_target":
        return `New target assigned: ₹${data.targetAmount || 0} for ${data.userName || "employee"}`;
      case "target_updated":
        return `${data.userName || "Employee"} updated target - Now: ₹${data.newAmount || 0}`;
      case "target_achieved":
        return `${data.userName || "Employee"} achieved ${data.percentage || 0}% of target`;
      case "task_assigned":
        return `New task assigned to ${data.userName || "employee"}: ${data.taskName || "Task"}`;
      case "task_completed":
        return `${data.userName || "Employee"} completed task: ${data.taskName || "Task"}`;
      case "profile_change_requested":
        return `${data.userName || "Employee"} requested profile change: ${data.fieldLabel || data.field || "Profile"}`;
      case "profile_change_approved":
        return `Your profile change was approved: ${data.fieldLabel || data.field || "Profile"}`;
      case "profile_change_declined":
        return `Your profile change was declined: ${data.fieldLabel || data.field || "Profile"}`;
      case "registration_approved":
        return `Your account has been approved. You can now log in.`;
      case "registration_declined":
        return `Your account request was declined. Please contact admin.`;
      case "task_updated":
        return `${data.userName || "Employee"} updated task status to: ${data.status || "Updated"}`;
      case "new_lead":
        return `New lead added: ${data.customerName || "Unknown"} - ${data.leadType || "Telecalling"}`;
      case "lead_converted":
        return `🎉 ${data.staffName || "Employee"} converted lead: ${data.customerName || "Unknown"} at ${data.convertedAt || ""}`;
      case "lead_updated":
        return `Lead status updated: ${data.customerName || "Unknown"} → ${data.status || "Updated"}`;
      case "missed_calls":
        return `⚠️ ${data.userName || "Employee"} missed ${data.count || 3} calls for ${data.customerName || "Unknown"} at ${data.missedAt || ""}`;
      case "contract_created":
        return `📝 New contract: ${data.contractTitle || "Contract"} for ${data.clientName || "Client"} - ₹${data.amountValue || 0}`;
      case "proposal_created":
        return `📄 New proposal: ${data.referenceNo || "QT"} for ${data.clientCompany || data.customerName || "Client"} - ₹${data.grandTotal || 0} by ${data.createdBy || "Employee"}`;
      case "service_created":
        return `New service added: ${data.serviceType || "Service"} for ${data.clientName || "Client"}`;
      case "task_not_completed":
        return `⚠️ ${data.employeeName || "Employee"} has not completed their task: "${data.taskName || "Task"}" (Due: ${data.dueDate || "N/A"})`;
      case "daily_task_summary":
        return `📋 End of day summary: ${data.incompleteCount || 0} task(s) not completed by employees`;
      default:
        return `Notification: ${type}`;
    }
  };

  io.emitNotification = emitNotification;
  
  io.sendToUser = (userId, event, data) => {
    notifIO.to(`notifications:${userId}`).emit(event, data);
  };

  io.sendToAdmin = (event, data) => {
    notifIO.to("admin_notifications").emit(event, data);
  };

  return notifIO;
}

module.exports = { initNotificationsSocket };
