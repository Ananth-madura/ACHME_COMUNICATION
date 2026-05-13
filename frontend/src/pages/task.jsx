import React, { useState, useEffect } from "react";
import { Search, Plus, X, Target as TargetIcon, Calendar, Clock, CheckCircle, User, RefreshCw, ChevronLeft, Filter } from "lucide-react";
import "../Styles/tailwind.css";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import socket from "../socket/socket";
import { API } from "../config/api";

// ─── Design tokens (Notion) ───────────────────────────────────────────────────
const N = {
  primary: "#5645d4",
  primaryPressed: "#4534b3",
  orange: "#dd5b00",
  green: "#1aae39",
  error: "#e03131",
  ink: "#1a1a1a",
  charcoal: "#37352f",
  slate: "#5d5b54",
  steel: "#787671",
  stone: "#a4a097",
  hairline: "#e5e3df",
  hairlineStrong: "#c8c4be",
  surface: "#f6f5f4",
  surfaceSoft: "#fafaf9",
  canvas: "#ffffff",
  lavender: "#e6e0f5",
  mint: "#d9f3e1",
  peach: "#ffe8d4",
  sky: "#dcecfa",
  rose: "#fde0ec",
  yellow: "#fef7d6",
};

// ─── Tiny shared components ───────────────────────────────────────────────────
const PillTab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 cursor-pointer"
    style={active
      ? { background: N.ink, color: "#fff", border: `1px solid ${N.ink}` }
      : { background: "transparent", color: N.steel, border: `1px solid ${N.hairline}` }}
  >
    {children}
  </button>
);

const StatusBadge = ({ status }) => {
  const map = {
    New:       { bg: N.peach,    color: N.orange },
    Process:   { bg: N.sky,      color: "#0075de" },
    Completed: { bg: N.mint,     color: N.green },
    Expired:   { bg: N.rose,     color: N.error },
  };
  const s = map[status] || { bg: N.surface, color: N.steel };
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

const PriorityDot = ({ priority }) => {
  const c = { High: N.error, Medium: N.orange, Low: N.green }[priority] || N.steel;
  return <span className="text-xs font-semibold" style={{ color: c }}>{priority || "Medium"}</span>;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Date filter helpers ──────────────────────────────────────────────────────
const applyDateFilter = (items, dateField, filter, customFrom, customTo) => {
  if (filter === "all") return items;
  const now = new Date();
  return items.filter(item => {
    const d = new Date(item[dateField]);
    if (filter === "day")    return d.toDateString() === now.toDateString();
    if (filter === "month")  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      const to   = customTo   ? new Date(customTo + "T23:59:59") : null;
      return (!from || d >= from) && (!to || d <= to);
    }
    return true;
  });
};

const DateFilterBar = ({ filter, setFilter, customFrom, setCustomFrom, customTo, setCustomTo }) => (
  <div className="flex flex-wrap items-center gap-2">
    {["all", "day", "month", "custom"].map(f => (
      <PillTab key={f} active={filter === f} onClick={() => setFilter(f)}>
        {f === "all" ? "All" : f === "day" ? "Today" : f === "month" ? "This Month" : "Custom"}
      </PillTab>
    ))}
    {filter === "custom" && (
      <div className="flex items-center gap-2 ml-2">
        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
          className="border rounded-lg px-2 py-1 text-sm" style={{ borderColor: N.hairlineStrong }} />
        <span className="text-sm" style={{ color: N.steel }}>to</span>
        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
          className="border rounded-lg px-2 py-1 text-sm" style={{ borderColor: N.hairlineStrong }} />
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Task = () => {
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const [tasks, setTasks]             = useState([]);
  const [taskTargets, setTaskTargets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTab, setActiveTab]     = useState("tasks");
  const [lastUpdate, setLastUpdate]   = useState(null);

  // Task form / modals
  const [open, setOpen]                     = useState(false);
  const [selectedTask, setSelectedTask]     = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus]           = useState("");

  // Target form / modal
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({ user_name: "", yearly_target: "", user_id: "", teammember_id: "" });

  // Active tasks filters
  const [searchTerm, setSearchTerm]       = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  // History drill-in state (tasks)
  const [historyEmployee, setHistoryEmployee] = useState(null); // null = list view
  const [histFilter, setHistFilter]           = useState("all");
  const [histCustomFrom, setHistCustomFrom]   = useState("");
  const [histCustomTo, setHistCustomTo]       = useState("");

  // Target history drill-in state
  const [targetHistEmployee, setTargetHistEmployee] = useState(null);
  const [tHistFilter, setTHistFilter]               = useState("all");
  const [tHistCustomFrom, setTHistCustomFrom]       = useState("");
  const [tHistCustomTo, setTHistCustomTo]           = useState("");

  const [form, setForm] = useState({
    project_name: "", task_title: "", client_name: "", staff_name: "",
    assigned_to: "", assigned_teammember_id: "",
    created_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    project_status: "New", project_priority: "Medium",
  });

  const resetForm = () => {
    setForm({ project_name: "", task_title: "", client_name: "", staff_name: "", assigned_to: "", assigned_teammember_id: "",
      created_date: new Date().toISOString().slice(0, 10), due_date: new Date().toISOString().slice(0, 10),
      project_status: "New", project_priority: "Medium" });
    setSelectedTask(null);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const token = localStorage.getItem("token");
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const userName = user?.name || user?.email?.split("@")[0] || "";
      const teamProm = axios.get(`${API}/api/teammember`).catch(() => ({ data: [] }));

      if (isAdmin) {
        const [tasksRes, targetsRes, teamRes] = await Promise.all([
          axios.get(`${API}/api/task`, cfg),
          axios.get(`${API}/api/task/targets`, cfg),
          teamProm,
        ]);
        setTasks(tasksRes.data || []);
        setTaskTargets(targetsRes.data || []);
        setTeamMembers(teamRes.data || []);
      } else {
        const [tasksRes, targetsRes, teamRes] = await Promise.all([
          axios.get(`${API}/api/task`, cfg),
          axios.get(`${API}/api/task/targets/my?user_name=${encodeURIComponent(userName)}`, cfg).catch(() => ({ data: { hasTarget: false } })),
          teamProm,
        ]);
        setTasks(tasksRes.data || []);
        setTaskTargets(targetsRes.data?.hasTarget ? [targetsRes.data] : []);
        setTeamMembers(teamRes.data || []);
      }
      setLastUpdate(new Date());
    } catch (err) { console.error("Fetch error:", err); }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { fetchAll(); refreshNotifications(); };
    socket.on("task_updated", refresh); socket.on("new_task", refresh);
    socket.on("target_updated", refresh); socket.on("new_target", refresh);
    return () => {
      socket.off("task_updated", refresh); socket.off("new_task", refresh);
      socket.off("target_updated", refresh); socket.off("new_target", refresh);
    };
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const myTasks = isEmployee
    ? tasks.filter(t => {
        const me = (user?.name || user?.email?.split("@")[0] || "").toLowerCase();
        return t.staff_name?.toLowerCase().includes(me) || t.assigned_to?.toLowerCase().includes(me);
      })
    : tasks;

  // Active = pending (New or Process), not completed/expired
  const activeTasks = myTasks.filter(t => t.project_status === "New" || t.project_status === "Process");

  // History = completed or expired
  const historyTasks = myTasks.filter(t => t.project_status === "Completed" || t.project_status === "Expired");

  // Unique employees who have history tasks (for admin drill-in list)
  const historyEmployees = isAdmin
    ? [...new Map(historyTasks.map(t => [t.staff_name || t.assigned_to, t])).values()]
        .map(t => t.staff_name || t.assigned_to).filter(Boolean)
    : [];

  // Tasks for selected employee in history drill-in
  const drillTasks = historyEmployee
    ? applyDateFilter(
        historyTasks.filter(t => (t.staff_name || t.assigned_to) === historyEmployee),
        "due_date", histFilter, histCustomFrom, histCustomTo
      )
    : [];

  // Filtered active tasks
  const filteredActive = activeTasks.filter(t => {
    const matchSearch = !searchTerm ||
      t.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.task_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.staff_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEmp = !isAdmin || employeeFilter === "all" ||
      (t.staff_name || t.assigned_to)?.toLowerCase().includes(employeeFilter.toLowerCase());
    return matchSearch && matchEmp;
  });

  // Target history drill-in
  const targetHistoryEmployees = isAdmin
    ? taskTargets.map(t => t.user_name).filter(Boolean)
    : [];

  const drillTargetHistory = targetHistEmployee
    ? applyDateFilter(
        (taskTargets.find(t => t.user_name === targetHistEmployee)?.history || []),
        "date", tHistFilter, tHistCustomFrom, tHistCustomTo
      )
    : [];

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const cfg = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const data = {
        project_name: form.project_name,
        task_title: form.task_title,
        client_name: form.client_name,
        staff_name: form.assigned_to || user?.name,
        assigned_to: form.assigned_to,
        assigned_teammember_id: form.assigned_teammember_id || null,
        created_date: form.created_date,
        due_date: form.due_date,
        project_status: form.project_status,
        project_priority: form.project_priority,
      };
      if (selectedTask) {
        await axios.put(`${API}/api/task/${selectedTask.id}`, data, cfg);
        socket?.emit("task_updated", { taskId: selectedTask.id });
      } else {
        await axios.post(`${API}/api/task`, data, cfg);
        socket?.emit("new_task", { assignedTo: form.assigned_to });
      }
      fetchAll(); setOpen(false); resetForm(); refreshNotifications();
    } catch (err) { alert(err.response?.data?.message || "Failed to save task"); }
  };

const updateStatus = async (taskId, status) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${API}/api/task/${taskId}`, { project_status: status }, { headers: { Authorization: `Bearer ${token}` } });
      if (status === "Completed") {
        socket?.emit("task_completed", { taskId, status });
        socket?.emit("new_notification", { type: "task_completed", data: { taskId, status }, is_read: 0, timestamp: new Date().toISOString() });
      }
      socket?.emit("task_updated", { taskId, status });
      fetchAll(); setStatusModalOpen(false); refreshNotifications();
    } catch (err) { console.error(err); }
  };

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    if (!targetForm.user_id && !targetForm.user_name) return alert("Please select employee");
    if (!targetForm.yearly_target) return alert("Please enter target amount");
    const token = localStorage.getItem("token");
    try {
      let name = targetForm.user_name;
      if (targetForm.user_id && !name) {
        const m = teamMembers.find(m => m.user_id == targetForm.user_id || m.id == targetForm.user_id);
        name = `${m?.first_name} ${m?.last_name || ""}`.trim();
      }
await axios.post(`${API}/api/task/targets`, {
        user_id: targetForm.user_id, user_name: targetForm.user_name,
        teammember_id: targetForm.teammember_id,
        yearly_target: parseFloat(targetForm.yearly_target), created_by_admin: true
      }, { headers: { Authorization: `Bearer ${token}` } });
      socket?.emit("new_target", { userName: name });
      setTargetModalOpen(false);
      setTargetForm({ user_name: "", yearly_target: "", user_id: "", teammember_id: "" });
      fetchAll(); refreshNotifications();
    } catch (err) { alert(err.response?.data?.error || "Failed to save target"); }
  };

  const handleAchievementUpdate = async (amount, description) => {
    const token = localStorage.getItem("token");
    const userName = user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    try {
      await axios.post(`${API}/api/task/targets/update`, {
        user_id: user.id, user_name: userName, amount, description
      }, { headers: { Authorization: `Bearer ${token}` } });
      socket?.emit("target_updated", { userId: user.id });
      fetchAll(); refreshNotifications();
    } catch (err) { alert(err.response?.data?.error || "Failed to update achievement"); }
  };


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full p-4 md:p-6 min-h-screen" style={{ background: N.surfaceSoft }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: N.ink, letterSpacing: "-0.5px" }}>Task & Target</h2>
        <span className="text-sm" style={{ color: N.stone }}>Dashboard › Task & Target</span>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[["tasks","Active Tasks"],["history","Task History"],["targets","Targets"],["targetHistory","Target History"]].map(([key, label]) => (
          <PillTab key={key} active={activeTab === key} onClick={() => setActiveTab(key)}>{label}</PillTab>
        ))}
        {lastUpdate && (
          <span className="ml-auto text-xs flex items-center gap-1 self-center" style={{ color: N.stone }}>
            <RefreshCw size={11} /> {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── ACTIVE TASKS ─────────────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: N.canvas, borderColor: N.hairline }}>
              <Search size={15} style={{ color: N.stone }} />
              <input className="outline-none text-sm bg-transparent" style={{ color: N.ink }}
                placeholder="Search tasks…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            {isAdmin && (
              <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white" style={{ borderColor: N.hairline, color: N.ink }}>
                <option value="all">All Employees</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={`${m.first_name} ${m.last_name || ""}`.trim()}>
                    {m.first_name} {m.last_name || ""}
                  </option>
                ))}
              </select>
            )}
            {isAdmin && (
              <button onClick={() => { resetForm(); setOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{ background: N.primary }}>
                <Plus size={15} /> Assign Task
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "New",       count: activeTasks.filter(t => t.project_status === "New").length,     bg: N.peach,    color: N.orange },
              { label: "In Process",count: activeTasks.filter(t => t.project_status === "Process").length, bg: N.sky,      color: "#0075de" },
              { label: "Completed", count: historyTasks.filter(t => t.project_status === "Completed").length, bg: N.mint,  color: N.green },
              { label: "Total",     count: myTasks.length,                                                  bg: N.lavender, color: N.primary },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border" style={{ background: s.bg, borderColor: "transparent" }}>
                <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.count}</p>
              </div>
            ))}
          </div>

          {/* Tasks table */}
          <div className="rounded-xl border overflow-hidden" style={{ background: N.canvas, borderColor: N.hairline }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: N.surface }}>
                  <tr>
                    {["Task", "Assigned To", "Due Date", "Priority", "Status", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: N.steel }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.map(task => (
                    <tr key={task.id} className="border-t" style={{ borderColor: N.hairline }}>
                      <td className="px-4 py-3">
                        <div className="font-medium" style={{ color: N.ink }}>{task.project_name}</div>
                        {task.task_title && <div className="text-xs mt-0.5" style={{ color: N.steel }}>{task.task_title}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: N.lavender }}>
                            <User size={13} style={{ color: N.primary }} />
                          </div>
                          <span style={{ color: N.charcoal }}>{task.staff_name || task.assigned_to || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs" style={{ color: N.steel }}>
                          <Calendar size={12} /> {fmtDate(task.due_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3"><PriorityDot priority={task.project_priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={task.project_status} /></td>
                      <td className="px-4 py-3">
                        {isEmployee ? (
                          <div className="flex gap-1">
                            {task.project_status === "New" && (
                              <button onClick={() => updateStatus(task.id, "Process")}
                                className="px-2 py-1 rounded text-xs font-medium cursor-pointer"
                                style={{ background: N.mint, color: N.green }}>Accept</button>
                            )}
                            {task.project_status === "Process" && (
                              <button onClick={() => updateStatus(task.id, "Completed")}
                                className="px-2 py-1 rounded text-xs font-medium cursor-pointer"
                                style={{ background: N.lavender, color: N.primary }}>Done</button>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => { setSelectedTask(task); setNewStatus(task.project_status); setStatusModalOpen(true); }}
                            className="text-xs font-medium cursor-pointer" style={{ color: N.primary }}>Update</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredActive.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-sm" style={{ color: N.stone }}>No active tasks</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TASK HISTORY ─────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Admin: employee list → drill-in */}
          {isAdmin && !historyEmployee && (
            <>
              <p className="text-sm" style={{ color: N.slate }}>Click an employee to view their task history.</p>
              <div className="rounded-xl border overflow-hidden" style={{ background: N.canvas, borderColor: N.hairline }}>
                <table className="w-full text-sm">
                  <thead style={{ background: N.surface }}>
                    <tr>
                      {["Employee", "Completed", "Expired", "Total History"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: N.steel }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyEmployees.map(emp => {
                      const empTasks = historyTasks.filter(t => (t.staff_name || t.assigned_to) === emp);
                      return (
                        <tr key={emp} className="border-t cursor-pointer hover:bg-[#f6f5f4] transition-colors"
                          style={{ borderColor: N.hairline }}
                          onClick={() => { setHistoryEmployee(emp); setHistFilter("all"); }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: N.lavender }}>
                                <User size={14} style={{ color: N.primary }} />
                              </div>
                              <span className="font-medium" style={{ color: N.ink }}>{emp}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span style={{ color: N.green }}>{empTasks.filter(t => t.project_status === "Completed").length}</span></td>
                          <td className="px-4 py-3"><span style={{ color: N.error }}>{empTasks.filter(t => t.project_status === "Expired").length}</span></td>
                          <td className="px-4 py-3 font-medium" style={{ color: N.ink }}>{empTasks.length}</td>
                        </tr>
                      );
                    })}
                    {historyEmployees.length === 0 && (
                      <tr><td colSpan={4} className="py-10 text-center text-sm" style={{ color: N.stone }}>No history yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Admin: drill-in view for selected employee */}
          {isAdmin && historyEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setHistoryEmployee(null)}
                  className="flex items-center gap-1 text-sm font-medium cursor-pointer" style={{ color: N.primary }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <h3 className="text-base font-semibold" style={{ color: N.ink }}>{historyEmployee} — Task History</h3>
              </div>
              <DateFilterBar filter={histFilter} setFilter={setHistFilter}
                customFrom={histCustomFrom} setCustomFrom={setHistCustomFrom}
                customTo={histCustomTo} setCustomTo={setHistCustomTo} />
              <HistoryTable tasks={drillTasks} />
            </div>
          )}

          {/* Employee: own history with filters */}
          {isEmployee && (
            <div className="space-y-4">
              <DateFilterBar filter={histFilter} setFilter={setHistFilter}
                customFrom={histCustomFrom} setCustomFrom={setHistCustomFrom}
                customTo={histCustomTo} setCustomTo={setHistCustomTo} />
              <HistoryTable tasks={applyDateFilter(historyTasks, "due_date", histFilter, histCustomFrom, histCustomTo)} />
            </div>
          )}
        </div>
      )}


      {/* ── TARGETS ──────────────────────────────────────────────────────── */}
      {activeTab === "targets" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: N.slate }}>{taskTargets.length} employee{taskTargets.length !== 1 ? "s" : ""} with targets</span>
              <button onClick={() => setTargetModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{ background: N.primary }}>
                <TargetIcon size={15} /> Add Target
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-xl border overflow-hidden" style={{ background: N.canvas, borderColor: N.hairline }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: N.surface }}>
                    <tr>
                      {["Employee","Yearly Target","Monthly Target","Carry Forward","Effective","Achieved","Balance","Progress"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: N.steel }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
{taskTargets.map(target => {
                      const monthly = target.monthly_target || 0;
                      const achieved = target.achieved_amount || 0;
                      const carry = target.carry_forward || 0;
                      const effective = monthly + carry;
                      const balance = Math.max(0, effective - achieved);
                      const pct = effective > 0 ? Math.round((achieved / effective) * 100) : 0;
                      return (
                        <tr key={target.id} className="border-t" style={{ borderColor: N.hairline }}>
                          <td className="px-4 py-3 font-medium" style={{ color: N.ink }}>{target.user_name}</td>
                          <td className="px-4 py-3" style={{ color: N.charcoal }}>₹{Number(target.yearly_target || 0).toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.charcoal }}>₹{monthly.toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.orange }}>₹{carry.toLocaleString()}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: "#0075de" }}>₹{effective.toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.green }}>₹{achieved.toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.error }}>₹{balance.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-full h-2" style={{ background: N.hairline }}>
                                <div className="h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? N.green : pct >= 50 ? N.orange : N.error }} />
                              </div>
                              <span className="text-xs font-medium" style={{ color: N.slate }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {taskTargets.length === 0 && (
                      <tr><td colSpan={8} className="py-10 text-center text-sm" style={{ color: N.stone }}>No targets set yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isEmployee && (
            <EmployeeTargetCard user={user} onUpdateAchievement={handleAchievementUpdate} />
          )}
        </div>
      )}

      {/* ── TARGET HISTORY ───────────────────────────────────────────────── */}
      {activeTab === "targetHistory" && (
        <div className="space-y-4">
          {isAdmin && !targetHistEmployee && (
            <>
              <p className="text-sm" style={{ color: N.slate }}>Click an employee to view their target history.</p>
              <div className="rounded-xl border overflow-hidden" style={{ background: N.canvas, borderColor: N.hairline }}>
                <table className="w-full text-sm">
                  <thead style={{ background: N.surface }}>
                    <tr>
                      {["Employee","Yearly Target","Achieved","Balance","Progress"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: N.steel }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {taskTargets.map(target => {
                      const achieved = target.achieved_amount || 0;
                      const yearly = target.yearly_target || 0;
                      const balance = Math.max(0, yearly - achieved);
                      const pct = yearly > 0 ? Math.round((achieved / yearly) * 100) : 0;
                      return (
                        <tr key={target.id} className="border-t cursor-pointer hover:bg-[#f6f5f4] transition-colors"
                          style={{ borderColor: N.hairline }}
                          onClick={() => { setTargetHistEmployee(target.user_name); setTHistFilter("all"); }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: N.mint }}>
                                <User size={14} style={{ color: N.green }} />
                              </div>
                              <span className="font-medium" style={{ color: N.ink }}>{target.user_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: N.charcoal }}>₹{Number(yearly).toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.green }}>₹{Number(achieved).toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.error }}>₹{Number(balance).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-full h-2" style={{ background: N.hairline }}>
                                <div className="h-2 rounded-full" style={{ width: `${Math.min(pct,100)}%`, background: pct >= 100 ? N.green : pct >= 50 ? N.orange : N.error }} />
                              </div>
                              <span className="text-xs font-medium" style={{ color: N.slate }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {taskTargets.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-sm" style={{ color: N.stone }}>No target data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {isAdmin && targetHistEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setTargetHistEmployee(null)}
                  className="flex items-center gap-1 text-sm font-medium cursor-pointer" style={{ color: N.primary }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <h3 className="text-base font-semibold" style={{ color: N.ink }}>{targetHistEmployee} — Target History</h3>
              </div>
              <DateFilterBar filter={tHistFilter} setFilter={setTHistFilter}
                customFrom={tHistCustomFrom} setCustomFrom={setTHistCustomFrom}
                customTo={tHistCustomTo} setCustomTo={setTHistCustomTo} />
              {drillTargetHistory.length > 0 ? (
                <div className="rounded-xl border overflow-hidden" style={{ background: N.canvas, borderColor: N.hairline }}>
                  <table className="w-full text-sm">
                    <thead style={{ background: N.surface }}>
                      <tr>
                        {["Date","Amount","Description"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: N.steel }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drillTargetHistory.map((h, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: N.hairline }}>
                          <td className="px-4 py-3" style={{ color: N.slate }}>{fmtDate(h.date)}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: N.green }}>₹{Number(h.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.charcoal }}>{h.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border py-10 text-center text-sm" style={{ borderColor: N.hairline, color: N.stone }}>
                  No history entries for this filter.
                </div>
              )}
            </div>
          )}

          {isEmployee && (
            <div className="space-y-4">
              <DateFilterBar filter={tHistFilter} setFilter={setTHistFilter}
                customFrom={tHistCustomFrom} setCustomFrom={setTHistCustomFrom}
                customTo={tHistCustomTo} setCustomTo={setTHistCustomTo} />
              {(taskTargets[0]?.history || []).length > 0 ? (
                <div className="rounded-xl border overflow-hidden" style={{ background: N.canvas, borderColor: N.hairline }}>
                  <table className="w-full text-sm">
                    <thead style={{ background: N.surface }}>
                      <tr>
                        {["Date","Amount","Description"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: N.steel }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {applyDateFilter(taskTargets[0]?.history || [], "date", tHistFilter, tHistCustomFrom, tHistCustomTo).map((h, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: N.hairline }}>
                          <td className="px-4 py-3" style={{ color: N.slate }}>{fmtDate(h.date)}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: N.green }}>₹{Number(h.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3" style={{ color: N.charcoal }}>{h.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border py-10 text-center text-sm" style={{ borderColor: N.hairline, color: N.stone }}>No target history yet.</div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ── TASK ASSIGN MODAL ────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: N.canvas }}>
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: N.hairline }}>
              <h3 className="text-base font-semibold" style={{ color: N.ink }}>{selectedTask ? "Update Task" : "Assign New Task"}</h3>
              <button onClick={() => { setOpen(false); resetForm(); }} className="cursor-pointer" style={{ color: N.steel }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {[["project_name","Project Name *","text",true],["task_title","Task Title","text",false]].map(([name,label,type,req]) => (
                <div key={name}>
                  <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>{label}</label>
                  <input type={type} name={name} value={form[name]} onChange={e => setForm({...form,[e.target.name]:e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: N.hairlineStrong, color: N.ink }} required={req} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>Assign To</label>
                  <select name="assigned_to" value={form.assigned_teammember_id || ""} onChange={e => {
                    const m = teamMembers.find(t => String(t.id) === e.target.value);
                    setForm({...form, assigned_teammember_id: m ? Number(m.id) : "", assigned_to: m ? `${m.first_name} ${m.last_name||""}`.trim() : e.target.value });
                  }}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none" style={{ borderColor: N.hairlineStrong }}>
                    <option value="">— Select Staff —</option>
                    {teamMembers.map(t => (
                      <option key={t.id} value={String(t.id)}>
                        {t.first_name} {t.last_name||""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>Priority</label>
                  <select name="project_priority" value={form.project_priority} onChange={e => setForm({...form,project_priority:e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none" style={{ borderColor: N.hairlineStrong }}>
                    {["Low","Medium","High"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["created_date","Created Date"],["due_date","Due Date"]].map(([name,label]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>{label}</label>
                    <input type="date" name={name} value={form[name]} onChange={e => setForm({...form,[e.target.name]:e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: N.hairlineStrong }} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>Status</label>
                <select name="project_status" value={form.project_status} onChange={e => setForm({...form,project_status:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none" style={{ borderColor: N.hairlineStrong }}>
                  {["New","Process","Completed"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: N.primary }}>
                  {selectedTask ? "Update" : "Assign"}
                </button>
                <button type="button" onClick={() => { setOpen(false); resetForm(); }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: N.surface, color: N.slate }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STATUS MODAL ─────────────────────────────────────────────────── */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="rounded-xl shadow-xl w-full max-w-sm" style={{ background: N.canvas }}>
            <div className="p-4 border-b" style={{ borderColor: N.hairline }}>
              <h3 className="text-base font-semibold" style={{ color: N.ink }}>Update Task Status</h3>
            </div>
            <div className="p-4 space-y-2">
              {["New","Process","Completed"].map(status => (
                <button key={status} onClick={() => updateStatus(selectedTask.id, status)}
                  disabled={isEmployee && status === "New"}
                  className="w-full p-3 rounded-lg text-left text-sm font-medium border cursor-pointer transition-colors"
                  style={{
                    borderColor: newStatus === status ? N.primary : N.hairline,
                    background: newStatus === status ? N.lavender : N.canvas,
                    color: isEmployee && status === "New" ? N.stone : N.ink,
                    cursor: isEmployee && status === "New" ? "not-allowed" : "pointer"
                  }}>
                  <StatusBadge status={status} /> {isEmployee && status === "New" ? " (not allowed)" : ""}
                </button>
              ))}
            </div>
            <div className="p-4 border-t" style={{ borderColor: N.hairline }}>
              <button onClick={() => setStatusModalOpen(false)}
                className="w-full py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: N.surface, color: N.slate }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TARGET MODAL ─────────────────────────────────────────────────── */}
      {targetModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="rounded-xl shadow-xl w-full max-w-md" style={{ background: N.canvas }}>
            <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: N.hairline }}>
              <h3 className="text-base font-semibold" style={{ color: N.ink }}>Add Employee Target</h3>
              <button onClick={() => setTargetModalOpen(false)} className="cursor-pointer" style={{ color: N.steel }}><X size={18} /></button>
            </div>
            <form onSubmit={handleTargetSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>Select Employee *</label>
                <select value={targetForm.teammember_id || ""}
                  onChange={e => {
                    const val = e.target.value;
                    const m = teamMembers.find(m => String(m.id) === val);
                    setTargetForm({ ...targetForm, teammember_id: m ? Number(m.id) : "", user_id: m?.user_id || "", user_name: m ? `${m.first_name} ${m.last_name||""}`.trim() : "" });
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none" style={{ borderColor: N.hairlineStrong }} required>
                  <option value="">— Select Staff —</option>
                  {teamMembers.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.first_name} {t.last_name||""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: N.slate }}>Yearly Target (INR) *</label>
                <input type="number" value={targetForm.yearly_target}
                  onChange={e => setTargetForm({...targetForm, yearly_target: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: N.hairlineStrong }}
                  placeholder="e.g. 1200000" min="0" required />
                {targetForm.yearly_target && (
                  <p className="text-xs mt-1" style={{ color: N.stone }}>
                    Monthly: ₹{(parseFloat(targetForm.yearly_target)/12).toLocaleString(undefined,{maximumFractionDigits:0})}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: N.primary }}>Set Target</button>
                <button type="button" onClick={() => setTargetModalOpen(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: N.surface, color: N.slate }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── HistoryTable sub-component ───────────────────────────────────────────────
const HistoryTable = ({ tasks }) => (
  <div className="rounded-xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e5e3df" }}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead style={{ background: "#f6f5f4" }}>
          <tr>
            {["Task","Assigned To","Due Date","Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#787671" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id} className="border-t" style={{ borderColor: "#e5e3df" }}>
              <td className="px-4 py-3">
                <div className="font-medium" style={{ color: "#1a1a1a" }}>{task.project_name}</div>
                {task.task_title && <div className="text-xs mt-0.5" style={{ color: "#787671" }}>{task.task_title}</div>}
              </td>
              <td className="px-4 py-3" style={{ color: "#37352f" }}>{task.staff_name || task.assigned_to || "—"}</td>
              <td className="px-4 py-3 text-xs" style={{ color: "#787671" }}>{task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={task.project_status} /></td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr><td colSpan={4} className="py-10 text-center text-sm" style={{ color: "#a4a097" }}>No records for this filter.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── EmployeeTargetCard sub-component ────────────────────────────────────────
const EmployeeTargetCard = ({ user, onUpdateAchievement }) => {
  const [myTarget, setMyTarget] = useState(null);
  const [amount, setAmount]     = useState("");
  const [desc, setDesc]         = useState("");
  const [loading, setLoading]   = useState(true);

  const fetch = async () => {
    try {
      const userName = user?.name || `${user?.first_name||""} ${user?.last_name||""}`.trim();
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/task/targets/my?user_name=${encodeURIComponent(userName)}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setMyTarget(res.data?.hasTarget ? res.data : null);
    } catch { setMyTarget(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) { fetch(); const t = setInterval(fetch, 15000); return () => clearInterval(t); } }, [user]);
  useEffect(() => {
    if (!socket) return;
    socket.on("target_updated", fetch); socket.on("new_target", fetch);
    return () => { socket.off("target_updated", fetch); socket.off("new_target", fetch); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount");
    await onUpdateAchievement(parseFloat(amount), desc || "Achievement update");
    setAmount(""); setDesc(""); fetch();
  };

  if (loading) return <div className="text-center py-8" style={{ color: "#a4a097" }}>Loading…</div>;
  if (!myTarget) return (
    <div className="rounded-xl border p-6 text-center" style={{ background: "#ffe8d4", borderColor: "#dd5b00" }}>
      <p style={{ color: "#793400" }}>No target set yet. Contact admin.</p>
    </div>
  );

const monthly = myTarget.monthly_target || 0;
  const achieved = myTarget.achieved_amount || myTarget.achieved_count || 0;
  const carry = myTarget.carry_forward || 0;
  const effective = myTarget.effective_target || monthly;
  const balance = Math.max(0, effective - achieved);
  const pct = effective > 0 ? Math.round((achieved / effective) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Monthly Target", val: `₹${monthly.toLocaleString()}`,   color: "#0075de", bg: "#dcecfa" },
          { label: "Carry Forward",  val: `₹${carry.toLocaleString()}`,     color: "#dd5b00", bg: "#ffe8d4" },
          { label: "Achieved",       val: `₹${achieved.toLocaleString()}`,  color: "#1aae39", bg: "#d9f3e1" },
          { label: "Remaining",      val: `₹${balance.toLocaleString()}`,   color: "#e03131", bg: "#fde0ec" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: s.bg, borderColor: "transparent" }}>
            <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4" style={{ background: "#ffffff", borderColor: "#e5e3df" }}>
        <div className="flex justify-between text-xs mb-1" style={{ color: "#787671" }}>
          <span>Progress — Effective Target: ₹{effective.toLocaleString()}</span>
          <span className="font-semibold" style={{ color: pct >= 100 ? "#1aae39" : pct >= 50 ? "#dd5b00" : "#e03131" }}>{pct}%</span>
        </div>
        <div className="w-full rounded-full h-2.5" style={{ background: "#e5e3df" }}>
          <div className="h-2.5 rounded-full transition-all"
            style={{ width: `${Math.min(pct,100)}%`, background: pct >= 100 ? "#1aae39" : pct >= 50 ? "#dd5b00" : "#e03131" }} />
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ background: "#ffffff", borderColor: "#e5e3df" }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: "#1a1a1a" }}>Add Achievement</h4>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#5d5b54" }}>Amount (INR) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: "#c8c4be" }}
              placeholder="Enter amount" min="0" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#5d5b54" }}>Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: "#c8c4be" }}
              placeholder="e.g. Sale, Contract" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-6 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "#5645d4" }}>
              Submit Achievement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Task;
