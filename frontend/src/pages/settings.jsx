import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sun, Moon, Monitor, Bell, BellOff, Lock, Shield, 
  Palette, Globe, Clock, Save, X, Check, RefreshCw 
} from "lucide-react";
import { isPushSupported, requestPushPermission, savePushPreference, getPushPreference } from "../utils/pushNotifications";

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    theme: "default",
    notifications: {
      email: true,
      push: true,
      taskReminders: true,
      leadAlerts: true,
      systemUpdates: false
    },
    language: "en",
    timezone: "Asia/Kolkata",
    compactMode: false,
    autoRefresh: true,
    refreshInterval: 30
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeSection, setActiveSection] = useState("appearance");

  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setSettings(prev => ({ ...prev, theme: savedTheme }));
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("userSettings", JSON.stringify(settings));
    localStorage.setItem("theme", settings.theme);
    applyTheme(settings.theme);
    setTimeout(() => {
      setSaving(false);
      setMessage({ type: "success", text: "Settings saved successfully" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }, 500);
  };

  const applyTheme = (theme) => {
    document.documentElement.classList.remove("theme-dark");
    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark");
    }
  };

  const handleThemeChange = (theme) => {
    setSettings({ ...settings, theme });
  };

  const toggleNotification = async (key) => {
    if (key === "push") {
      if (!isPushSupported()) {
        setMessage({ type: "error", text: "Push notifications not supported in this browser" });
        return;
      }
      const newValue = !settings.notifications.push;
      if (newValue) {
        const granted = await requestPushPermission();
        if (!granted) {
          setMessage({ type: "error", text: "Push notification permission denied" });
          return;
        }
      }
      savePushPreference(newValue);
    }
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: key === "push" ? (isPushSupported() && Notification.permission === "granted") : !settings.notifications[key] }
    });
  };

  const themes = [
    { id: "default", name: "Light", icon: Sun, color: "bg-white border-gray-300" },
    { id: "dark", name: "Dark", icon: Moon, color: "bg-gray-800 border-gray-600" }
  ];

  const sections = [
    { id: "appearance", name: "Appearance", icon: Palette },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Shield },
    { id: "preferences", name: "Preferences", icon: Globe }
  ];

  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "mr", name: "Marathi" }
  ];

  const timezones = [
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time" }
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message.type === "success" && <Check size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeSection === section.id 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <section.icon size={20} />
                <span className="font-medium">{section.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeSection === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Theme</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {themes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`p-4 rounded-xl border-2 transition ${
                          settings.theme === theme.id 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg ${theme.color} mx-auto mb-3 flex items-center justify-center`}>
                          <theme.icon size={24} className={theme.id === "dark" ? "text-white" : "text-gray-600"} />
                        </div>
                        <p className="font-medium text-gray-800">{theme.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {theme.id === "default" ? "Light background" : "Dark background"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Display</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-800">Compact Mode</p>
                        <p className="text-sm text-gray-500">Reduce spacing for more content</p>
                      </div>
                      <div 
                        onClick={() => setSettings({ ...settings, compactMode: !settings.compactMode })}
                        className={`w-12 h-6 rounded-full transition ${settings.compactMode ? "bg-blue-500" : "bg-gray-300"}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${settings.compactMode ? "translate-x-6" : "translate-x-0.5"} mt-0.5`}></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h3>
                  <div className="space-y-3">
                    {[
                      { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                      { key: "push", label: "Push Notifications", desc: "Browser push notifications" },
                      { key: "taskReminders", label: "Task Reminders", desc: "Reminders for upcoming tasks" },
                      { key: "leadAlerts", label: "Lead Alerts", desc: "Alerts for new leads and follow-ups" },
                      { key: "systemUpdates", label: "System Updates", desc: "News about system changes" }
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                        <div>
                          <p className="font-medium text-gray-800">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <div 
                          onClick={() => toggleNotification(item.key)}
                          className={`w-12 h-6 rounded-full transition ${settings.notifications[item.key] ? "bg-blue-500" : "bg-gray-300"}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${settings.notifications[item.key] ? "translate-x-6" : "translate-x-0.5"} mt-0.5`}></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Lock size={20} className="text-gray-500" />
                        <p className="font-medium text-gray-800">Password</p>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">Last changed: Never</p>
                      <button 
                        onClick={() => navigate("/dashboard/profile")}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        Change Password
                      </button>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield size={20} className="text-gray-500" />
                        <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">Add an extra layer of security</p>
                      <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">Not Available</span>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield size={20} className="text-gray-500" />
                        <p className="font-medium text-gray-800">Active Sessions</p>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">1 active session on this device</p>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">
                        Sign Out All Devices
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Regional Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select 
                        value={settings.language}
                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        {languages.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select 
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        {timezones.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Data & Refresh</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-800">Auto Refresh</p>
                        <p className="text-sm text-gray-500">Automatically refresh data</p>
                      </div>
                      <div 
                        onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                        className={`w-12 h-6 rounded-full transition ${settings.autoRefresh ? "bg-blue-500" : "bg-gray-300"}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${settings.autoRefresh ? "translate-x-6" : "translate-x-0.5"} mt-0.5`}></div>
                      </div>
                    </label>

                    {settings.autoRefresh && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval (seconds)</label>
                        <input 
                          type="number" 
                          min="10"
                          max="300"
                          value={settings.refreshInterval}
                          onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 30 })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;