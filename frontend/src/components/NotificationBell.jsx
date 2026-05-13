import React, { useState } from "react";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const NotificationPanel = () => {
  const { 
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
    getNotificationColor
  } = useNotifications();

  const [activeTab, setActiveTab] = useState("all");

  if (!showPanel) return null;

  const totalUnread = unreadCount + adminUnreadCount;
  const allNotifications = [
    ...adminNotifications.map(n => ({ ...n, isAdmin: true })),
    ...notifications.map(n => ({ ...n, isAdmin: false })),
  ].sort((a, b) => {
    const ta = new Date(a.timestamp || a.created_at || 0);
    const tb = new Date(b.timestamp || b.created_at || 0);
    return tb - ta;
  });

  const filteredNotifications = activeTab === "all" 
    ? allNotifications 
    : activeTab === "admin" 
      ? allNotifications.filter(n => n.isAdmin) 
      : allNotifications.filter(n => !n.isAdmin);

  const handleMarkRead = (notification) => {
    if (notification.isAdmin) {
      markAdminAsRead(notification.id);
    } else {
      markAsRead(notification.dbId || notification.id);
    }
  };

  const handleMarkAll = () => {
    markAllAsRead();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => setShowPanel(false)}></div>
      <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">Notifications</h2>
              <p className="text-blue-100 text-sm">{totalUnread} unread</p>
            </div>
            <button onClick={() => setShowPanel(false)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            {[["all","All"],["admin","Admin"],["employee","Employee"]].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors"
                style={{ background: activeTab === key ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#e5e3df" }}>
          <span className="text-xs" style={{ color: "#787671" }}>{filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}</span>
          {totalUnread > 0 && (
            <button onClick={handleMarkAll} className="text-xs font-medium cursor-pointer flex items-center gap-1" style={{ color: "#5645d4" }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        <div className="overflow-y-auto h-[calc(100vh-140px)]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell size={48} className="mx-auto mb-4 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.dbId || notification.id || index}
                  onClick={() => handleMarkRead(notification)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition border-l-4 ${getNotificationColor(notification.type)} ${!notification.is_read ? "bg-blue-50" : ""}`}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{notification.data?.message || notification.message || notification.type}</p>
                      <p className="text-xs mt-1" style={{ color: notification.isAdmin ? "#9333ea" : "#64748b" }}>
                        {notification.isAdmin ? "Admin" : "Employee"} {notification.created_at || notification.timestamp ? new Date(notification.created_at || notification.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotificationBell = () => {
  const { unreadCount, adminUnreadCount, setShowPanel } = useNotifications();
  const total = unreadCount + adminUnreadCount;

  return (
    <>
      <button 
        onClick={() => setShowPanel(true)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition"
      >
        <Bell size={22} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      <NotificationPanel />
    </>
  );
};

export default NotificationBell;