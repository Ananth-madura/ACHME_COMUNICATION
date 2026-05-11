import React, { useState, useEffect } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, TrendingUp, Target as TargetIcon, Calendar, BarChart3 } from "lucide-react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import socket from "../socket/socket";
import { API } from "../config/api";

const Targets = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState([]);
  const [myTarget, setMyTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updateAmount, setUpdateAmount] = useState("");
  const [updateDesc, setUpdateDesc] = useState("");
  const [history, setHistory] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/teammember`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(res.data);
    } catch (err) {
      console.error("Fetch team members error:", err);
    }
  };

  const fetchAllTargets = async () => {
    try {
      const res = await axios.get(`${API}/api/targets`);
      setTargets(res.data);
    } catch (err) {
      console.error("Fetch targets error:", err);
    }
  };

  const fetchMyTarget = async () => {
    try {
      const res = await axios.get(`${API}/api/targets/my?user_name=${encodeURIComponent(user?.name || "")}`);
      setMyTarget(res.data);
    } catch (err) {
      console.error("Fetch my target error:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/api/targets/history?user_name=${encodeURIComponent(user?.name || "")}&months=12`);
      setHistory(res.data);
      const graph = res.data.map(h => ({
        month: h.month_year,
        achieved: parseFloat(h.achieved_amount) || 0,
        target: parseFloat(h.monthly_target) || 0
      }));
      setGraphData(graph.reverse());
    } catch (err) {
      console.error("Fetch history error:", err);
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
  }, [isAdmin]);

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
    return () => socket.off("data_changed", handleChange);
  }, [isAdmin]);

  const [form, setForm] = useState({
    user_name: "",
    yearly_target: "",
    monthly_target: ""
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveTarget = async (e) => {
    e.preventDefault();
    try {
      const selectedUser = teamMembers.find(t => `${t.first_name} ${t.last_name || ""}`.trim() === form.user_name);
      await axios.post(`${API}/api/targets`, {
        ...form,
        user_id: selectedUser?.id,
        created_by_admin: user?.name || "Admin"
      });
      alert("Target saved successfully");
      setOpen(false);
      fetchAllTargets();
    } catch (err) {
      alert("Failed to save target: " + (err.response?.data?.error || err.message));
    }
  };

  const updateAchievement = async () => {
    if (!updateAmount) return alert("Please enter amount");
    try {
      await axios.post(`${API}/api/targets/update`, {
        user_id: user?.id,
        user_name: user?.name,
        amount: parseFloat(updateAmount),
        description: updateDesc
      });
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
        <a className="text-sm text-gray-500" href="/dashboard">{`Dashboard > Targets`}</a>
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
              onClick={() => setOpen(true)}
              className="bg-[#FF3355] text-white px-4 py-2 rounded-lg shadow hover:bg-[#e62848] flex items-center gap-2"
            >
              <Plus size={18} /> Set Target
            </button>
          </div>

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
                </tr>
              </thead>
              <tbody>
                {targets.filter(t => t.user_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{t.user_name}</td>
                    <td className="p-3 text-right">₹{formatIndian(t.yearly_target)}</td>
                    <td className="p-3 text-right">₹{formatIndian(t.monthly_target)}</td>
                    <td className="p-3 text-right text-green-600 font-medium">₹{formatIndian(t.achieved_amount)}</td>
                    <td className="p-3 text-right text-orange-600 font-medium">₹{formatIndian(t.pending_amount)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        t.achieved_amount >= t.monthly_target ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {t.achieved_amount >= t.monthly_target ? "Achieved" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {open && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Set User Target</h2>
                  <X className="cursor-pointer" onClick={() => setOpen(false)} />
                </div>
                <form onSubmit={saveTarget} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Select User</label>
                    <select
                      name="user_name"
                      value={form.user_name}
                      onChange={handleChange}
                      className="border rounded-md px-3 py-2 outline-none bg-white w-full text-sm"
                      required
                    >
                      <option value="">-- Select Staff --</option>
                      {teamMembers.map(t => (
                        <option key={t.id} value={`${t.first_name} ${t.last_name || ""}`.trim()}>
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
                      placeholder="e.g. 3000000"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Save</button>
                    <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {myTarget ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Yearly Target</p>
                  <p className="text-2xl font-bold text-blue-600">₹{formatIndian(myTarget.yearly_target)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Monthly Target</p>
                  <p className="text-2xl font-bold text-green-600">₹{formatIndian(myTarget.monthly_target)}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-500">Pending (MTD)</p>
                  <p className="text-2xl font-bold text-orange-600">₹{formatIndian(myTarget.pending_amount)}</p>
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
                {history.map(h => (
                  <tr key={h.month_year} className="border-b hover:bg-gray-50">
                    <td className="p-2">{h.month_year}</td>
                    <td className="p-2 text-right">₹{formatIndian(h.monthly_target)}</td>
                    <td className="p-2 text-right text-green-600">₹{formatIndian(h.achieved_amount)}</td>
                    <td className="p-2 text-right text-orange-600">₹{formatIndian(h.monthly_target - h.achieved_amount)}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        h.achieved_amount >= h.monthly_target ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {h.achieved_amount >= h.monthly_target ? "Achieved" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Targets;