import React, { useState, useEffect } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, TrendingUp, Target as TargetIcon, Calendar, BarChart3, Edit, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import socket from "../socket/socket";
import { API } from "../config/api";

const Targets = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [targets, setTargets] = useState([]);
  const [myTarget, setMyTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updateAmount, setUpdateAmount] = useState("");
  const [updateDesc, setUpdateDesc] = useState("");
  const [history, setHistory] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/teammember`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTeamMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch team members error:", err);
      setTeamMembers([]);
    }
  };

  const fetchAllTargets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/task/targets`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTargets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch targets error:", err);
      setTargets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTarget = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const userName = user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
      const res = await axios.get(`${API}/api/task/targets/my?user_name=${encodeURIComponent(userName)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data?.hasTarget) {
        setMyTarget(res.data);
      } else {
        setMyTarget(null);
      }
    } catch (err) {
      console.error("Fetch my target error:", err);
      setMyTarget(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const userName = user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
      const res = await axios.get(`${API}/api/task/targets/history?user_name=${encodeURIComponent(userName)}&months=12`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setHistory(Array.isArray(res.data) ? res.data : []);
      const graph = (res.data || []).map(h => ({
        month: h.month_year,
        achieved: parseFloat(h.achieved_count || h.achieved_amount || 0),
        target: parseFloat(h.monthly_target || 0)
      }));
      setGraphData(graph.reverse());
    } catch (err) {
      console.error("Fetch history error:", err);
      setHistory([]);
      setGraphData([]);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
    if (isAdmin) {
      fetchAllTargets();
    } else {
      fetchMyTarget();
      fetchHistory();
    }
  }, [isAdmin, user]);

  useEffect(() => {
    const handleChange = () => {
      fetchTeamMembers();
      if (isAdmin) fetchAllTargets();
      else {
        fetchMyTarget();
        fetchHistory();
      }
    };
    socket.on("data_changed", handleChange);
    socket.on("target_updated", handleChange);
    socket.on("new_target", handleChange);
    return () => {
      socket.off("data_changed", handleChange);
      socket.off("target_updated", handleChange);
      socket.off("new_target", handleChange);
    };
  }, [isAdmin]);

  const [form, setForm] = useState({
    user_name: "",
    yearly_target: "",
    monthly_target: "",
    user_id: "",
    teammember_id: ""
  });

  const resetForm = () => {
    setForm({
      user_name: "",
      yearly_target: "",
      monthly_target: "",
      user_id: "",
      teammember_id: ""
    });
    setEditMode(false);
    setEditTarget(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "user_name_select") {
      const m = teamMembers.find(t => String(t.id) === value);
      if (m) {
        setForm({ ...form, user_id: m.user_id || m.id, user_name: `${m.first_name} ${m.last_name || ""}`.trim(), teammember_id: m.id });
      } else {
        setForm({ ...form, user_id: "", user_name: value, teammember_id: "" });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const saveTarget = async (e) => {
    e.preventDefault();
    if (!form.user_name && !form.teammember_id) return alert("Please select an employee");
    if (!form.yearly_target) return alert("Please enter yearly target");

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (editMode && editTarget) {
        await axios.put(`${API}/api/task/targets/${editTarget.id}`, {
          user_id: form.user_id || null,
          user_name: form.user_name,
          teammember_id: form.teammember_id || null,
          yearly_target: parseFloat(form.yearly_target),
          monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : Math.round(parseFloat(form.yearly_target) / 12),
        }, { headers });
        socket?.emit("target_updated", { targetId: editTarget.id, userName: form.user_name });
        alert("Target updated successfully");
      } else {
        await axios.post(`${API}/api/task/targets`, {
          user_id: form.user_id || null,
          user_name: form.user_name,
          teammember_id: form.teammember_id || null,
          yearly_target: parseFloat(form.yearly_target),
          monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : Math.round(parseFloat(form.yearly_target) / 12),
          created_by_admin: user?.name || "Admin"
        }, { headers });
        socket?.emit("new_target", { userName: form.user_name });
        alert("Target saved successfully");
      }
      setOpen(false);
      resetForm();
      fetchAllTargets();
    } catch (err) {
      alert("Failed to save target: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (target) => {
    setEditMode(true);
    setEditTarget(target);
    setForm({
      user_name: target.user_name || "",
      yearly_target: target.yearly_target || "",
      monthly_target: target.monthly_target || "",
      user_id: target.user_id || "",
      teammember_id: target.teammember_id || ""
    });
    setOpen(true);
  };

  const handleDelete = async (targetId) => {
    if (!window.confirm("Are you sure you want to delete this target?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API}/api/task/targets/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      socket?.emit("target_updated", { targetId, action: "deleted" });
      alert("Target deleted successfully");
      fetchAllTargets();
    } catch (err) {
      alert("Failed to delete target: " + (err.response?.data?.error || err.message));
    }
  };

  const updateAchievement = async () => {
    if (!updateAmount || parseFloat(updateAmount) <= 0) return alert("Please enter a valid amount");

    const userName = user?.first_name || user?.name || user?.email?.split("@")[0] || "";
    const token = localStorage.getItem("token");

    try {
      await axios.post(`${API}/api/task/targets/update`, {
        user_id: user?.id,
        user_name: userName,
        amount: parseFloat(updateAmount),
        description: updateDesc || "Achievement update"
      }, { headers: { Authorization: `Bearer ${token}` } });

      socket?.emit("target_updated", { userId: user?.id, userName, amount: updateAmount });
      alert("Achievement updated!");
      setUpdateAmount("");
      setUpdateDesc("");
      fetchMyTarget();
      fetchHistory();
    } catch (err) {
      alert("Failed to update: " + (err.response?.data?.error || err.message));
    }
  };

  const formatIndian = (num) => {
    const n = parseFloat(num) || 0;
    return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1694CE]">
          {isAdmin ? "Target Management" : "My Sales Target"}
        </h1>
        <span className="text-sm text-gray-500">Dashboard &gt; Targets</span>
      </div>

      {isAdmin ? (
        <>
          <div className="bg-[#F3F8FA] p-4 rounded-xl flex justify-between items-center shadow mb-4">
            <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow border w-80">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search by user name..."
                className="outline-none text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => { resetForm(); setOpen(true); }}
              className="bg-[#FF3355] text-white px-4 py-2 rounded-lg shadow hover:bg-[#e62848] flex items-center gap-2"
            >
              <Plus size={18} /> Set Target
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading targets...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-xs uppercase text-gray-500 font-bold border-b">
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-right">Yearly Target</th>
                    <th className="p-3 text-right">Monthly Target</th>
                    <th className="p-3 text-right">Achieved (MTD)</th>
                    <th className="p-3 text-right">Pending (MTD)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.filter(t => t.user_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(t => {
                    const achieved = parseFloat(t.achieved_amount || t.achieved_count || 0);
                    const monthlyTarget = parseFloat(t.monthly_target || 0);
                    const pending = Math.max(0, monthlyTarget - achieved);

                    return (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{t.user_name}</td>
                        <td className="p-3 text-right">₹{formatIndian(t.yearly_target)}</td>
                        <td className="p-3 text-right">₹{formatIndian(t.monthly_target)}</td>
                        <td className="p-3 text-right text-green-600 font-medium">₹{formatIndian(achieved)}</td>
                        <td className="p-3 text-right text-orange-600 font-medium">₹{formatIndian(pending)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${achieved >= monthlyTarget ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                            }`}>
                            {achieved >= monthlyTarget ? "Achieved" : "Pending"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(t)}
                              className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {targets.filter(t => t.user_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-500">No targets found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {open && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{editMode ? "Edit Target" : "Set User Target"}</h2>
                  <X className="cursor-pointer" onClick={() => { setOpen(false); resetForm(); }} />
                </div>
                <form onSubmit={saveTarget} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Select User</label>
                    <select
                      name="user_name_select"
                      value={form.teammember_id || ""}
                      onChange={handleChange}
                      className="border rounded-md px-3 py-2 outline-none bg-white w-full text-sm"
                      required
                      disabled={editMode}
                    >
                      <option value="">-- Select Staff --</option>
                      {teamMembers.map(t => (
                        <option key={t.id} value={String(t.id)}>
                          {t.first_name} {t.last_name || ""} {t.job_title ? `(${t.job_title})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Yearly Target (₹)</label>
                    <input
                      type="number"
                      name="yearly_target"
                      value={form.yearly_target}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2 mt-1"
                      placeholder="e.g. 36000000"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Monthly Target (₹)</label>
                    <input
                      type="number"
                      name="monthly_target"
                      value={form.monthly_target}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2 mt-1"
                      placeholder="e.g. 3000000 (optional - auto-calculated)"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                      {editMode ? "Update" : "Save"}
                    </button>
                    <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading your target...</div>
          ) : myTarget ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Yearly Target</p>
                  <p className="text-2xl font-bold text-blue-600">₹{formatIndian(myTarget.yearly_target)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Monthly Target</p>
                  <p className="text-2xl font-bold text-green-600">₹{formatIndian(myTarget.monthly_target)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Achieved (MTD)</p>
                  <p className="text-2xl font-bold text-purple-600">₹{formatIndian(myTarget.achieved_amount || myTarget.achieved_count || 0)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Pending (MTD)</p>
                  <p className="text-2xl font-bold text-orange-600">₹{formatIndian(myTarget.pending_amount || 0)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-yellow-700">No target set for you yet. Please contact admin.</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-600" /> Update Achievement
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Amount Achieved (₹)</label>
                <input
                  type="number"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1"
                  placeholder="Enter amount achieved today"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <input
                  type="text"
                  value={updateDesc}
                  onChange={(e) => setUpdateDesc(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1"
                  placeholder="e.g. Closed deal with ABC company"
                />
              </div>
              <button
                onClick={updateAchievement}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Update Achievement
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <>
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" /> Monthly Progress
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${formatIndian(value)}`} />
                      <Line type="monotone" dataKey="target" stroke="#6366f1" name="Target" strokeWidth={2} />
                      <Line type="monotone" dataKey="achieved" stroke="#22c55e" name="Achieved" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="text-lg font-semibold mb-4">Achievement History</h3>
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="text-xs uppercase text-gray-500 font-bold border-b">
                      <th className="p-2 text-left">Month</th>
                      <th className="p-2 text-right">Target</th>
                      <th className="p-2 text-right">Achieved</th>
                      <th className="p-2 text-right">Balance</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => {
                      const achieved = parseFloat(h.achieved_count || h.achieved_amount || 0);
                      const target = parseFloat(h.monthly_target || 0);
                      return (
                        <tr key={h.month_year} className="border-b hover:bg-gray-50">
                          <td className="p-2">{h.month_year}</td>
                          <td className="p-2 text-right">₹{formatIndian(target)}</td>
                          <td className="p-2 text-right text-green-600">₹{formatIndian(achieved)}</td>
                          <td className="p-2 text-right text-orange-600">₹{formatIndian(Math.max(0, target - achieved))}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${achieved >= target ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                              }`}>
                              {achieved >= target ? "Achieved" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Targets;