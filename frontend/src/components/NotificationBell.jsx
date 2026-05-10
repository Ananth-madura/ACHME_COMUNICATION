import React from "react";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const NotificationPanel = () => {
  const { 
    notifications, 
    unreadCount, 
    showPanel, 
    setShowPanel, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    getNotificationIcon,
    getNotificationColor
  } = useNotifications();

  if (!showPanel) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => setShowPanel(false)}></div>
      <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Notifications</h2>
              <p className="text-blue-100 text-sm">{unreadCount} unread</p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="p-2 bg-white/20 rounded-lg hover:bg-white/30" title="Mark all read">
                  <CheckCheck size={18} />
                </button>
              )}
              <button onClick={clearNotifications} className="p-2 bg-white/20 rounded-lg hover:bg-white/30" title="Clear all">
                <Trash2 size={18} />
              </button>
              <button onClick={() => setShowPanel(false)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell size={48} className="mx-auto mb-4 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => (
                <div
                  key={notification.dbId || index}
                  onClick={() => markAsRead(notification.dbId)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition border-l-4 ${getNotificationColor(notification.type)} ${!notification.is_read ? "bg-blue-50" : ""}`}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{notification.data?.message || notification.message || notification.type}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.timestamp && new Date(notification.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
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
  const { unreadCount, setShowPanel } = useNotifications();

  return (
    <>
      <button 
        onClick={() => setShowPanel(true)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationPanel />
    </>
  );
};

export default NotificationBell;