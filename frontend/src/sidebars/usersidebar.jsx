import React, { useState } from "react";
import {
  Home,
  Users,
  ListTodo,
  Phone,
  FileText,
  Headphones,
  TargetIcon,
  Settings,
  User,
  ChevronDown,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  Bell
} from "lucide-react";
import "../Styles/tailwind.css"
import { Link } from "react-router-dom";


const UserSidebar = ({ onNavigate }) => {
  const [openMenu, setOpenMenu] = useState(null);

  const menu = [
    { icon: <Home size={20} />, title: "Dashboard", path: "/dashboard" },
    { icon: <Bell size={20} />, title: "Notifications", path: "/dashboard/notifications" },
    {
      icon: <Wrench size={20} />, title: "Services", subitems: [
        { label: "Products", path: "/dashboard/products" },
        { label: "Service Estimation", path: "/dashboard/serviceestimation" },
        { label: "Call Report", path: "/dashboard/call-report" }
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
      icon: <ShieldCheck size={20} />, title: "Contracts & AMC",
      subitems: [
        { label: "Contracts", path: "/dashboard/amc" },
      ]
    },
    {
      icon: <Users size={20} />, title: "Customers", subitems: [
        { label: "Clients", path: "/dashboard/clients" }
      ]
    },
    // { icon: <ListTodo size={20} />, title: "Tasks", path: "/dashboard/task" },
    { icon: <TargetIcon size={20} />, title: "Targets", path: "/dashboard/targets" },
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

export default UserSidebar;
