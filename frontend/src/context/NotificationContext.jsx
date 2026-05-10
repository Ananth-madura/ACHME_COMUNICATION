import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import socket from "../socket/socket";
import { useAuth } from "../auth/AuthContext";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role === "admin") {
      socket.emit("join_admin");
    } else {
      socket.emit("join_notifications", user.id);
    }

    socket.on("new_notification", (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    });

    socket.on("notification_read", ({ notificationId }) => {
      setNotifications(prev => prev.map(n => n.dbId === notificationId ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      socket.off("new_notification");
      socket.off("notification_read");
    };
  }, [user]);

  const markAsRead = useCallback((notificationId) => {
    socket.emit("mark_read", notificationId);
    setNotifications(prev => prev.map(n => n.dbId === notificationId ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    notifications.forEach(n => {
      if (!n.is_read) socket.emit("mark_read", n.dbId);
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_target": return "🎯";
      case "target_updated": return "📈";
      case "target_achieved": return "🏆";
      case "task_assigned": return "📋";
      case "task_completed": return "✅";
      case "task_updated": return "🔄";
      case "task_not_completed": return "⏰";
      case "daily_task_summary": return "📊";
      case "new_lead": return "📞";
      case "lead_converted": return "🎉";
      case "lead_updated": return "✏️";
      case "missed_calls": return "⚠️";
      case "contract_created": return "📝";
      case "proposal_created": return "📄";
      case "service_created": return "🔧";
      default: return "🔔";
    }
  };

  const getNotificationColor = (type) => {
    if (type === "missed_calls" || type === "task_not_completed") return "border-l-red-500 bg-red-50";
    if (type === "target_achieved" || type === "lead_converted") return "border-l-green-500 bg-green-50";
    if (type === "new_lead" || type === "proposal_created" || type === "contract_created") return "border-l-blue-500 bg-blue-50";
    if (type === "daily_task_summary") return "border-l-purple-500 bg-purple-50";
    return "border-l-yellow-500 bg-yellow-50";
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      showPanel,
      setShowPanel,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      getNotificationIcon,
      getNotificationColor
    }}>
      {children}
    </NotificationContext.Provider>
  );
};