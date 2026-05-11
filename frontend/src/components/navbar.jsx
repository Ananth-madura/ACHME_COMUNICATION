import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Search,
  Star,
  Clock,
  Bell,
  Settings,
  User,
  Lock,
  LogOut,
  X,
  AlertCircle,
  CheckCircle,
  Clock3,
  Users,
  CheckSquare
} from "lucide-react";
import "../Styles/tailwind.css";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../config/api";

const Topbar = ({ onHamburgerClick, showSearch, onSearch, reminderData, reminderNotes, escalationCount = 0, escalations = [] }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef(null);
  const [openBell, setOpenBell] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [openStar, setOpenStar] = useState(false);
  const [openLeadAlerts, setOpenLeadAlerts] = useState(false);
  const leadAlertRef = useRef(null);
  const settingsRef = useRef(null);
  const reminderRef = useRef(null);
  const starRef = useRef(null);
  const profileRef = useRef(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  const changeTheme = (theme) => {
    document.documentElement.classList.remove("theme-dark");
    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark");
    }
    setOpenSettings(false);
  };

  useEffect(() => {
    axios
      .get(`${API}/api/task/notifications`, { params: user?.id ? { user_id: user.id } : {} })
      .then(res => setNotifications(res.data))
      .catch(console.error);
  }, [user?.id]);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpenBell(false);
      if (reminderRef.current && !reminderRef.current.contains(e.target)) setOpenReminder(false);
      if (starRef.current && !starRef.current.contains(e.target)) setOpenStar(false);
      if (leadAlertRef.current && !leadAlertRef.current.contains(e.target)) setOpenLeadAlerts(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = async (notification) => {
    await axios.put(
      `${API}/api/task/notifications/${notification.id}/read`
    );
    setOpenBell(false);
    navigate(`/dashboard/task?taskId=${notification.task_id}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="flex items-center justify-between px-3 md:px-6 h-16 z-50 bg-shell text-shell-text">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="text-gray-600 p-2 lg:hidden cursor-pointer hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onHamburgerClick}
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
        <div className="text-yellow-600 font-extrabold text-lg md:text-2xl tracking-wide border-left">
          MADHURA SOFTWARES
        </div>
      </div>

      {/* Search bar - only on Dashboard */}
      {showSearch && (
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search dashboard..."
            className="bg-transparent outline-none text-sm w-32 md:w-48"
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>
      )}

      {/* Center icons */}
      <div className="menus-tab text-primary-text">
        <ul className="flex gap-2 md:gap-4 items-center">

          {/* Star → dropdown with Clients & Tasks */}
          <li ref={starRef} className="hidden md:block relative">
            <button
              aria-label="Quick Links"
              aria-expanded={openStar}
              onClick={() => setOpenStar(p => !p)}
              className="p-2 cursor-pointer hover:text-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
              <Star size={20} className={openStar ? "text-blue-500" : ""} />
            </button>
            {openStar && (
              <div className="absolute left-1/2 -translate-x-1/2 top-9 w-40 bg-white shadow-xl rounded-xl border z-50 overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase border-b">Quick Links</div>
                <button onClick={() => { navigate("/dashboard/clients"); setOpenStar(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2">
                  <Users size={16} /> Clients
                </button>
                <button onClick={() => { navigate("/dashboard/task"); setOpenStar(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2">
                  <CheckSquare size={16} /> Tasks
                </button>
              </div>
            )}
          </li>

          {/* Clock → Reminder Summary dropdown */}
          <li ref={reminderRef} className="hidden md:block relative">
            <button
              aria-label="Reminders"
              aria-expanded={openReminder}
              onClick={() => setOpenReminder(p => !p)}
              className="p-2 cursor-pointer hover:text-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
              <Clock size={20} className={openReminder ? "text-blue-500" : ""} />
            </button>
            {openReminder && (
              <div className="absolute left-1/2 -translate-x-1/2 top-10 w-80 bg-white shadow-xl rounded-xl border z-50 overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700 flex justify-between items-center">
                  <span>Reminder Summary</span>
                  <X size={14} className="cursor-pointer text-gray-400 hover:text-red-500 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500" onClick={() => setOpenReminder(false)} />
                </div>
                <div className="p-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "Today's", key: "Todays", icon: <Clock3 size={16} />, color: "bg-orange-50 border-orange-200 text-orange-600" },
                    { label: "Due", key: "Due", icon: <CheckCircle size={16} />, color: "bg-green-50 border-green-200 text-green-600" },
                    { label: "Overdue", key: "Overdue", icon: <AlertCircle size={16} />, color: "bg-red-50 border-red-200 text-red-600" },
                  ].map(({ label, key, icon, color }) => (
                    <div key={key} className={`rounded-lg border p-3 text-center ${color}`}>
                      <div className="flex justify-center mb-1">{icon}</div>
                      <div className="text-xl font-bold">{reminderData?.[key] ?? 0}</div>
                      <div className="text-xs font-medium mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {reminderNotes && (
                  <div className="px-4 pb-3 max-h-40 overflow-y-auto">
                    {["Todays", "Due", "Overdue"].map(key =>
                      (reminderNotes[key] || []).slice(0, 2).map((n, i) => (
                        <div key={`${key}-${i}`} className="text-xs text-gray-600 py-1.5 border-b last:border-0">
                          <span className={`font-semibold mr-1 ${key === "Overdue" ? "text-red-500" : key === "Due" ? "text-green-600" : "text-orange-500"}`}>[{key}]</span>
                          {n.reminder_notes}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </li>

          {/* Lead Alerts → Escalation notifications (Admin only) */}
          {user?.role === "admin" && (
          <li ref={leadAlertRef} className="relative">
            <button
              aria-label="Lead Alerts"
              aria-expanded={openLeadAlerts}
              onClick={() => setOpenLeadAlerts(p => !p)}
              className="p-2 cursor-pointer hover:text-red-500 transition focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg"
            >
              <AlertCircle
                size={20}
                className={escalationCount > 0 ? "text-red-500" : ""}
              />
            </button>
            {escalationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 rounded-full font-bold">
                {escalationCount}
              </span>
            )}
            {openLeadAlerts && (
              <div className="absolute right-0 top-10 w-96 bg-white shadow-xl rounded-xl border z-50 overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700 flex justify-between items-center bg-red-50">
                  <span className="flex items-center gap-2 text-red-700">
                    <AlertCircle size={15} /> Lead Escalation Alerts
                    {escalationCount > 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{escalationCount}</span>}
                  </span>
                  <X size={14} className="cursor-pointer text-gray-400 hover:text-red-500 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500" onClick={() => setOpenLeadAlerts(false)} />
                </div>
                {escalations.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400 text-center">No escalation alerts</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y">
                    {escalations.map(esc => (
                      <div key={esc.id} className={`px-4 py-3 hover:bg-red-50 transition ${esc.missed_count >= 3 ? "bg-red-50/50" : ""}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{esc.customer_name}</p>
                            <p className="text-xs text-gray-500">{esc.mobile_number} · {esc.staff_name || "Unassigned"}</p>
                            {esc.last_followup_date && (
                              <p className="text-xs text-gray-400 mt-0.5">Last follow-up: {new Date(esc.last_followup_date).toLocaleDateString("en-IN")}</p>
                            )}
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${esc.missed_count >= 3 ? "bg-red-600 text-white" : "bg-orange-100 text-orange-700"}`}>
                            {esc.missed_count} missed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
          )}

          {/* Bell → Task Notifications */}
          <li ref={bellRef} className="relative">
            <button
              aria-label="Task Notifications"
              aria-expanded={openBell}
              onClick={() => setOpenBell(!openBell)}
              className="p-2 cursor-pointer hover:text-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
              <Bell size={20} className="relative" />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 rounded-full">
                {unreadCount}
              </span>
            )}
            {openBell && (
              <div className="absolute right-0 md:left-[131px] top-10 w-72 bg-white shadow-lg rounded-lg border z-50 animate-slide-in-left">
                <div className="px-4 py-2 border-b font-semibold text-sm">
                  Task Notifications
                </div>
                {notifications.length === 0 && (
                  <p className="p-4 text-sm text-primary-text">No notifications</p>
                )}
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 cursor-pointer border-b ${n.is_read === 0 ? "bg-blue-50" : ""} hover:bg-gray-100`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-primary-text">{n.description}</p>
                  </div>
                ))}
              </div>
            )}
          </li>

          {/* Settings */}
          <li ref={settingsRef} className="relative">
            <button
              aria-label="Settings"
              aria-expanded={openSettings}
              onClick={() => { setOpenSettings(!openSettings); }}
              className="p-2 cursor-pointer hover:text-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
              <Settings size={20} />
            </button>
            {openSettings && (
              <div className="absolute top-10 right-0 w-52 bg-primary text-primary-text border shadow-lg rounded-md z-50 animate-slide-in-left">
                <div className="px-4 py-2 text-sm font-semibold border-b">Quick Settings</div>
                <div onClick={() => { navigate("/dashboard/settings"); setOpenSettings(false); }} className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-100">
                  <Settings size={16} />
                  All Settings
                </div>
                <div className="border-t my-1"></div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500">Appearance</div>
                <div onClick={() => changeTheme("default")} className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-100">
                  <div className="w-3 h-3 rounded-full border border-gray-300 bg-white"></div>
                  Light Mode
                </div>
                <div onClick={() => changeTheme("dark")} className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-100">
                  <div className="w-3 h-3 rounded-full bg-[#0f172a]"></div>
                  Dark Mode
                </div>
              </div>
            )}
          </li>

        </ul>
      </div>

      {/* User profile */}
      <div ref={profileRef} className="flex items-center gap-2 border-l pl-2 md:pl-4 relative">
        <div
          onClick={() => setOpenProfile(!openProfile)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <User size={18} />
          </div>
          <span className="hidden sm:block text-sm text-primary-text">
            {user?.name || "Customer"}
          </span>
        </div>

        {openProfile && (
          <div className="absolute right-[-20px] top-12 w-52 bg-white shadow-lg rounded-lg border z-50 animate-doorOpen">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-gray-800">{user?.name || "Customer"}</p>
              <p className="text-xs text-gray-500">{user?.email || "info@email.com"}</p>
            </div>
            <ul className="py-2 text-sm text-primary-text">
              <li onClick={() => { navigate("/dashboard/profile"); setOpenProfile(false); }} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <User size={16} /> My Profile
              </li>
              <li onClick={() => { navigate("/dashboard/profile"); setOpenProfile(false); }} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <Lock size={16} /> Change Password
              </li>
              <hr />
              <li
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut size={16} /> Logout
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
