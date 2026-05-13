import React, { useState,useEffect } from "react";
import"../Styles/tailwind.css";
import Followup from "../components/followupsummary";
import Remainder from "../components/remaindersummary";
import {
  departmentCount,
  bottomText,
  getToday,
  normalizeDate,
} from "../utils/leadutil";
import axios from "axios";
import{useAuth} from "../auth/AuthContext";
import socket from "../socket/socket";

import { API } from "../config/api";

const API_BACKEND = API;


const Dashboard = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [walkins, setWalkins] = useState([]);
    const [fields, setFields] = useState([]);
   
    const [activeTelecall, setActiveTelecall] = useState("New");
    const [activeWalkin, setActiveWalkin] = useState("New");
    const [activeField, setActiveField] = useState("New");
  
    const currentUserName = user?.name || user?.email?.split("@")[0] || "User";
  
  const today = getToday();

  /*  FETCH - Filter by current user */
  
   const fetchAll = async () => {
    try {
      const [t, w, f] = await Promise.all([
        axios.get(`${API_BACKEND}/api/Telecalls?user_id=${user?.id}&role=user&user_name=${encodeURIComponent(user?.name || "")}`),
        axios.get(`${API_BACKEND}/api/Walkins?user_id=${user?.id}&role=user&user_name=${encodeURIComponent(user?.name || "")}`),
        axios.get(`${API_BACKEND}/api/Fields?user_id=${user?.id}&role=user&user_name=${encodeURIComponent(user?.name || "")}`),
      ]);
      
      // Only show data assigned to or created by this user
      const userLeads = t.data;
      const userWalkins = w.data;
      const userFields = f.data;

      setLeads(userLeads);
      setWalkins(userWalkins);
      setFields(userFields);
    } catch (err) {
      console.error("Fetching error:", err);
      // Try via proxy
      try {
        const [t, w, f] = await Promise.all([
          axios.get(`/api/Telecalls?user_id=${user?.id}&role=user&user_name=${encodeURIComponent(user?.name || "")}`),
          axios.get(`/api/Walkins?user_id=${user?.id}&role=user&user_name=${encodeURIComponent(user?.name || "")}`),
          axios.get(`/api/Fields?user_id=${user?.id}&role=user&user_name=${encodeURIComponent(user?.name || "")}`),
        ]);
        setLeads(t.data);
        setWalkins(w.data);
        setFields(f.data);
      } catch (err2) {
        console.error("Fallback also failed:", err2);
      }
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto refresh from forms
  useEffect(() => {
    const refresh = () => fetchAll();
    window.addEventListener("refresh-dashboard", refresh);
    return () => window.removeEventListener("refresh-dashboard", refresh);
  }, []);

  useEffect(() => {
    const handleChange = () => fetchAll();
    socket.on("data_changed", handleChange);
    return () => socket.off("data_changed", handleChange);
  }, []);

  /* TODAY COUNTS */
  const todaysTelecallsData = leads.filter(l => normalizeDate(l.call_date) === today);
  const todaysWalkinsData = walkins.filter(w => normalizeDate(w.walkin_date) === today);
  const todaysFieldsData = fields.filter(f => normalizeDate(f.visit_date) === today);

  const telecallToday = departmentCount(todaysTelecallsData, "call_outcome");
  const walkinToday = departmentCount(todaysWalkinsData, "walkin_status");
  const fieldToday = departmentCount(todaysFieldsData, "field_outcome");

  const statusColors = {
    "New": { text: "text-orange-500", bg: "bg-orange-500" },
    "Converted": { text: "text-green-600", bg: "bg-green-600" },
    "Disqualified": { text: "text-red-600", bg: "bg-red-600" },
  };

  const followupNotes = {
    Todays: leads.filter(l => l.followup_required === "Yes" && normalizeDate(l.followup_date) === today && l.followup_notes),
    Due: leads.filter(l => l.followup_required === "Yes" && normalizeDate(l.followup_date) > today && l.followup_notes),
    Overdue: leads.filter(l => l.followup_required === "Yes" && normalizeDate(l.followup_date) < today && l.followup_notes),
  };

  const followupSummary = {
    Todays: followupNotes.Todays.length,
    Due: followupNotes.Due.length,
    Overdue: followupNotes.Overdue.length,
  };

  const remainderNotes = {
    Todays: leads.filter(l => l.reminder_required === "Yes" && normalizeDate(l.remainder_date) === today && l.remainder_notes),
    Due: leads.filter(l => l.reminder_required === "Yes" && normalizeDate(l.remainder_date) > today && l.remainder_notes),
    Overdue: leads.filter(l => l.reminder_required === "Yes" && normalizeDate(l.remainder_date) < today && l.remainder_notes),
  };

  const remainderSummary = {
    Todays: remainderNotes.Todays.length,
    Due: remainderNotes.Due.length,
    Overdue: remainderNotes.Overdue.length,
  };

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [taskActivity, setTaskActivity] = useState([]);

  useEffect(() => {
    axios.get("/api/task/dashboard/tasks").then(r => setTasks(r.data));
    axios.get("/api/task/activity").then(r => setTaskActivity(r.data));
  }, []);

  const userDisplayName = user?.name || currentUserName;


  return (
    <div className="w-full bg-surface p-4 lead-summary-main">

      <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Welcome back,{" "}
            <span className="text-primary">
              {userDisplayName}
            </span>{" "}
            👋
          </h1>
          <p className="text-slate mt-1">
            {user?.role === "admin" ? "Admin Dashboard" : "Your Personal Dashboard"}
          </p>
        </div>
        <div className="text-right text-sm text-muted">
          <p>Total Leads: {leads.length + walkins.length + fields.length}</p>
          <p>Today's: {leads.length}</p>
        </div>
      </div>
    </div>
        {/* telecalling  */}

        <div className="flex mt-10 gap-8 justify-center">
        <div className="w-[45%] card p-8 mr-10">

          <h2 className="text-center text-slate font-semibold text-lg mb-6">
            Tellecalling Summary
          </h2>

           {/*  */}

           <div className="flex justify-center gap-10">
          {["New", "Converted", "Disqualified"].map(status => (
            <div
              key={status}
              onClick={() => setActiveTelecall(status)}
              className="cursor-pointer text-center"
            >
              <span
                className={`reaminder-font ${
                  activeTelecall === status
                    ? statusColors[status].text
                    : "text-gray-700"
                }`}
              >
                {status}
              </span>

              <span className={`ml-2 text-white px-2 py-1 rounded-[50%]   w-10 h-5 text-xs  badge] 
               ${statusColors[status].bg
              }`}>
                {telecallToday[status]}
              </span>

              {activeTelecall === status && (
                <div className={`active-line mt-1 ${statusColors[status].bg}`}></div>
              )}
            </div>
          ))}
        </div>

          <div className="border-t w-full mt-6 mb-6"></div>

          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-brand-orange rounded-full"></div>
            <p className="text-slate font-medium text-[15px]">
                {bottomText(telecallToday[activeTelecall],activeTelecall)}
            </p>
          </div>
        </div>

        {/*  Walkin summary */}

       <div className="w-[50%] card p-8">

          <h2 className="text-center text-slate font-semibold text-lg mb-6">
            Walkin Summary
          </h2>

           {/*  */}

           <div className="flex justify-center gap-6">
          {["New", "Converted", "Disqualified"].map(status => (
            <div
              key={status}
              onClick={() => setActiveWalkin  (status)}
              className="cursor-pointer text-center"
            >
              <span
                className={`reaminder-font ${
                  activeWalkin === status
                    ? statusColors[status].text
                    : "text-gray-700"
                }`}
              >
                {status}
              </span>

              <span className={`ml-2 text-white px-2 py-1 rounded-[50%]   w-10 h-5 text-xs  badge] 
               ${statusColors[status].bg
              }`}>
                {walkinToday[status]}
              </span>

              {activeWalkin === status && (
                <div className={`active-line mt-1 ${statusColors[status].bg}`}></div>
              )}
            </div>
          ))}
        </div>

          <div className="border-t w-full mt-6 mb-6"></div>

<div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-brand-orange rounded-full"></div>
            <p className="text-slate font-medium text-[15px]">
                {bottomText(walkinToday[activeWalkin], activeWalkin)}
            </p>
          </div>
        </div>
      </div>



       {/* Field work summary */}


        <div className="justify-items-center mt-10 ">
          <div className="w-[50%] card p-8">

          <h2 className="text-center text-slate font-semibold text-lg mb-6">
            Fieldwork Summary
          </h2>

           {/*  */}

           <div className="flex justify-center gap-6">
          {["New", "Converted", "Disqualified"].map(status => (
            <div
              key={status}
              onClick={() => setActiveField  (status)}
              className="cursor-pointer text-center"
            >
              <span
                className={`reaminder-font ${
                  activeField  === status
                    ? statusColors[status].text
                    : "text-ink"
                }`}
              >
                {status}
              </span>

              <span className={`ml-2 text-white px-2 py-1 rounded-[50%]   w-10 h-5 text-xs  badge] 
               ${statusColors[status].bg
              }`}>
                {fieldToday[status]}
              </span>

              {activeField === status && (
                <div className={`active-line mt-1 ${statusColors[status].bg}`}></div>
              )}
            </div>
          ))}
        </div>

          <div className="border-t w-full mt-6 mb-6"></div>

<div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-brand-orange rounded-full"></div>
            <p className="text-slate font-medium text-[15px]">
                {bottomText(fieldToday[activeField], activeField)}
            </p>
          </div>
        </div>
        </div>

        {/*  */}
          <div className="grid grid-cols-2 gap-6 mt-10 w-full">
               <Remainder data={remainderSummary} notes={remainderSummary} />
               <Followup data={followupSummary} notes={followupNotes} />
           </div>

            {/* task activity */}

                  {/* TASK DASHBOARD  */}

       <div className="grid grid-cols-2 gap-6 mt-10">
 {/* RECENT TASKS – CARD STYLE */}
      <div className="card p-6 h-[420px] overflow-y-auto">
       <h3 className="text-[22px] font-medium text-ink mb-6">Recent Tasks</h3>

      {tasks.length === 0 ? (
      <p className="text-sm text-muted">No recent tasks</p>
      ) : (
       tasks.map(t => (
       <div
         key={t.id}
        className="flex items-start gap-4 mb-5 p-4 rounded-lg border border-hairline hover:shadow-level-1 transition">
        {/* Status Indicator */}
         <div
           className={`w-1.5 rounded-full ${
             t.project_status === "Completed"
               ? "bg-green-500"
               : t.project_status === "Process"
               ? "bg-blue-500"
               : "bg-orange-500"
          }`}></div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink mb-1">
            {t.task_title}
          </p>

          <p className="text-xs text-muted mb-2">
            Project: <span className="text-ink">{t.project_name}</span>
          </p>

          <div className="flex items-center gap-3 text-xs">
            {/* Priority */}
            <span
              className={`px-2 py-1 rounded-full font-medium ${
                t.project_priority === "High"
                  ? "bg-red-100 text-red-600"
                  : t.project_priority === "Urgent"
                  ? "bg-red-200 text-red-700"
                  : t.project_priority === "Low"
                  ? "bg-gray-200 text-gray-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {t.project_priority}
            </span>

            {/* Staff */}
            {t.staff_name && (
              <span className="text-gray-400">
                👤 {t.staff_name}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <span className="text-xs font-medium text-gray-500">
          {t.project_status}
        </span>
      </div>
    ))
  )}
</div>



{/* TASK ACTIVITY (IMAGE STYLE) */}

<div className="bg-white p-6 rounded-xl shadow h-[420px] overflow-y-auto">
  <h3 className="text-[22px] font-medium text-gray-700 mb-6">
    Latest Activity
  </h3>

  {taskActivity.length === 0 ? (
    <p className="text-sm text-gray-400">No recent activity</p>
  ) : (
    taskActivity.map(a => (
      <div key={a.id} className="flex gap-4 mb-6">

        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-7 h-7 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.33 0-8 2.17-8 4v2h16v-2c0-1.83-3.67-4-8-4z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">

          {/* User + Time */}
          <p className="text-sm text-gray-500 mb-1">
            <span className="text-blue-600 font-medium">
              Customer
            </span>{" "}
            {new Date(a.created_at).toLocaleString()}
          </p>

          {/* Message */}
          <p className="text-sm text-blue-600 mb-3">
            {a.message}
          </p>

          {/* Status Box */}
          {a.action && (
            <div className="bg-gray-100 rounded-md px-4 py-2 text-sm w-fit">
              <span className="font-semibold text-gray-600">
                Action:
              </span>{" "}
              <span className="text-gray-700">
                {a.action}
              </span>
            </div>
          )}
        </div>
      </div>
    ))
  )}
</div>
</div>
  </div>
  );
};

export default Dashboard;
