import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, X, Target as TargetIcon, Calendar, Filter, ChevronDown, Clock, CheckCircle, AlertCircle, User, TrendingUp, History, DollarSign, RefreshCw } from "lucide-react";
import "../Styles/tailwind.css";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import socket from "../socket/socket";

import { API } from "../config/api";

const Task = () => {
  const { user } = useAuth();
  const { notifications, refreshNotifications } = useNotifications();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const [tasks, setTasks] = useState([]);
  const [taskTargets, setTaskTargets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [targetForm, setTargetForm] = useState({ user_name: "", yearly_target: "" });
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(null);

  const [form, setForm] = useState({
    project_name: "",
    task_title: "",
    client_name: "",
    staff_name: "",
    assigned_to: "",
    created_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    project_status: "New",
    project_priority: "Medium",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdate = (data) => {
      console.log("Task updated via socket:", data);
      fetchAll();
      refreshNotifications();
    };

    const handleNewTask = (data) => {
      console.log("New task created:", data);
      fetchAll();
      refreshNotifications();
    };

    const handleTargetUpdate = (data) => {
      console.log("Target updated via socket:", data);
      fetchAll();
      refreshNotifications();
    };

    socket.on("task_updated", handleTaskUpdate);
    socket.on("new_task", handleNewTask);
    socket.on("target_updated", handleTargetUpdate);
    socket.on("new_target", handleTargetUpdate);

    return () => {
      socket.off("task_updated", handleTaskUpdate);
      socket.off("new_task", handleNewTask);
      socket.off("target_updated", handleTargetUpdate);
      socket.off("new_target", handleTargetUpdate);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const socket = window.socket;
    if (socket) {
      const handleTargetUpdate = () => fetchAll();
      const handleTaskUpdate = () => fetchAll();
      
      socket.on("target_updated", handleTargetUpdate);
      socket.on("new_target", handleTargetUpdate);
      socket.on("task_updated", handleTaskUpdate);
      socket.on("new_task", handleTaskUpdate);
      
      return () => {
        socket.off("target_updated", handleTargetUpdate);
        socket.off("new_target", handleTargetUpdate);
        socket.off("task_updated", handleTaskUpdate);
        socket.off("new_task", handleTaskUpdate);
      };
    }
  }, [user]);

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    if (!targetForm.user_name || !targetForm.yearly_target) {
      alert("Please select employee and enter target amount");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const selectedMember = teamMembers.find(m => `${m.first_name} ${m.last_name || ""}`.trim() === targetForm.user_name);
      await axios.post(`${API}/api/task/targets`, {
        user_id: selectedMember?.id,
        user_name: targetForm.user_name,
        yearly_target: parseFloat(targetForm.yearly_target),
        created_by_admin: true
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (socket) {
        socket.emit("new_target", { userName: targetForm.user_name });
      }
      setTargetModalOpen(false);
      setTargetForm({ user_name: "", yearly_target: "" });
      fetchAll();
      refreshNotifications();
    } catch (err) {
      console.error("Target save error:", err);
      alert(err.response?.data?.error || "Failed to save target");
    }
  };

  const handleAchievementUpdate = async (amount, description) => {
    const token = localStorage.getItem("token");
    const userName = user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    try {
      await axios.post(`${API}/api/task/targets/update`, {
        user_id: user.id,
        user_name: userName,
        amount,
        description
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (socket) {
        socket.emit("target_updated", { userId: user.id, userName });
      }
      fetchAll();
      refreshNotifications();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update achievement");
    }
  };

  const fetchAll = async () => {
    try {
      const userName = user?.name || user?.email?.split("@")[0] || "";
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      let tasksRes, targetsRes, teamRes;

      const teamResPromise = axios.get(`${API}/api/teammember/list`).catch(() => ({ data: [] }));

      if (isAdmin) {
        [tasksRes, targetsRes, teamRes] = await Promise.all([
          axios.get(`${API}/api/task`, config),
          axios.get(`${API}/api/task/targets`, config),
          teamResPromise
        ]);
        setTaskTargets(targetsRes.data || []);
      } else {
        [tasksRes, targetsRes, teamRes] = await Promise.all([
          axios.get(`${API}/api/task`, config),
          axios.get(`${API}/api/task/targets/my?user_name=${encodeURIComponent(userName)}`, config).catch(() => ({ data: { hasTarget: false } })),
          teamResPromise
        ]);
        setTaskTargets(targetsRes.data?.hasTarget ? [targetsRes.data] : []);
      }

      setTasks(tasksRes.data || []);
      setTeamMembers(teamRes.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const taskData = {
        ...form,
        staff_name: form.assigned_to || form.staff_name || user?.name
      };

      if (selectedTask) {
        await axios.put(`${API}/api/task/${selectedTask.id}`, taskData, config);
        if (socket) {
          socket.emit("task_updated", { taskId: selectedTask.id, userId: user?.id });
        }
      } else {
        await axios.post(`${API}/api/task`, taskData, config);
        if (socket) {
          socket.emit("new_task", { userId: user?.id, assignedTo: form.assigned_to });
        }
      }
      fetchAll();
      setOpen(false);
      resetForm();
      refreshNotifications();
    } catch (err) {
      console.error("Save error:", err);
      alert(err.response?.data?.message || "Failed to save task");
    }
  };

  const resetForm = () => {
    setForm({
      project_name: "",
      task_title: "",
      client_name: "",
      staff_name: "",
      assigned_to: "",
      created_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      project_status: "New",
      project_priority: "Medium",
    });
    setSelectedTask(null);
  };

  const updateStatus = async (taskId, status) => {
    if (isEmployee && status === "New") {
      alert("You cannot set task to New status. Please use Accept to start.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${API}/api/task/${taskId}`, { project_status: status }, { headers: { Authorization: `Bearer ${token}` } });
      if (socket) {
        socket.emit("task_updated", { taskId, status, userId: user?.id });
      }
      fetchAll();
      setStatusModalOpen(false);
      refreshNotifications();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const quickStatusUpdate = async (taskId, status) => {
    if (isEmployee && status === "New") {
      alert("You cannot set task to New status");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${API}/api/task/${taskId}`, { project_status: status }, { headers: { Authorization: `Bearer ${token}` } });
      if (socket) {
        socket.emit("task_updated", { taskId, status, userId: user?.id });
      }
      fetchAll();
      refreshNotifications();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "New": return "bg-orange-100 text-orange-700";
      case "Process": return "bg-blue-100 text-blue-700";
      case "Completed": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "text-red-600";
      case "Medium": return "text-yellow-600";
      case "Low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getFilteredTasks = () => {
    const currentUserName = user?.name || user?.email?.split("@")[0] || "";

    let filtered = tasks;

    if (isEmployee) {
      filtered = tasks.filter(t =>
        t.staff_name?.toLowerCase() === currentUserName.toLowerCase() ||
        t.staff_name?.toLowerCase().includes(currentUserName.toLowerCase()) ||
        t.assigned_to?.toLowerCase() === currentUserName.toLowerCase()
      );
    } else if (isAdmin && employeeFilter !== "all") {
      filtered = tasks.filter(t =>
        t.staff_name?.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        t.assigned_to?.toLowerCase().includes(employeeFilter.toLowerCase())
      );
    }

    filtered = filtered.filter(t =>
      t.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.task_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (historyFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(t => {
        const taskDate = new Date(t.created_date);
        if (historyFilter === "today") {
          return taskDate.toDateString() === now.toDateString();
        } else if (historyFilter === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return taskDate >= weekAgo;
        } else if (historyFilter === "month") {
          return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
        } else if (historyFilter === "year") {
          return taskDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    return filtered;
  };

  const completedTasks = tasks.filter(t => t.project_status === "Completed");
  const activeTasks = tasks.filter(t => t.project_status !== "Completed");

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1694CE]">Task & Target</h2>
        <span className="text-sm text-gray-500">Dashboard &gt; Task & Target</span>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow mb-6 overflow-hidden">
        <div className="flex border-b">
          <button onClick={() => setActiveTab("tasks")} className={`px-6 py-4 font-medium text-sm ${activeTab === "tasks" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            <Plus size={16} className="inline mr-2" /> Active Tasks
          </button>
          <button onClick={() => setActiveTab("history")} className={`px-6 py-4 font-medium text-sm ${activeTab === "history" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            <Calendar size={16} className="inline mr-2" /> Task History
          </button>
          <button onClick={() => setActiveTab("targets")} className={`px-6 py-4 font-medium text-sm ${activeTab === "targets" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            <TargetIcon size={16} className="inline mr-2" /> Targets
          </button>
        </div>
      </div>

      {/* Active Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow border w-full max-w-md">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="outline-none flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isAdmin && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="bg-white border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Employees</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={`${m.first_name} ${m.last_name || ""}`.trim()}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            )}
            {isAdmin && (
              <button onClick={() => { resetForm(); setOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18} /> Assign Task
              </button>
            )}
          </div>

          {lastUpdate && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <RefreshCw size={12} /> Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-orange-600 text-sm">New</p>
              <p className="text-2xl font-bold text-orange-700">{tasks.filter(t => t.project_status === "New").length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-blue-600 text-sm">In Process</p>
              <p className="text-2xl font-bold text-blue-700">{tasks.filter(t => t.project_status === "Process").length}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-green-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-700">{completedTasks.length}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-purple-600 text-sm">Total</p>
              <p className="text-2xl font-bold text-purple-700">{tasks.length}</p>
            </div>
          </div>

          {/* Task List - Row Format */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Task Details</th>
                    <th className="px-4 py-3 text-left">Assigned To</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTasks().filter(t => t.project_status !== "Completed").map(task => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{task.project_name}</div>
                        <div className="text-xs text-gray-500">{task.task_title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User size={14} className="text-blue-600" />
                          </div>
                          <span className="text-gray-700">{task.staff_name || task.assigned_to || "Not assigned"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar size={14} />
                          {task.due_date || "No date"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${getPriorityColor(task.project_priority)}`}>
                          {task.project_priority || "Medium"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.project_status)}`}>
                          {task.project_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEmployee ? (
                          <div className="flex gap-1 justify-center">
                            {task.project_status === "New" && (
                              <button onClick={() => quickStatusUpdate(task.id, "Process")} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200">
                                Accept
                              </button>
                            )}
                            {task.project_status === "Process" && (
                              <button onClick={() => quickStatusUpdate(task.id, "Completed")} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200">
                                Finished
                              </button>
                            )}
                            {task.project_status !== "New" && task.project_status !== "Completed" && (
                              <button onClick={() => quickStatusUpdate(task.id, "Completed")} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">
                                Done
                              </button>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setSelectedTask(task); setNewStatus(task.project_status); setStatusModalOpen(true); }}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {getFilteredTasks().filter(t => t.project_status !== "Completed").length === 0 && (
                    <tr><td colSpan="6" className="py-8 text-center text-gray-500">No active tasks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Task History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            {["all", "today", "week", "month", "year"].map(f => (
              <button 
                key={f} 
                onClick={() => setHistoryFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${historyFilter === f ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Task</th>
                    <th className="px-4 py-3 text-left">Assigned To</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-left">Completed</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map(task => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{task.project_name}</div>
                        <div className="text-xs text-gray-500">{task.task_title}</div>
                      </td>
                      <td className="px-4 py-3">{task.staff_name || "Not assigned"}</td>
                      <td className="px-4 py-3 text-gray-600">{task.created_date}</td>
                      <td className="px-4 py-3 text-gray-600">{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.project_status)}`}>
                          {task.project_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {completedTasks.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-500">No completed tasks</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

{/* Targets Tab */}
      {activeTab === "targets" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {taskTargets.length} employee{taskTargets.length !== 1 ? 's' : ''} with targets
              </div>
              <button onClick={() => setTargetModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700">
                <TargetIcon size={18} /> Add Target
              </button>
            </div>
          )}

          {/* Admin: All Targets Table */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-right">Yearly Target</th>
                      <th className="px-4 py-3 text-right">Monthly Target</th>
                      <th className="px-4 py-3 text-right">Carry Forward</th>
                      <th className="px-4 py-3 text-right">Effective Target</th>
                      <th className="px-4 py-3 text-right">Achieved</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskTargets.map(target => {
                      const monthlyTarget = target.monthly_target || 0;
                      const achieved = target.achieved_amount || target.achieved_count || 0;
                      const carryForward = target.carry_forward || 0;
                      const effectiveTarget = monthlyTarget + carryForward;
                      const balance = Math.max(0, effectiveTarget - achieved);
                      const progress = effectiveTarget > 0 ? Math.round((achieved / effectiveTarget) * 100) : 0;
                      return (
                        <tr key={target.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{target.user_name}</td>
                          <td className="px-4 py-3 text-right">₹{Number(target.yearly_target || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₹{monthlyTarget.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-orange-600">₹{carryForward.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-blue-600 font-medium">₹{effectiveTarget.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-green-600">₹{achieved.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-red-600">₹{balance.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium">{progress}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {taskTargets.length === 0 && (
                      <tr><td colSpan="8" className="py-8 text-center text-gray-500">No targets set. Click "Add Target" to create one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Target (for employees) */}
          {isEmployee && (
            <EmployeeTargetCard user={user} onUpdateAchievement={handleAchievementUpdate} />
          )}
        </div>
      )}

      {/* Task Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">{selectedTask ? "Update Task" : "Assign New Task"}</h3>
              <button onClick={() => { setOpen(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Project Name *</label>
                <input type="text" name="project_name" value={form.project_name} onChange={handleChange} className="w-full border rounded-lg p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Task Title</label>
                <input type="text" name="task_title" value={form.task_title} onChange={handleChange} className="w-full border rounded-lg p-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Assign To</label>
                  <select name="assigned_to" value={form.assigned_to} onChange={handleChange} className="w-full border rounded-lg p-2">
                    <option value="">Select Employee</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={`${m.first_name} ${m.last_name || ""}`.trim()}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Priority</label>
                  <select name="project_priority" value={form.project_priority} onChange={handleChange} className="w-full border rounded-lg p-2">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Created Date</label>
                  <input type="date" name="created_date" value={form.created_date} onChange={handleChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
                  <input type="date" name="due_date" value={form.due_date} onChange={handleChange} className="w-full border rounded-lg p-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                <select name="project_status" value={form.project_status} onChange={handleChange} className="w-full border rounded-lg p-2">
                  <option value="New">New</option>
                  <option value="Process">In Process</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {selectedTask ? "Update Task" : "Assign Task"}
                </button>
                <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Update Task Status</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-600 text-sm">Select new status for this task:</p>
              {["New", "Process", "Completed"].map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(selectedTask.id, status)}
                  disabled={isEmployee && status === "New"}
                  className={`w-full p-3 rounded-lg text-left font-medium transition ${
                    newStatus === status 
                      ? "bg-blue-50 border-2 border-blue-500 text-blue-700" 
                      : isEmployee && status === "New"
                        ? "border border-gray-100 text-gray-300 cursor-not-allowed"
                        : "border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {status === "New" && <span className="text-orange-500 mr-2">●</span>}
                  {status === "Process" && <span className="text-blue-500 mr-2">●</span>}
                  {status === "Completed" && <span className="text-green-500 mr-2">●</span>}
                  {status === "New" && isEmployee && " (Not allowed)"}
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setStatusModalOpen(false)} className="w-full bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal for Admin */}
      {targetModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Add Employee Target</h3>
              <button onClick={() => { setTargetModalOpen(false); setTargetForm({ user_name: "", yearly_target: "" }); }} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTargetSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Select Employee *</label>
                <select 
                  value={targetForm.user_name} 
                  onChange={(e) => setTargetForm({ ...targetForm, user_name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={`${m.first_name} ${m.last_name || ""}`.trim()}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Yearly Target (INR) *</label>
                <input 
                  type="number" 
                  value={targetForm.yearly_target}
                  onChange={(e) => setTargetForm({ ...targetForm, yearly_target: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Enter yearly target in INR"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monthly target: ₹{targetForm.yearly_target ? (parseFloat(targetForm.yearly_target) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Set Target
                </button>
                <button type="button" onClick={() => { setTargetModalOpen(false); setTargetForm({ user_name: "", yearly_target: "" }); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Employee Target Card Component
const EmployeeTargetCard = ({ user, onUpdateAchievement }) => {
  const [myTarget, setMyTarget] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyTarget = async () => {
    try {
      const userName = user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/task/targets/my?user_name=${encodeURIComponent(userName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.hasTarget) {
        setMyTarget(res.data);
        setError(null);
      } else {
        setMyTarget(null);
        setError("No target set for you yet");
      }
    } catch (err) {
      console.error("Fetch target error:", err);
      setError("Failed to load target");
      setMyTarget(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyTarget();
      const interval = setInterval(fetchMyTarget, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleTargetUpdate = () => fetchMyTarget();
    socket.on("target_updated", handleTargetUpdate);
    socket.on("new_target", handleTargetUpdate);
    return () => {
      socket.off("target_updated", handleTargetUpdate);
      socket.off("new_target", handleTargetUpdate);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    await onUpdateAchievement(parseFloat(amount), description || "Achievement update");
    setAmount("");
    setDescription("");
    fetchMyTarget();
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
      <p className="text-orange-700">{error}</p>
    </div>
  );
  if (!myTarget) return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
      <p className="text-orange-700">No target set for you yet. Contact admin to set your target.</p>
    </div>
  );

  const monthlyTarget = myTarget.monthly_target || 0;
  const achieved = myTarget.achieved_count || 0;
  const carryForward = myTarget.carry_forward || 0;
  const effectiveTarget = myTarget.effective_target || monthlyTarget;
  const balance = Math.max(0, effectiveTarget - achieved);
  const progress = effectiveTarget > 0 ? Math.round((achieved / effectiveTarget) * 100) : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-blue-800">My Target Progress</h3>
        <span className="text-sm text-blue-600 bg-white px-3 py-1 rounded-full shadow">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Monthly Target</p>
          <p className="text-xl font-bold text-blue-600">₹{monthlyTarget.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Carry Forward</p>
          <p className="text-xl font-bold text-orange-600">₹{carryForward.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Achieved</p>
          <p className="text-xl font-bold text-green-600">₹{achieved.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-xs text-gray-500 mb-1">Remaining</p>
          <p className="text-xl font-bold text-red-600">₹{balance.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <span className="text-sm font-bold">{progress}%</span>
        </div>
        <p className="text-xs text-gray-500">
          Effective Target: ₹{effectiveTarget.toLocaleString()} (including carry forward)
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress (Effective Target: ₹{effectiveTarget.toLocaleString()})</span>
          <span className={`font-bold ${progress >= 100 ? "text-green-600" : progress >= 50 ? "text-yellow-600" : "text-red-600"}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow">
        <h4 className="font-semibold text-gray-700 mb-3">Add Achievement</h4>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Remaining to achieve:</strong> ₹{balance.toLocaleString()} | 
            Target: ₹{effectiveTarget.toLocaleString()} | 
            Achieved: ₹{achieved.toLocaleString()}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (INR) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Enter amount in INR"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="e.g., Sale, Contract, Service"
            />
          </div>
        </div>
        <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Submit Achievement
        </button>
      </form>
    </div>
  );
};

export default Task;