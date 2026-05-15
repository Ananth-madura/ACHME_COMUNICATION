import React, { useState, useEffect } from "react";
import {
  Home, Users, ListTodo, Phone, ShoppingCart,
  FileText, Briefcase, Headphones, Users2, BarChart2, ChevronDown, Wrench, Bell, TargetIcon, ShieldCheck, Settings, User, UserCog
} from "lucide-react";
import "../Styles/tailwind.css";
import { Link } from "react-router-dom";
import axios from "axios";
import { NotificationBell } from "../components/NotificationBell";
import { API_PROXY_URL } from "../config/api";


const Sidebar = ({ onNavigate }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_PROXY_URL}/api/auth/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const unreadCount = res.data.filter(n => n.is_read === 0).length;
        setPendingCount(unreadCount);
      } catch (_) { }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    window.addEventListener("refresh-pending-count", fetchPending);
    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-pending-count", fetchPending);
    };
  }, []);

  const menu = [
    { icon: <Home size={20} />, title: "Dashboard", path: "/dashboard" },
    { icon: <Bell size={20} />, title: "Notifications", path: "/dashboard/notifications", badge: pendingCount },
    { icon: <TargetIcon size={20} />, title: "Team Targets", path: "/dashboard/targets" },
    // { icon: <UserCog size={20} />, title: "User Management", path: "/dashboard/users" },
    { icon: <Users size={20} />, title: "Customers", subitems: [{ label: "Clients", path: "/dashboard/clients" }] },
    { icon: <ListTodo size={20} />, title: "Tasks", path: "/dashboard/task" },
    {
      icon: <ShieldCheck size={20} />, title: "Contracts & AMC",
      subitems: [
        { label: "Contracts", path: "/dashboard/amc" },
      ]
    },
    {
      icon: <Phone size={20} />, title: "Leads",
      subitems: [
        { label: "Telecalling", path: "/dashboard/telecalling" },
        { label: "Walkins", path: "/dashboard/walkins" },
        { label: "Field Work", path: "/dashboard/field" },
      ]
    },
    {
      icon: <ShoppingCart size={20} />, title: "Sales", subitems: [
        { label: "Estimation", path: "/dashboard/estimateinvoice" },
        { label: "Proforma Invoice", path: "/dashboard/performainvoice" },
      ]
    },
    { icon: <FileText size={20} />, title: "Proposals", path: "/dashboard/proposal" },
    {
      icon: <Wrench size={20} />,
      title: "Services",
      subitems: [
        { label: "Products", path: "/dashboard/products" },
        { label: "Service Estimation", path: "/dashboard/serviceestimation" },
        { label: "Call Report", path: "/dashboard/call-report" },
      ]
    },
    {
      icon: <Users2 size={20} />, title: "Team Management", subitems: [
        { label: "Team Members", path: "/dashboard/team" },
      ]
    },
    { icon: <BarChart2 size={20} />, title: "Reports", path: "/dashboard/reports" },
    { icon: <User size={20} />, title: "Profile", path: "/dashboard/profile" },
    { icon: <Settings size={20} />, title: "Settings", path: "/dashboard/settings" }
  ];

  const toggleMenu = (i) => setOpenMenu(openMenu === i ? null : i);

  return (
    <aside className="side-mainbar bg-canvas">
      <ul className="space-y-1">
        {menu.map((item, i) => (
          <li key={i}>

            {/* MAIN ITEM → With direct path (Dashboard) */}
            {item.path ? (
              <Link
                to={item.path}
                onClick={onNavigate}
                className="sidebar-item"
              >
                <div className="flex items-center gap-3 text-ink">
                  {item.icon}
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                {item.badge > 0 && (
                  <span className="badge badge-orange">
                    {item.badge}
                  </span>
                )}
              </Link>
            ) : (
              <>
                {/* MAIN ITEM → With sub menu (Projects, Sales, etc.) */}
                <button
                  onClick={() => toggleMenu(i)}
                  className="w-full flex items-center justify-between px-3 py-2 text-ink hover:text-primary"
                >
                  <div className="flex items-center gap-3 text-ink">
                    {item.icon}
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>

                  {item.subitems && (
                    <ChevronDown
                      size={18}
                      className={`${openMenu === i ? "rotate-180" : ""} transition text-slate`}
                    />
                  )}
                </button>

                {/* SUBMENU */}
                {openMenu === i && item.subitems && (
                  <ul className="ml-9 mt-1 space-y-1">
                    {item.subitems.map((s, j) => (
                      <li key={j}>
                        <Link
                          to={s.path}
                          onClick={onNavigate}
                          className="text-sm text-slate hover:text-primary block submenu"
                        >
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

          </li>
        ))}
      </ul>
    </aside>

  );
};

export default Sidebar;
