import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, XCircle, Clock, User, Edit, Lock, Bell, ShieldCheck, ChevronRight, ChevronLeft, Filter } from "lucide-react";
import { API } from "../config/api";

const formatDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "---";

const getFieldLabel = (field) => {
  const map = { first_name: "Name", email: "Email", mobile_number: "Mobile Number", emp_address: "Address", password: "Password" };
  return map[field] || field;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const StatusBadge = ({ status }) => {
  const styles = { active: "bg-[#d9f3e1] text-[#1aae39]", rejected: "bg-[#fde0ec] text-[#e03131]" };
  const labels = { active: "Approved", rejected: "Rejected" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-[#f0eeec] text-[#787671]"}`}>
      {labels[status] || "No user data"}
    </span>
  );
};

const ActionButtons = ({ onApprove, onReject }) => (
  <div className="flex gap-2 mt-3">
    <button onClick={onApprove} className="flex items-center gap-1.5 bg-[#1aae39] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">
      <CheckCircle size={13} /> Approve
    </button>
    <button onClick={onReject} className="flex items-center gap-1.5 bg-[#e03131] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">
      <XCircle size={13} /> Reject
    </button>
  </div>
);

const NotifCard = ({ n }) => (
  <div className={`rounded-xl border bg-white p-4 ${!n.is_read ? "border-[#d6b6f6]" : "border-[#e5e3df]"}`}>
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        n.status === "active" ? "bg-[#d9f3e1]" : n.status === "rejected" ? "bg-[#fde0ec]" : "bg-[#e6e0f5]"
      }`}>
        <User size={16} className={n.status === "active" ? "text-[#1aae39]" : n.status === "rejected" ? "text-[#e03131]" : "text-[#5645d4]"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>
            {n.first_name || n.type?.replaceAll("_", " ") || "Notification"}
          </p>
          {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#5645d4] flex-shrink-0" />}
        </div>
        {n.email && <p className="text-xs truncate" style={{ color: "#787671" }}>{n.email}</p>}
        {n.message && <p className="text-xs mt-1" style={{ color: "#5d5b54" }}>{n.message}</p>}
        {n.role && <p className="text-xs mt-0.5" style={{ color: "#5d5b54" }}>Role: <span className="font-semibold capitalize">{n.role}</span></p>}
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#a4a097" }}>
          <Clock size={10} /> {formatDate(n.created_at)}
        </p>
      </div>
      <div className="flex-shrink-0">{n.status !== "pending" && <StatusBadge status={n.status} />}</div>
    </div>
  </div>
);

// ── History filter helpers ────────────────────────────────────────────────────
const applyHistoryFilter = (items, filter, customFrom, customTo) => {
  if (filter === "all") return items;
  const now = new Date();
  return items.filter(item => {
    const d = new Date(item.created_at);
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "week") return (now - d) <= SEVEN_DAYS_MS;
    if (filter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      const to = customTo ? new Date(customTo + "T23:59:59") : null;
      return (!from || d >= from) && (!to || d <= to);
    }
    return true;
  });
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [histFilter, setHistFilter] = useState("all");
  const [histCustomFrom, setHistCustomFrom] = useState("");
  const [histCustomTo, setHistCustomTo] = useState("");

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/auth/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchChangeRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/auth/profile-change-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChangeRequests(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchNotifications(); fetchChangeRequests(); }, []);

  const handleAction = async (userId, action, notifId) => {
    if (!userId) { alert("User ID missing"); return; }
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API}/api/auth/approve/${userId}`, { action }, { headers });
      await axios.put(`${API}/api/notifications/admin/${notifId}/read`, {}, { headers });
      window.dispatchEvent(new Event("refresh-pending-count"));
      fetchNotifications();
    } catch (err) { alert(err.response?.data?.message || "Action failed"); }
  };

  const handleProfileChange = async (requestId, action) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/auth/handle-change-request/${requestId}`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.dispatchEvent(new Event("refresh-pending-count"));
      fetchChangeRequests();
    } catch (err) { alert(err.response?.data?.message || "Action failed"); }
  };

  const now = new Date();
  const recentNotifs = notifications.filter(n => (now - new Date(n.created_at)) <= SEVEN_DAYS_MS);
  const olderNotifs  = notifications.filter(n => (now - new Date(n.created_at)) >  SEVEN_DAYS_MS);
  const unread = recentNotifs.filter(n => n.is_read === 0).length;
  const pendingApprovals = recentNotifs.filter(n => n.status === "pending" && n.user_id);
  const totalApprovalNeeded = pendingApprovals.length + changeRequests.length;

  const filteredHistory = applyHistoryFilter(olderNotifs, histFilter, histCustomFrom, histCustomTo);

  // ── History view ────────────────────────────────────────────────────────────
  if (showHistory) {
    return (
      <div className="w-full p-4 md:p-6 min-h-screen" style={{ background: "#fafaf9" }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowHistory(false)} className="flex items-center gap-1 text-sm font-medium cursor-pointer" style={{ color: "#5645d4" }}>
            <ChevronLeft size={16} /> Back
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: "#1a1a1a", letterSpacing: "-0.5px" }}>Notification History</h2>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#e6e0f5", color: "#391c57" }}>{olderNotifs.length} older</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Filter size={14} style={{ color: "#787671" }} />
          {["all","today","week","month","custom"].map(f => (
            <button key={f} onClick={() => setHistFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
              style={histFilter === f
                ? { background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a" }
                : { background: "transparent", color: "#787671", border: "1px solid #e5e3df" }}>
              {f === "all" ? "All" : f === "today" ? "Today" : f === "week" ? "This Week" : f === "month" ? "This Month" : "Custom"}
            </button>
          ))}
          {histFilter === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={histCustomFrom} onChange={e => setHistCustomFrom(e.target.value)}
                className="border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: "#c8c4be" }} />
              <span className="text-xs" style={{ color: "#787671" }}>to</span>
              <input type="date" value={histCustomTo} onChange={e => setHistCustomTo(e.target.value)}
                className="border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: "#c8c4be" }} />
            </div>
          )}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="rounded-xl border border-[#e5e3df] bg-white p-10 text-center" style={{ color: "#a4a097" }}>
            No notifications for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map(n => <NotifCard key={n.id} n={n} />)}
          </div>
        )}
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full p-4 md:p-6 min-h-screen" style={{ background: "#fafaf9" }}>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: "#1a1a1a", letterSpacing: "-0.5px" }}>Notifications</h2>
        {unread > 0 && (
          <span className="bg-[#5645d4] text-white text-xs font-semibold px-2.5 py-1 rounded-full">{unread} unread</span>
        )}
        <span className="text-xs ml-1" style={{ color: "#a4a097" }}>Last 7 days</span>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "#a4a097" }}>Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* LEFT — Recent Notifications */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Bell size={16} style={{ color: "#5645d4" }} />
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#5d5b54", letterSpacing: "1px" }}>
                  Recent
                </h3>
                <span className="ml-auto text-xs" style={{ color: "#a4a097" }}>{recentNotifs.length} this week</span>
              </div>

              {recentNotifs.length === 0 ? (
                <div className="rounded-xl border border-[#e5e3df] bg-white p-8 text-center" style={{ color: "#a4a097" }}>
                  No notifications in the last 7 days.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNotifs.map(n => <NotifCard key={n.id} n={n} />)}
                </div>
              )}
            </section>

            {/* RIGHT — Approvals Needed */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={16} style={{ color: "#dd5b00" }} />
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#5d5b54", letterSpacing: "1px" }}>
                  Approvals Needed
                </h3>
                {totalApprovalNeeded > 0 && (
                  <span className="ml-auto bg-[#dd5b00] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {totalApprovalNeeded}
                  </span>
                )}
              </div>

              {totalApprovalNeeded === 0 ? (
                <div className="rounded-xl border border-[#e5e3df] bg-white p-8 text-center" style={{ color: "#a4a097" }}>
                  <CheckCircle size={32} className="mx-auto mb-2 text-[#1aae39]" />
                  All caught up.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map(n => (
                    <div key={n.id} className="rounded-xl border border-[#ffe8d4] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#ffe8d4] flex items-center justify-center flex-shrink-0">
                          <User size={16} className="text-[#dd5b00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{n.first_name || "New User"}</p>
                          {n.email && <p className="text-xs" style={{ color: "#787671" }}>{n.email}</p>}
                          {n.role && <p className="text-xs mt-0.5" style={{ color: "#5d5b54" }}>Role: <span className="font-semibold capitalize">{n.role}</span></p>}
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#a4a097" }}><Clock size={10} /> {formatDate(n.created_at)}</p>
                          <ActionButtons onApprove={() => handleAction(n.user_id, "active", n.id)} onReject={() => handleAction(n.user_id, "rejected", n.id)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {changeRequests.map(cr => (
                    <div key={cr.id} className="rounded-xl border border-[#e6e0f5] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#e6e0f5] flex items-center justify-center flex-shrink-0">
                          {cr.field === "password" ? <Lock size={16} className="text-[#5645d4]" /> : <Edit size={16} className="text-[#5645d4]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{cr.first_name} <span className="font-normal text-xs" style={{ color: "#787671" }}>({cr.email})</span></p>
                          <p className="text-xs mt-0.5" style={{ color: "#5d5b54" }}>
                            Change: <span className="font-semibold">{getFieldLabel(cr.field)}</span>
                            {cr.field !== "password" && <span className="ml-1 text-[#1aae39]">→ {cr.new_value}</span>}
                          </p>
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#a4a097" }}><Clock size={10} /> {formatDate(cr.created_at)}</p>
                          <ActionButtons onApprove={() => handleProfileChange(cr.id, "approved")} onReject={() => handleProfileChange(cr.id, "declined")} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Notification History collapsed row */}
          {olderNotifs.length > 0 && (
            <button onClick={() => setShowHistory(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl border cursor-pointer transition-colors"
              style={{ background: "#f6f5f4", borderColor: "#e5e3df" }}>
              <div className="flex items-center gap-3">
                <Clock size={16} style={{ color: "#787671" }} />
                <span className="text-sm font-medium" style={{ color: "#37352f" }}>Notification History</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e5e3df", color: "#5d5b54" }}>
                  {olderNotifs.length} older notifications
                </span>
              </div>
              <ChevronRight size={16} style={{ color: "#787671" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
