import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import socket from "../socket/socket";
import { useAuth } from "../auth/AuthContext";
import { API } from "../config/api";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  // Fetch initial notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [notifRes, countRes] = await Promise.all([
        axios.get(`${API}/api/notifications?limit=50`, { headers }),
        axios.get(`${API}/api/notifications/unread-count`, { headers }),
      ]);
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.count || 0);

      if (user.role === "admin") {
        const [adminRes, adminCountRes] = await Promise.all([
          axios.get(`${API}/api/notifications/admin?limit=50`, { headers }),
          axios.get(`${API}/api/notifications/admin/unread-count`, { headers }),
        ]);
        setAdminNotifications(adminRes.data || []);
        setAdminUnreadCount(adminCountRes.data?.count || 0);
      }
    } catch (err) {
      // Silently fail - notifications are non-critical
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Join appropriate socket rooms based on role
    if (user.role === "admin") {
      socket.emit("join_admin");
      socket.emit("join", { userId: user.id, role: "admin" });
    } else {
      socket.emit("join_notifications", user.id);
      socket.emit("join", { userId: user.id, role: user.role });
    }

    // Listen for new notifications
    socket.on("new_notification", (notification) => {
      // Role-based filtering: employees only see their own notifications
      if (user.role === "employee" && notification.data?.user_id && notification.data.user_id !== user.id) {
        return;
      }
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    });

    // Admin-specific notifications
    if (user.role === "admin") {
      socket.on("new_notification", (notification) => {
        setAdminNotifications(prev => [notification, ...prev].slice(0, 50));
        setAdminUnreadCount(prev => prev + 1);
      });
    }

    socket.on("notification_read", ({ notificationId }) => {
      setNotifications(prev => prev.map(n => n.dbId === notificationId || n.id === notificationId ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      socket.off("new_notification");
      socket.off("notification_read");
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    socket.emit("mark_read", notificationId);
    setNotifications(prev => prev.map(n => (n.dbId === notificationId || n.id === notificationId) ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await axios.put(`${API}/api/notifications/${notificationId}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) { /* non-critical */ }
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    notifications.forEach(n => {
      if (!n.is_read) socket.emit("mark_read", n.dbId || n.id);
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await axios.put(`${API}/api/notifications/read-all`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) { /* non-critical */ }
    }
  }, [notifications]);

  const markAdminAsRead = useCallback(async (notificationId) => {
    setAdminNotifications(prev => prev.map(n => (n.dbId === notificationId || n.id === notificationId) ? { ...n, is_read: 1 } : n));
    setAdminUnreadCount(prev => Math.max(0, prev - 1));

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await axios.put(`${API}/api/notifications/admin/${notificationId}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) { /* non-critical */ }
    }
  }, []);

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
      case "task_assigned_to_employee": return "📋";
      case "task_completed": return "✅";
      case "task_completed_by_employee": return "✅";
      case "task_updated": return "🔄";
      case "task_not_completed": return "⏰";
      case "task_overdue": return "⏰";
      case "task_overdue_warning": return "⚠️";
      case "daily_task_summary": return "📊";
      case "new_lead": return "📞";
      case "lead_converted": return "🎉";
      case "lead_updated": return "✏️";
      case "missed_calls": return "⚠️";
      case "escalation_created": return "🚨";
      case "escalation_resolved": return "✅";
      case "contract_created": return "📝";
      case "proposal_created": return "📄";
      case "service_created": return "🔧";
      default: return "🔔";
    }
  };

  const getNotificationColor = (type) => {
    if (["missed_calls", "task_not_completed", "task_overdue", "escalation_created"].includes(type)) return "border-l-red-500 bg-red-50";
    if (type === "task_overdue_warning") return "border-l-orange-500 bg-orange-50";
    if (["target_achieved", "lead_converted", "task_completed", "task_completed_by_employee", "escalation_resolved"].includes(type)) return "border-l-green-500 bg-green-50";
    if (["new_lead", "proposal_created", "contract_created", "task_assigned", "task_assigned_to_employee"].includes(type)) return "border-l-blue-500 bg-blue-50";
    if (type === "daily_task_summary") return "border-l-purple-500 bg-purple-50";
    return "border-l-yellow-500 bg-yellow-50";
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      adminNotifications,
      unreadCount,
      adminUnreadCount,
      showPanel,
      setShowPanel,
      markAsRead,
      markAllAsRead,
      markAdminAsRead,
      clearNotifications,
      getNotificationIcon,
      getNotificationColor,
      refreshNotifications: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
