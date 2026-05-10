import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useState, createContext, useContext, useEffect } from "react";
import axios from "axios";

import Topbar from "../components/navbar";
import AdminSidebar from "../sidebars/adminsidebar";
import UserSidebar from "../sidebars/usersidebar";

export const DashboardSearchContext = createContext("");
export const ReminderContext = createContext({ setReminderData: () => {}, setReminderNotes: () => {} });

export default function DashboardLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reminderData, setReminderData] = useState(null);
  const [reminderNotes, setReminderNotes] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const location = useLocation();

  // Fetch escalations for navbar badge — must be before any conditional return
  useEffect(() => {
    const fetchEscalations = async () => {
      try {
        await axios.post("http://localhost:3000/api/leads/check-missed");
        const res = await axios.get("http://localhost:3000/api/leads/escalations");
        setEscalations(res.data);
      } catch (_) {}
    };
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return <Navigate to="/login" />;

  const isDashboard = location.pathname === "/dashboard" || location.pathname === "/dashboard/";

  return (
    <DashboardSearchContext.Provider value={searchQuery}>
    <ReminderContext.Provider value={{ setReminderData, setReminderNotes }}>
      {/* TOPBAR */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Topbar
          onHamburgerClick={() => setSidebarOpen(prev => !prev)}
          showSearch={isDashboard}
          onSearch={setSearchQuery}
          reminderData={reminderData}
          reminderNotes={reminderNotes}
          escalationCount={escalations.length}
          escalations={escalations}
        />
      </div>

      <div className="flex">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed left-0 top-[65px] h-[calc(100vh-65px)] bg-shell text-shell-text z-40 transition-transform duration-300
            w-[250px]
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:translate-x-0`}
        >
          {user.role === "admin" ? (
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
          ) : (
            <UserSidebar onNavigate={() => setSidebarOpen(false)} />
          )}
        </div>

        {/* CENTER CONTENT */}
        <div className="lg:ml-[250px] mt-[65px] w-full p-4 lg:p-6 min-h-screen text-shell-text bg-content flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <div className="mt-6 text-right text-sm font-bold text-blue-600 uppercase tracking-wider">
            Created by Madhura Technology
          </div>
        </div>
      </div>
    </ReminderContext.Provider>
    </DashboardSearchContext.Provider>
  );
}
