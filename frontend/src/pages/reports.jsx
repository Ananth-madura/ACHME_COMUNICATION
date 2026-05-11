import React, { useState, useEffect, useMemo } from "react";
import "../Styles/tailwind.css";
import axios from "axios";
import { normalizeDate, getToday } from "../utils/leadutil";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend, AreaChart, Area, ComposedChart } from "recharts";
import { Calendar, Filter, RefreshCw, Search } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { API } from "../config";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#14B8A6"];
const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [sortBy, setSortBy] = useState("leads");
  const [filter, setFilter] = useState("month");
  const [viewMode, setViewMode] = useState("grid");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [overview, setOverview] = useState(null);
  const [employeeData, setEmployeeData] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);

  const today = getToday();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const queryParams = `?filter=${filter}${customFromDate ? `&from=${customFromDate}` : ""}${customToDate ? `&to=${customToDate}` : ""}${searchTerm ? `&customer=${searchTerm}` : ""}`;

      try {
        const [team, ov, emp, mt, dt] = await Promise.all([
          axios.get(`${API}/api/teammember`, config),
          axios.get(`${API}/api/reports/overview${queryParams}`, config),
          axios.get(`${API}/api/reports/employee-comparison${queryParams}`, config),
          axios.get(`${API}/api/reports/trends?type=monthly`, config),
          axios.get(`${API}/api/reports/trends?type=daily`, config),
        ]);
        
        setTeamMembers(team.data);
        setOverview(ov.data);
        setEmployeeData(emp.data);
        setMonthlyTrends(mt.data);
        setDailyTrends(dt.data);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [filter, customFromDate, customToDate, searchTerm]);

  const getStartDate = () => {
    if (showCustomDate && customFromDate) return customFromDate;
    const d = new Date();
    if (filter === "day") return today;
    if (filter === "week") d.setDate(d.getDate() - 6);
    if (filter === "month") d.setDate(1);
    if (filter === "year") { d.setMonth(0); d.setDate(1); }
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  const getEndDate = () => {
    if (showCustomDate && customToDate) return customToDate;
    return today;
  };

  const startDate = getStartDate();
  const endDate = getEndDate();
  const inRange = (dateStr) => dateStr && normalizeDate(dateStr) >= startDate && normalizeDate(dateStr) <= endDate;

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setShowCustomDate(false);
    setCustomFromDate("");
    setCustomToDate("");
  };

  const handleCustomDateApply = () => {
    if (customFromDate && customToDate) {
      setShowCustomDate(false);
    }
  };

  const getDateRangeLabel = () => {
    if (showCustomDate && customFromDate && customToDate) {
      return `${customFromDate} to ${customToDate}`;
    }
    if (filter === "day") return "Today";
    if (filter === "week") return "Last 7 Days";
    if (filter === "month") return "This Month";
    if (filter === "year") return "This Year";
    return "This Month";
  };

  const overviewData = overview || {
    totalSales: 0, totalLeads: 0, totalCalls: 0, totalWalkins: 0, totalFields: 0,
    totalServices: 0, totalRevenue: 0, convertedLeads: 0, totalClients: 0, totalContracts: 0, totalProposals: 0
  };

  const getLeadSourceData = () => [
    { name: "Telecalling", value: overviewData.totalCalls, color: "#3B82F6" },
    { name: "Walkins", value: overviewData.totalWalkins, color: "#10B981" },
    { name: "Field Work", value: overviewData.totalFields, color: "#8B5CF6" },
  ];

  const getConversionData = () => [
    { name: "Converted", value: overviewData.convertedLeads, color: "#10B981" },
    { name: "Not Converted", value: Math.max(0, overviewData.totalLeads - overviewData.convertedLeads), color: "#EF4444" },
  ];

  const getEmployeePerformanceData = () => employeeData.slice(0, 6).map(emp => ({
    name: emp.name.split(" ")[0],
    Leads: emp.totalLeads,
    Revenue: emp.serviceRevenue,
    Conversion: emp.conversionRate,
    Services: emp.services,
  }));

  const selectedEmpMetrics = selectedEmployee ? employeeData.find(e => e.name === selectedEmployee) : null;

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          {["day", "week", "month", "year"].map(f => (
            <button key={f} onClick={() => handleFilterChange(f)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${filter === f && !showCustomDate ? "bg-white shadow text-blue-600" : "text-gray-500"}`}>
              {f === "day" ? "Day" : f === "week" ? "Week" : f === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCustomDate(!showCustomDate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${showCustomDate ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        >
          <Calendar size={16} /> Custom Date
        </button>
        {showCustomDate && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow border">
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button onClick={handleCustomDateApply} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Apply</button>
          </div>
        )}
        <div className="ml-auto text-sm text-gray-500 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
            <Search size={14} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter by Customer..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            Showing: <span className="font-semibold text-gray-700">{getDateRangeLabel()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white"><p className="text-blue-100 text-sm">Total Sales</p><p className="text-2xl font-bold">₹{overviewData.totalSales.toLocaleString()}</p></div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white"><p className="text-green-100 text-sm">Total Leads</p><p className="text-2xl font-bold">{overviewData.totalLeads}</p></div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white"><p className="text-purple-100 text-sm">Services Done</p><p className="text-2xl font-bold">{overviewData.totalServices}</p></div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white"><p className="text-orange-100 text-sm">Revenue</p><p className="text-2xl font-bold">₹{overviewData.totalRevenue.toLocaleString()}</p></div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white"><p className="text-cyan-100 text-sm">Conversion</p><p className="text-2xl font-bold">{overviewData.totalLeads > 0 ? Math.round((overviewData.convertedLeads / overviewData.totalLeads) * 100) : 0}%</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Sales & Leads Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(value, name) => [name === "Sales" || name === "Revenue" ? `₹${value.toLocaleString()}` : value, name]} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="Sales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="Leads" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="Services" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue & Services Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(value, name) => [name === "Revenue" ? `₹${value.toLocaleString()}` : value, name]} />
              <Legend />
              <Area type="monotone" dataKey="Revenue" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Services" stackId="2" stroke="#EC4899" fill="#EC4899" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={getLeadSourceData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {getLeadSourceData().map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {getLeadSourceData().map((item, i) => (
              <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-sm text-gray-600">{item.name}</span></div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Lead Conversion</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={getConversionData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {getConversionData().map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {getConversionData().map((item, i) => (
              <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-sm text-gray-600">{item.name}</span></div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Employee Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getEmployeePerformanceData()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={60} />
              <Tooltip />
              <Bar dataKey="Leads" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border"><p className="text-gray-500 text-sm">Telecalls</p><p className="text-2xl font-bold text-blue-600">{overviewData.totalCalls}</p></div>
        <div className="bg-white rounded-xl p-4 shadow border"><p className="text-gray-500 text-sm">Walkins</p><p className="text-2xl font-bold text-green-600">{overviewData.totalWalkins}</p></div>
        <div className="bg-white rounded-xl p-4 shadow border"><p className="text-gray-500 text-sm">Field Visits</p><p className="text-2xl font-bold text-purple-600">{overviewData.totalFields}</p></div>
        <div className="bg-white rounded-xl p-4 shadow border"><p className="text-gray-500 text-sm">Total Clients</p><p className="text-2xl font-bold text-orange-600">{overviewData.totalClients}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b"><h3 className="text-lg font-semibold text-gray-700">Monthly Breakdown</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr><th className="px-4 py-3 text-left">Month</th><th className="px-4 py-3 text-right">Sales (₹)</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3 text-right">Services</th><th className="px-4 py-3 text-right">Converted</th><th className="px-4 py-3 text-right">Revenue (₹)</th></tr>
            </thead>
            <tbody>
              {monthlyTrends.map((m, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-right text-blue-600 font-semibold">₹{m.Sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{m.Leads}</td>
                  <td className="px-4 py-3 text-right">{m.Services}</td>
                  <td className="px-4 py-3 text-right"><span className={`px-2 py-1 rounded-full text-xs font-medium ${m.Converted > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{m.Converted}</span></td>
                  <td className="px-4 py-3 text-right text-purple-600">₹{m.Revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const EmployeeTab = () => {
    const sortedEmployeeData = [...employeeData].sort((a, b) => {
      if (sortBy === "leads") return b.totalLeads - a.totalLeads;
      if (sortBy === "revenue") return b.serviceRevenue - a.serviceRevenue;
      if (sortBy === "conversion") return b.conversionRate - a.conversionRate;
      if (sortBy === "target") return b.targetRate - a.targetRate;
      if (sortBy === "tasks") return b.tasksCompleted - a.tasksCompleted;
      return b.totalLeads - a.totalLeads;
    });

    const teamSummary = {
      totalEmployees: employeeData.length,
      totalLeads: employeeData.reduce((s, m) => s + m.totalLeads, 0),
      totalConverted: employeeData.reduce((s, m) => s + m.leadsConverted, 0),
      totalRevenue: employeeData.reduce((s, m) => s + m.serviceRevenue, 0),
      avgConversion: employeeData.length > 0 ? Math.round(employeeData.reduce((s, m) => s + m.conversionRate, 0) / employeeData.length) : 0,
    };

    return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          {["day", "week", "month", "year"].map(f => (
            <button key={f} onClick={() => handleFilterChange(f)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${filter === f && !showCustomDate ? "bg-white shadow text-blue-600" : "text-gray-500"}`}>
              {f === "day" ? "Day" : f === "week" ? "Week" : f === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCustomDate(!showCustomDate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${showCustomDate ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        >
          <Calendar size={16} /> Custom Date
        </button>
        {showCustomDate && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow border">
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button onClick={handleCustomDateApply} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Apply</button>
          </div>
        )}
        <div className="ml-auto text-sm text-gray-500 flex items-center gap-2">
          <Calendar size={14} />
          Showing: <span className="font-semibold text-gray-700">{getDateRangeLabel()}</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4">Team Performance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center"><p className="text-indigo-200 text-sm">Employees</p><p className="text-2xl font-bold">{teamSummary.totalEmployees}</p></div>
          <div className="text-center"><p className="text-indigo-200 text-sm">Total Leads</p><p className="text-2xl font-bold">{teamSummary.totalLeads}</p></div>
          <div className="text-center"><p className="text-indigo-200 text-sm">Converted</p><p className="text-2xl font-bold">{teamSummary.totalConverted}</p></div>
          <div className="text-center"><p className="text-indigo-200 text-sm">Revenue</p><p className="text-2xl font-bold">₹{teamSummary.totalRevenue.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-indigo-200 text-sm">Avg Conv %</p><p className="text-2xl font-bold">{teamSummary.avgConversion}%</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">Select Employee</h3>
          <div className="flex gap-2">
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="border rounded-lg px-4 py-2 w-full sm:w-64">
              <option value="">-- Select Employee --</option>
              {teamMembers.map(t => (<option key={t.id} value={`${t.first_name} ${t.last_name || ""}`.trim()}>{t.first_name} {t.last_name || ""} - {t.job_title || "Staff"}</option>))}
            </select>
            {selectedEmployee && <button onClick={() => setSelectedEmployee("")} className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Clear</button>}
          </div>
        </div>
      </div>

      {selectedEmployee && selectedEmpMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white"><p className="text-blue-100 text-sm">Total Leads</p><p className="text-2xl font-bold">{selectedEmpMetrics.totalLeads}</p><p className="text-blue-200 text-xs">Tel: {selectedEmpMetrics.telecalls} | Walk: {selectedEmpMetrics.walkins} | Field: {selectedEmpMetrics.fields}</p></div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white"><p className="text-green-100 text-sm">Converted</p><p className="text-2xl font-bold">{selectedEmpMetrics.leadsConverted}</p><p className="text-green-200 text-xs">{selectedEmpMetrics.conversionRate}% rate</p></div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white"><p className="text-purple-100 text-sm">Services Done</p><p className="text-2xl font-bold">{selectedEmpMetrics.services}</p><p className="text-purple-200 text-xs">{selectedEmpMetrics.tasksCompleted} tasks completed</p></div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white"><p className="text-orange-100 text-sm">Revenue</p><p className="text-2xl font-bold">₹{selectedEmpMetrics.serviceRevenue.toLocaleString()}</p><p className="text-orange-200 text-xs">Target: ₹{selectedEmpMetrics.targetAmount.toLocaleString()}</p></div>
        </div>
      )}

      {selectedEmployee && selectedEmpMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Performance Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: "Telecalls", value: selectedEmpMetrics.telecalls, fill: "#3B82F6" },
                { name: "Walkins", value: selectedEmpMetrics.walkins, fill: "#10B981" },
                { name: "Field", value: selectedEmpMetrics.fields, fill: "#8B5CF6" },
                { name: "Clients", value: selectedEmpMetrics.clients, fill: "#F59E0B" },
                { name: "Proposals", value: selectedEmpMetrics.proposals, fill: "#EC4899" },
                { name: "Contracts", value: selectedEmpMetrics.contracts, fill: "#06B6D4" },
                { name: "Services", value: selectedEmpMetrics.services, fill: "#84CC16" },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Target Achievement</h3>
            <div className="flex items-center justify-center h-[200px]">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={selectedEmpMetrics.targetRate >= 100 ? "#10B981" : selectedEmpMetrics.targetRate >= 50 ? "#F59E0B" : "#EF4444"} strokeWidth="10" strokeDasharray={`${selectedEmpMetrics.targetRate * 2.51} 251`} transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold">{selectedEmpMetrics.targetRate}%</span>
                  <span className="text-xs text-gray-500">Achieved</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div><p className="text-gray-500 text-sm">Target</p><p className="font-semibold">₹{selectedEmpMetrics.targetAmount.toLocaleString()}</p></div>
              <div><p className="text-gray-500 text-sm">Achieved</p><p className="font-semibold text-green-600">₹{selectedEmpMetrics.achievedAmount.toLocaleString()}</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">All Employees Comparison</h3>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded-lg px-3 py-1 text-sm">
            <option value="leads">Sort by Leads</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="conversion">Sort by Conversion</option>
            <option value="target">Sort by Target</option>
            <option value="tasks">Sort by Tasks</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr><th className="px-3 py-3 text-left">#</th><th className="px-3 py-3 text-left">Employee</th><th className="px-3 py-3 text-center">Position</th><th className="px-3 py-3 text-right">Tel</th><th className="px-3 py-3 text-right">Walk</th><th className="px-3 py-3 text-right">Field</th><th className="px-3 py-3 text-right">Leads</th><th className="px-3 py-3 text-right">Conv%</th><th className="px-3 py-3 text-right">Clients</th><th className="px-3 py-3 text-right">Services</th><th className="px-3 py-3 text-right">Revenue</th><th className="px-3 py-3 text-right">Target%</th></tr>
            </thead>
            <tbody>
              {sortedEmployeeData.map((emp, i) => (
                <tr key={i} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedEmployee === emp.name ? "bg-blue-50" : ""}`} onClick={() => setSelectedEmployee(emp.name)}>
                  <td className="px-3 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-3 font-medium text-blue-600">{emp.name}</td>
                  <td className="px-3 py-3 text-center">{emp.position}</td>
                  <td className="px-3 py-3 text-right">{emp.telecalls}</td>
                  <td className="px-3 py-3 text-right">{emp.walkins}</td>
                  <td className="px-3 py-3 text-right">{emp.fields}</td>
                  <td className="px-3 py-3 text-right font-semibold">{emp.totalLeads}</td>
                  <td className="px-3 py-3 text-right"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.conversionRate >= 50 ? "bg-green-100 text-green-700" : emp.conversionRate >= 25 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{emp.conversionRate}%</span></td>
                  <td className="px-3 py-3 text-right">{emp.clients}</td>
                  <td className="px-3 py-3 text-right">{emp.services}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-600">₹{emp.serviceRevenue.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.targetRate >= 100 ? "bg-green-100 text-green-700" : emp.targetRate >= 50 ? "bg-yellow-100 text-yellow-700" : emp.targetRate > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>{emp.targetRate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  const trendsConversionRate = overviewData.totalLeads > 0 ? Math.round((overviewData.convertedLeads / overviewData.totalLeads) * 100) : 0;

  const TrendsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          {["day", "week", "month", "year"].map(f => (
            <button key={f} onClick={() => handleFilterChange(f)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${filter === f && !showCustomDate ? "bg-white shadow text-blue-600" : "text-gray-500"}`}>
              {f === "day" ? "Day" : f === "week" ? "Week" : f === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCustomDate(!showCustomDate)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${showCustomDate ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        >
          <Calendar size={16} /> Custom Date
        </button>
        {showCustomDate && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow border">
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button onClick={handleCustomDateApply} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Apply</button>
          </div>
        )}
        <div className="ml-auto text-sm text-gray-500 flex items-center gap-2">
          <Calendar size={14} />
          Showing: <span className="font-semibold text-gray-700">{getDateRangeLabel()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 text-white"><p className="text-blue-100 text-sm">Total Sales</p><p className="text-2xl font-bold">₹{overviewData.totalSales.toLocaleString()}</p></div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white"><p className="text-green-100 text-sm">Total Leads</p><p className="text-2xl font-bold">{overviewData.totalLeads}</p></div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-4 text-white"><p className="text-purple-100 text-sm">Services</p><p className="text-2xl font-bold">{overviewData.totalServices}</p></div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl p-4 text-white"><p className="text-orange-100 text-sm">Revenue</p><p className="text-2xl font-bold">₹{overviewData.totalRevenue.toLocaleString()}</p></div>
        <div className="bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl p-4 text-white"><p className="text-cyan-100 text-sm">Conversion</p><p className="text-2xl font-bold">{trendsConversionRate}%</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Daily Leads & Services Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Leads" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Services" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Daily Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Area type="monotone" dataKey="Sales" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Leads" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Services" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="Revenue" fill="#8B5CF6" fillOpacity={0.3} stroke="#8B5CF6" />
              <Line type="monotone" dataKey="Sales" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b"><h3 className="text-lg font-semibold text-gray-700">Detailed Trends Breakdown</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr><th className="px-4 py-3 text-left">Month</th><th className="px-4 py-3 text-right">Sales (₹)</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3 text-right">Services</th><th className="px-4 py-3 text-right">Revenue (₹)</th><th className="px-4 py-3 text-right">Converted</th></tr>
            </thead>
            <tbody>
              {monthlyTrends.map((m, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-right text-blue-600">₹{m.Sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{m.Leads}</td>
                  <td className="px-4 py-3 text-right">{m.Services}</td>
                  <td className="px-4 py-3 text-right text-purple-600">₹{m.Revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><span className={`px-2 py-1 rounded-full text-xs font-medium ${m.Converted > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{m.Converted}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">Reports & Analytics</h2>
          <span className="text-sm text-gray-500">Dashboard &gt; Reports</span>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow mb-4 overflow-hidden">
        <div className="flex border-b flex-wrap">
          <button onClick={() => setActiveTab("overview")} className={`px-6 py-4 font-medium text-sm ${activeTab === "overview" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>Overview</button>
          <button onClick={() => setActiveTab("byEmployee")} className={`px-6 py-4 font-medium text-sm ${activeTab === "byEmployee" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>By Employee</button>
          <button onClick={() => setActiveTab("trends")} className={`px-6 py-4 font-medium text-sm ${activeTab === "trends" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>Trends</button>
        </div>
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "byEmployee" && <EmployeeTab />}
      {activeTab === "trends" && <TrendsTab />}
    </div>
  );
};

export default Reports;