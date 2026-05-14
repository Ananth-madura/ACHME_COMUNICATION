const PUSH_NOTIFICATIONS_KEY = "pushNotificationsEnabled";

export const isPushSupported = () => {
  return "Notification" in window;
};

export const requestPushPermission = async () => {
  if (!isPushSupported()) return false;
  
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const getPushPermissionStatus = () => {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
};

export const showPushNotification = (title, options = {}) => {
  if (!isPushSupported() || Notification.permission !== "granted") return null;
  
  const notification = new Notification(title, {
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: options.tag || "app-notification",
    renotify: true,
    ...options
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
    if (options.onClick) options.onClick();
  };
  
  return notification;
};

export const savePushPreference = (enabled) => {
  localStorage.setItem(PUSH_NOTIFICATIONS_KEY, enabled ? "true" : "false");
};

export const getPushPreference = () => {
  return localStorage.getItem(PUSH_NOTIFICATIONS_KEY) === "true";
};