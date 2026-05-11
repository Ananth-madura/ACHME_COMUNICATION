import React, { useState, useEffect } from "react";
import "../Styles/tailwind.css";
import Followup from "../components/followupsummary";
import Remainder from "../components/remaindersummary";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  departmentCount,
  bottomText,
  getToday,
  normalizeDate,
  isThisMonth,
} from "../utils/leadutil";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { DashboardSearchContext, ReminderContext } from "../layout/dashboarlayout";
import socket from "../socket/socket";

import { API } from "../config/api";

const API_BACKEND = API;

const Dashboard = () => {
  const searchQuery = useContext(DashboardSearchContext) || "";
  const { setReminderData, setReminderNotes } = useContext(ReminderContext);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [walkins, setWalkins] = useState([]);
  const [fields, setFields] = useState([]);
  const [team, setTeam] = useState([]);
  const [performaInvoices, setPerformaInvoices] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [showEscalations, setShowEscalations] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [activeTab1, setActiveTab1] = useState("New");
  const [selectedUser, setSelectedUser] = useState("all");
  const [activeTelecall, setActiveTelecall] = useState("New");
  const [activeWalkin, setActiveWalkin] = useState("New");
  const [activeField, setActiveField] = useState("New");

  const today = getToday();

  /* ================= FETCH ================= */
  const fetchAll = async () => {
    try {
      const [t, w, f, tm, pi, pending, esc] = await Promise.all([
        axios.get(`${API_BACKEND}/api/Telecalls`),
        axios.get(`${API_BACKEND}/api/Walkins`),
        axios.get(`${API_BACKEND}/api/Fields`),
        axios.get(`${API_BACKEND}/api/teammember`),
        axios.get(`${API_BACKEND}/api/performainvoice`),
        axios.get(`${API_BACKEND}/api/auth/pending-users`),
        axios.get(`${API_BACKEND}/api/leads/escalations`)
      ]);
      setLeads(t.data);
      setWalkins(w.data);
      setFields(f.data);
      setTeam(tm.data);
      setPerformaInvoices(pi.data);
      setPendingRegistrations(pending.data);
      setEscalations(esc.data);
      
      // Check missed reminders
      try {
        await axios.post(`${API_BACKEND}/api/leads/check-missed`);
      } catch (_) {}
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      // Try via proxy
      try {
        const [t, w, f, tm, pi, pending, esc] = await Promise.all([
          axios.get("/api/Telecalls"),
          axios.get("/api/Walkins"),
          axios.get("/api/Fields"),
          axios.get("/api/teammember"),
          axios.get("/api/performainvoice"),
          axios.get("/api/auth/pending-users"),
          axios.get("/api/leads/escalations")
        ]);
        setLeads(t.data);
        setWalkins(w.data);
        setFields(f.data);
        setTeam(tm.data);
        setPerformaInvoices(pi.data);
        setPendingRegistrations(pending.data);
        setEscalations(esc.data);
      } catch (err2) {
        console.error("Fallback also failed:", err2);
      }
    }
  };

  useEffect(() => { fetchAll(); }, []);

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

  /* GET UNIQUE STAFF NAMES FOR FILTER */
  const uniqueStaff = [...new Set([
    ...leads.map(l => l.staff_name).filter(Boolean),
    ...walkins.map(w => w.staff_name).filter(Boolean),
    ...fields.map(f => f.staff_name).filter(Boolean),
    ...team.map(t => t.emp_name || t.first_name).filter(Boolean)
  ])];

  /* TODAY COUNTS - Filter by selected user */
  const userFilteredLeads = selectedUser === "all" ? leads : leads.filter(l => (l.staff_name || l.created_by || "").toLowerCase().includes(selectedUser.toLowerCase()));
  const userFilteredWalkins = selectedUser === "all" ? walkins : walkins.filter(w => (w.staff_name || w.created_by || "").toLowerCase().includes(selectedUser.toLowerCase()));
  const userFilteredFields = selectedUser === "all" ? fields : fields.filter(f => (f.staff_name || f.created_by || "").toLowerCase().includes(selectedUser.toLowerCase()));

  const todaysTelecallsData = userFilteredLeads.filter(l => normalizeDate(l.call_date) === today);
  const todaysWalkinsData = userFilteredWalkins.filter(w => normalizeDate(w.walkin_date) === today);
  const todaysFieldsData = userFilteredFields.filter(f => normalizeDate(f.visit_date) === today);

  const telecallToday = departmentCount(todaysTelecallsData, "call_outcome");
  const walkinToday = departmentCount(todaysWalkinsData, "walkin_status");
  const fieldToday = departmentCount(todaysFieldsData, "field_outcome");

  /* MONTHLY OVERALL */
  const telecallMonth = departmentCount(leads.filter(l => isThisMonth(l.call_date)), "call_outcome");
  const walkinMonth = departmentCount(walkins.filter(w => isThisMonth(w.walkin_date)), "walkin_status");
  const fieldMonth = departmentCount(fields.filter(f => isThisMonth(f.visit_date)), "field_outcome");

  const overallMonthly = {
    New: telecallMonth.New + walkinMonth.New + fieldMonth.New,
    Converted: telecallMonth.Converted + walkinMonth.Converted + fieldMonth.Converted,
    Disqualified: telecallMonth.Disqualified + walkinMonth.Disqualified + fieldMonth.Disqualified,
  };

  const leadTabs = [
    { label: "New", count: overallMonthly.New, color: "bg-orange-500" },
    { label: "Converted", count: overallMonthly.Converted, color: "bg-green-600" },
    { label: "Disqualified", count: overallMonthly.Disqualified, color: "bg-red-600" },
  ];

  /* FOLLOWUP / REMINDER */
  const followupNotes = {
    Todays: leads.filter(l => l.followup_required === "Yes" && normalizeDate(l.followup_date) === today && l.followup_notes),
    Due: leads.filter(l => l.followup_required === "Yes" && normalizeDate(l.followup_date) > today && l.followup_notes),
    Overdue: leads.filter(l => l.followup_required === "Yes" && normalizeDate(l.followup_date) < today && l.followup_notes),
  };
  const followupSummary = { Todays: followupNotes.Todays.length, Due: followupNotes.Due.length, Overdue: followupNotes.Overdue.length };

  const remainderNotes = {
    Todays: leads.filter(l => l.reminder_required === "Yes" && normalizeDate(l.reminder_date) === today && l.reminder_notes),
    Due: leads.filter(l => l.reminder_required === "Yes" && normalizeDate(l.reminder_date) > today && l.reminder_notes),
    Overdue: leads.filter(l => l.reminder_required === "Yes" && normalizeDate(l.reminder_date) < today && l.reminder_notes),
  };
  const remainderSummary = { Todays: remainderNotes.Todays.length, Due: remainderNotes.Due.length, Overdue: remainderNotes.Overdue.length };

  // Push reminder data to navbar
  useEffect(() => {
    setReminderData(remainderSummary);
    setReminderNotes(remainderNotes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  const statusColors = {
    New: { text: "text-orange-500", bg: "bg-orange-500" },
    Converted: { text: "text-green-600", bg: "bg-green-600" },
    Disqualified: { text: "text-red-600", bg: "bg-red-600" },
  };

  /* ===== REAL METRIC CALCULATIONS ===== */
  // Total Sales: sum of today's performa invoice grand_total
  const todaysSales = performaInvoices
    .filter(p => normalizeDate(p.invoice_date) === today)
    .reduce((sum, p) => sum + (Number(p.grand_total) || 0), 0);

  // Yesterday's sales for comparison
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();
  const yesterdaySales = performaInvoices
    .filter(p => normalizeDate(p.invoice_date) === yesterday)
    .reduce((sum, p) => sum + (Number(p.grand_total) || 0), 0);

  const salesChange = yesterdaySales > 0
    ? (((todaysSales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)
    : 0;

  // Visitors: total walkins today
  const visitorsToday = todaysWalkinsData.length;
  const visitorsYesterday = walkins.filter(w => normalizeDate(w.walkin_date) === yesterday).length;
  const visitorsChange = visitorsYesterday > 0
    ? (((visitorsToday - visitorsYesterday) / visitorsYesterday) * 100).toFixed(1)
    : 0;

  // Total Calls: telecalls today
  const callsToday = todaysTelecallsData.length;
  const callsYesterday = leads.filter(l => normalizeDate(l.call_date) === yesterday).length;
  const callsChange = callsYesterday > 0
    ? (((callsToday - callsYesterday) / callsYesterday) * 100).toFixed(1)
    : 0;

  // Field Work: field visits today
  const fieldToday2 = todaysFieldsData.length;
  const fieldYesterday = fields.filter(f => normalizeDate(f.visit_date) === yesterday).length;
  const fieldChange = fieldYesterday > 0
    ? (((fieldToday2 - fieldYesterday) / fieldYesterday) * 100).toFixed(1)
    : 0;

  // Revenue: monthly performa invoice totals by month for chart
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const revenueByMonth = monthNames.map((month, idx) => {
    const profit = performaInvoices
      .filter(p => {
        const d = new Date(p.invoice_date);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      })
      .reduce((sum, p) => sum + (Number(p.grand_total) || 0), 0);
    return { month, profit, loss: Math.round(profit * 0.75) };
  });

  // Monthly revenue (current month)
  const monthlyRevenue = performaInvoices
    .filter(p => isThisMonth(p.invoice_date))
    .reduce((sum, p) => sum + (Number(p.grand_total) || 0), 0);

  /* ===== SEARCH / FILTER CARDS ===== */
  const q = searchQuery.toLowerCase().trim();
  const cardDefs = [
    { key: "lead-summary", label: "Lead Summary" },
    { key: "telecalling-summary", label: "Telecalling Summary" },
    { key: "walkin-summary", label: "Walkin Summary" },
    { key: "fieldwork-summary", label: "Fieldwork Summary" },
    { key: "remainder-summary", label: "Remainder Summary" },
    { key: "followup-summary", label: "Followup Summary" },
    { key: "total-sales", label: "Total Sales" },
    { key: "visitors", label: "Visitors" },
    { key: "total-calls", label: "Total Calls" },
    { key: "field-work", label: "Field Work" },
    { key: "revenue", label: "Revenue" },
    { key: "team-summary", label: "Team Member Quotation Summary" },
  ];

  const matchCard = (key) => {
    if (!q) return false;
    const def = cardDefs.find(c => c.key === key);
    return def ? def.label.toLowerCase().includes(q) : false;
  };

  const anyMatch = q && cardDefs.some(c => c.label.toLowerCase().includes(q));
  const highlight = (key) => anyMatch && matchCard(key) ? "ring-2 ring-blue-400 ring-offset-2" : "";
  const dimmed = (key) => anyMatch && !matchCard(key) ? "opacity-30 pointer-events-none" : "";

  const Card = ({ title, value, percent, sub, positive, cardKey, onClick }) => (
    <div
      className={`card stat-card h-[180px] transition-all ${highlight(cardKey)} ${dimmed(cardKey)}`}
    >
      <p className="text-sm text-slate">{title}</p>
      <h2 className="text-2xl font-semibold mt-2 text-ink">{value}</h2>
      <p className={`text-sm mt-1 ${positive ? "text-success" : "text-error"}`}>
        {percent} <span className="text-ink">{sub}</span>
      </p>
      <button
        className="text-sm mt-4 flex items-center gap-1 text-primary hover:underline"
        onClick={onClick}
      >
        View Report →
      </button>
    </div>
  );

  return (
    <div className="w-full p-4 md:p-8 lead-summary-main bg-surface">
      {/* Welcome */}
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-ink">
              Welcome back, <span className="text-primary">{user?.name || "Admin"}</span> 👋
            </h1>
            <p className="text-slate mt-1">
              Admin Dashboard - Manage your team and leads
            </p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>Total Team: {team.length}</p>
            <p>Active Leads: {leads.length + walkins.length + fields.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Registration Notifications */}
      {pendingRegistrations.length > 0 && (
        <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-hairline-strong card-tint-peach p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
              ⏳ Pending User Approvals
              <span className="badge badge-orange">{pendingRegistrations.length}</span>
            </h2>
            <button
              onClick={() => navigate("/dashboard/notifications")}
              className="text-xs text-brand-orange font-bold hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {pendingRegistrations.slice(0, 3).map(reg => (
              <div key={reg.id} className="flex items-center justify-between bg-canvas rounded-lg p-3 border border-hairline-soft">
                <div>
                  <p className="font-medium text-ink">{reg.first_name} <span className="text-muted text-sm">({reg.email})</span></p>
                  <p className="text-xs text-muted">Requested: {new Date(reg.created_at).toLocaleDateString("en-IN")}</p>
                </div>
                <span className="badge-tag-orange">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* LEAD SUMMARY CARD */}
      <div className={`max-w-4xl mx-auto p-6 md:p-8 rounded-xl card transition-all ${highlight("lead-summary")} ${dimmed("lead-summary")}`}>
        <h2 className="text-center font-semibold text-lg mb-6 text-ink">
          Lead Summary {selectedUser !== "all" && <span className="text-primary">- {selectedUser}</span>}
        </h2>
        <div className="flex justify-center gap-8 md:gap-14">
          {leadTabs.map((item) => (
            <div key={item.label} className="cursor-pointer text-center" onClick={() => setActiveTab1(item.label)}>
              <span className={`reaminder-font ${activeTab1 === item.label ? "text-orange-500" : ""}`}>{item.label}</span>
              <span className={`ml-2 text-white px-2 py-[2px] text-sm rounded-full ${item.color}`}>{item.count}</span>
              {activeTab1 === item.label && <div className="active-line"></div>}
            </div>
          ))}
        </div>
        <div className="border-t w-full mt-6 mb-6"></div>
        <div className="flex justify-center items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <p className="font-medium text-[15px]">{bottomText(overallMonthly[activeTab1], activeTab1)}</p>
        </div>
      </div>

      {/* Telecalling + Walkin */}
      <div className="flex flex-col md:flex-row mt-10 gap-8 justify-center">
        <div className={`w-full md:w-[45%] bg-shell text-shell-text p-8 rounded-xl shadow-lg transition-all ${highlight("telecalling-summary")} ${dimmed("telecalling-summary")}`}>
          <h2 className="text-center font-semibold text-lg mb-6">Tellecalling Summary</h2>
          <div className="flex justify-center gap-6 md:gap-10">
            {["New", "Converted", "Disqualified"].map(status => (
              <div key={status} onClick={() => setActiveTelecall(status)} className="cursor-pointer text-center">
                <span className={`reaminder-font ${activeTelecall === status ? statusColors[status].text : ""}`}>{status}</span>
                <span className={`ml-2 text-white px-2 py-1 rounded-[50%] w-10 h-5 text-xs ${statusColors[status].bg}`}>{telecallToday[status]}</span>
                {activeTelecall === status && <div className={`active-line mt-1 ${statusColors[status].bg}`}></div>}
              </div>
            ))}
          </div>
          <div className="border-t w-full mt-6 mb-6"></div>
          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <p className="font-medium text-[15px]">{bottomText(telecallToday[activeTelecall], activeTelecall)}</p>
          </div>
        </div>

        <div className={`w-full md:w-[50%] p-8 rounded-xl bg-shell text-shell-text shadow-lg transition-all ${highlight("walkin-summary")} ${dimmed("walkin-summary")}`}>
          <h2 className="text-center font-semibold text-lg mb-6">Walkin Summary</h2>
          <div className="flex justify-center gap-4 md:gap-6">
            {["New", "Converted", "Disqualified"].map(status => (
              <div key={status} onClick={() => setActiveWalkin(status)} className="cursor-pointer text-center">
                <span className={`reaminder-font ${activeWalkin === status ? statusColors[status].text : ""}`}>{status}</span>
                <span className={`ml-2 text-white px-2 py-1 rounded-[50%] w-10 h-5 text-xs ${statusColors[status].bg}`}>{walkinToday[status]}</span>
                {activeWalkin === status && <div className={`active-line mt-1 ${statusColors[status].bg}`}></div>}
              </div>
            ))}
          </div>
          <div className="border-t w-full mt-6 mb-6"></div>
          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <p className="font-medium text-[15px]">{bottomText(walkinToday[activeWalkin], activeWalkin)}</p>
          </div>
        </div>
      </div>

      {/* Fieldwork Summary */}
      <div className="flex justify-center mt-10">
        <div className={`w-full md:w-[50%] p-8 bg-shell text-shell-text rounded-xl shadow-lg transition-all ${highlight("fieldwork-summary")} ${dimmed("fieldwork-summary")}`}>
          <h2 className="text-center font-semibold text-lg mb-6">Fieldwork Summary</h2>
          <div className="flex justify-center gap-4 md:gap-6">
            {["New", "Converted", "Disqualified"].map(status => (
              <div key={status} onClick={() => setActiveField(status)} className="cursor-pointer text-center">
                <span className={`reaminder-font ${activeField === status ? statusColors[status].text : ""}`}>{status}</span>
                <span className={`ml-2 text-white px-2 py-1 rounded-[50%] w-10 h-5 text-xs ${statusColors[status].bg}`}>{fieldToday[status]}</span>
                {activeField === status && <div className={`active-line mt-1 ${statusColors[status].bg}`}></div>}
              </div>
            ))}
          </div>
          <div className="border-t w-full mt-6 mb-6"></div>
          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <p className="font-medium text-[15px]">{bottomText(fieldToday[activeField], activeField)}</p>
          </div>
        </div>
      </div>

      {/* Remainder + Followup */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 w-full`}>
        <div className={`transition-all ${highlight("remainder-summary")} ${dimmed("remainder-summary")} rounded-xl`}>
          <Remainder data={remainderSummary} notes={remainderNotes} />
        </div>
        <div className={`transition-all ${highlight("followup-summary")} ${dimmed("followup-summary")} rounded-xl`}>
          <Followup data={followupSummary} notes={followupNotes} />
        </div>
      </div>

      {/* Metric Cards + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-9 mt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <Card
            cardKey="total-sales"
            title="Total Sales"
            value={`₹${todaysSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            percent={`${salesChange >= 0 ? "↑" : "↓"} ${Math.abs(salesChange)}%`}
            sub={`${todaysSales >= yesterdaySales ? "+" : ""}₹${(todaysSales - yesterdaySales).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today`}
            positive={salesChange >= 0}
            onClick={() => navigate("/dashboard/performainvoice")}
          />
          <Card
            cardKey="visitors"
            title="Visitors"
            value={visitorsToday.toLocaleString()}
            percent={`${visitorsChange >= 0 ? "↑" : "↓"} ${Math.abs(visitorsChange)}%`}
            sub={`${visitorsToday - visitorsYesterday >= 0 ? "+" : ""}${visitorsToday - visitorsYesterday} today`}
            positive={visitorsChange >= 0}
            onClick={() => navigate("/dashboard/walkins")}
          />
          <Card
            cardKey="total-calls"
            title="Total Calls"
            value={callsToday.toLocaleString()}
            percent={`${callsChange >= 0 ? "↑" : "↓"} ${Math.abs(callsChange)}%`}
            sub={`${callsToday - callsYesterday >= 0 ? "+" : ""}${callsToday - callsYesterday} today`}
            positive={callsChange >= 0}
            onClick={() => navigate("/dashboard/telecalling")}
          />
          <Card
            cardKey="field-work"
            title="Field Work"
            value={fieldToday2.toLocaleString()}
            percent={`${fieldChange >= 0 ? "↑" : "↓"} ${Math.abs(fieldChange)}%`}
            sub={`${fieldToday2 - fieldYesterday >= 0 ? "+" : ""}${fieldToday2 - fieldYesterday} today`}
            positive={fieldChange >= 0}
            onClick={() => navigate("/dashboard/field")}
          />
        </div>

        {/* Revenue Chart */}
        <div className={`mt-0 lg:mt-20 transition-all ${highlight("revenue")} ${dimmed("revenue")}`}>
          <div className="rounded-xl p-6 bg-shell text-shell-text shadow-lg w-full h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Revenue</h2>
                <p className="text-2xl font-bold">
                  ₹{monthlyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-green-400 text-sm ml-2">↑ Monthly</span>
                </p>
              </div>
              <select className="bg-orange-500 text-white px-3 py-2 rounded-md outline-none">
                <option>Month</option>
              </select>
            </div>
            <div className="flex gap-4 mb-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Profit
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span> Loss
              </span>
            </div>
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth}>
                  <XAxis dataKey="month" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip />
                  <Bar dataKey="profit" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="loss" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className={`mt-10 mb-10 transition-all ${highlight("team-summary")} ${dimmed("team-summary")}`}>
          <div className="rounded-xl p-6 bg-shell text-shell-text shadow-lg w-full min-h-[380px] overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-center border-b pb-2 uppercase tracking-wider">Team Member Quotation Summary</h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 bg-[#2d3748] z-10">
                  <tr className="text-xs uppercase text-gray-400 font-bold border-b border-gray-700">
                    <th className="p-3">Team Member Name</th>
                    <th className="p-3">Quotation Count</th>
                  </tr>
                </thead>
                <tbody>
                  {team.length === 0 ? (
                    <tr><td colSpan="2" className="py-10 text-gray-500 italic">No team data available</td></tr>
                  ) : (
                    team.map((t, idx) => (
                      <tr key={idx} className="border-b border-gray-700 hover:bg-white/5 transition">
                        <td className="p-4 font-medium">{t.first_name} {t.last_name}</td>
                        <td className="p-4">
                          <span className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold ring-1 ring-blue-500/30">
                            {t.quotation_count || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    {/* ── Escalation Notifications Panel (Admin Only) ─────────────────── */}
    {escalations.length > 0 && (
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50/40 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-red-700 flex items-center gap-2">
            ⚠ Escalation Alerts
            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{escalations.length}</span>
          </h2>
          <button onClick={() => setShowEscalations(p => !p)} className="text-xs text-red-600 font-bold hover:underline">
            {showEscalations ? "Hide" : "Show All"}
          </button>
        </div>
        {showEscalations && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs font-bold text-red-600 uppercase border-b border-red-200">
                  <th className="px-3 py-2 text-left">Lead Name</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2">Last Follow-up</th>
                  <th className="px-3 py-2">Missed</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {escalations.map(esc => (
                  <tr key={esc.id} className="border-b border-red-100 hover:bg-red-50">
                    <td className="px-3 py-2 font-semibold text-gray-800">{esc.customer_name}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{esc.mobile_number}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{esc.staff_name || "---"}</td>
                    <td className="px-3 py-2 text-center text-gray-500 text-xs">{esc.last_followup_date ? new Date(esc.last_followup_date).toLocaleDateString("en-IN") : "---"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{esc.missed_count}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={async () => {
                          await axios.put(`/api/leads/escalations/${esc.id}/resolve`);
                          setEscalations(prev => prev.filter(x => x.id !== esc.id));
                        }}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-bold"
                      >Resolve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}
    </div>
  );
};

export default Dashboard;
