import React, { useState, useEffect } from "react";
import { Search, X, Edit, Trash2, FileText, FileSignature, Users, UserCheck } from "lucide-react";
import "../Styles/tailwind.css";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { API } from "../config";

const Clients = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [convertedLeads, setConvertedLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/api/client`, config);
      setClients(response.data);
    } catch (err) {
      console.log("Fetch Error:", err);
    }
  };

  const fetchConvertedLeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/api/leads/converted`, config);
      setConvertedLeads(response.data);
    } catch (err) {
      console.log("Fetch Converted Leads Error:", err);
    }
  };

  const downloadExcel = () => {
    const data = filteredClients.length > 0 ? filteredClients : clients;
    if (!data.length) return alert("No client data to export");

    const headers = ["ID", "Name", "Email", "Phone", "City", "Service", "Source", "Status"];
    const rows = data.map(c => [
      c.id,
      c.name || "",
      c.email || "",
      c.phone || "",
      c.address || "",
      c.service || "",
      c.original_lead_type ? `${c.original_lead_type.charAt(0).toUpperCase() + c.original_lead_type.slice(1)} Lead` : "Direct",
      c.client_status || "active"
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchClients();
    fetchConvertedLeads();
  }, []);

  const deleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API}/api/client/${id}`, config);
      fetchClients();
      fetchConvertedLeads();
    } catch (err) {
      console.log("delete error", err);
    }
  };

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    address: "",
    service: "",
    gst_number: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const saveClient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEdit) {
        await axios.put(`${API}/api/client/${selectedClientId}`, form, config);
        alert("Client updated successfully");
      } else {
        await axios.post(`${API}/api/client`, form, config);
        alert("Client added successfully");
      }
      resetForm();
      setOpen(false);
      fetchClients();
    } catch (err) {
      console.log("Save/Edit Error:", err);
    }
  };

  const resetForm = () => {
    setForm({ name: "", company_name: "", email: "", phone: "", address: "", service: "", gst_number: "" });
    setIsEdit(false);
    setSelectedClientId(null);
  };

  const [isEdit, setIsEdit] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const openEditModal = (selectedClient) => {
    setForm({
      name: selectedClient.name || "",
      company_name: selectedClient.company_name || "",
      email: selectedClient.email || "",
      phone: selectedClient.phone || "",
      address: selectedClient.address || "",
      service: selectedClient.service || "",
      gst_number: selectedClient.gst_number || "",
    });
    setSelectedClientId(selectedClient.id);
    setIsEdit(true);
    setOpen(true);
  };

  useEffect(() => {
    if (open) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  const getSourceBadge = (source) => {
    const badges = {
      telecall: { bg: "bg-blue-100", text: "text-blue-700", label: "Tele Call" },
      walkin: { bg: "bg-green-100", text: "text-green-700", label: "Walk-in" },
      field: { bg: "bg-purple-100", text: "text-purple-700", label: "Field Visit" },
      direct: { bg: "bg-gray-100", text: "text-gray-700", label: "Direct" }
    };
    const badge = badges[source] || badges.direct;
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm);
    const matchesSource = filterSource === "all" || c.original_lead_type === filterSource;
    const isConverted = c.original_lead_id !== null && c.original_lead_type !== null;
    
    if (activeTab === "converted") return matchesSearch && matchesSource && isConverted;
    if (activeTab === "direct") return matchesSearch && matchesSource && !isConverted;
    return matchesSearch && matchesSource;
  });

  const convertedCount = clients.filter(c => c.original_lead_id !== null && c.original_lead_type !== null).length;
  const directCount = clients.filter(c => c.original_lead_id === null || c.original_lead_type === null).length;

  return (
    <div className="w-full min-h-screen p-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1694CE]">Clients</h1>
          <nav className="text-sm text-gray-500">
            <a href="/dashboard" className="hover:underline">Dashboard</a> &gt; Customers &gt; Clients
          </nav>
        </div>
        <button
          onClick={() => { resetForm(); setOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          + Add Client
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <Users size={16} /> All ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab("converted")}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${activeTab === "converted" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <UserCheck size={16} /> Converted Leads ({convertedCount})
        </button>
        <button
          onClick={() => setActiveTab("direct")}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${activeTab === "direct" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <Users size={16} /> Direct Clients ({directCount})
        </button>
      </div>

      <div className="bg-[#F3F8FA] p-4 rounded-xl flex justify-between items-center shadow mb-4">
        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow border w-80">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search Clients"
              className="outline-none text-sm w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Sources</option>
            <option value="telecall">Tele Call</option>
            <option value="walkin">Walk-in</option>
            <option value="field">Field Visit</option>
          </select>
        </div>

        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-800 transition shadow"
        >
          <span className="text-lg">↓</span> Download XL
        </button>
      </div>

      <div className="bg-white shadow rounded-xl overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-gray-600 uppercase text-xs border-b">
              <th className="px-4 py-3 border text-left">ID</th>
              <th className="px-4 py-3 border text-left">Name</th>
              <th className="px-4 py-3 border text-left">Email</th>
              <th className="px-4 py-3 border text-left">Phone</th>
              <th className="px-4 py-3 border text-left">City</th>
              <th className="px-4 py-3 border text-left">Service</th>
              <th className="px-4 py-3 border text-left">Source</th>
              <th className="px-4 py-3 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c) => (
              <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-4 py-3 border">{c.id}</td>
                <td className="px-4 py-3 border font-medium">{c.name}</td>
                <td className="px-4 py-3 border">{c.email}</td>
                <td className="px-4 py-3 border">{c.phone}</td>
                <td className="px-4 py-3 border">{c.address}</td>
                <td className="px-4 py-3 border">{c.service}</td>
                <td className="px-4 py-3 border">{getSourceBadge(c.original_lead_type || "direct")}</td>
                <td className="px-4 py-3 border text-center">
                  <div className="flex justify-center items-center gap-3">
                    <button
                      onClick={() => window.location.href = `/proposal?client_name=${encodeURIComponent(c.name)}&client_email=${encodeURIComponent(c.email || '')}`}
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Create Proposal"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => window.location.href = `/contract?client_name=${encodeURIComponent(c.name)}&client_email=${encodeURIComponent(c.email || '')}`}
                      className="text-green-600 hover:text-green-800 transition"
                      title="Create Contract"
                    >
                      <FileSignature size={18} />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Added By</span>
                      <span className="text-xs font-semibold text-blue-600">{c.creator_name || "Admin"}</span>
                    </div>
                    <button
                      onClick={() => openEditModal(c)}
                      className="text-amber-600 hover:text-amber-800 transition"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => deleteClient(c.id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No clients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{isEdit ? "Edit Client" : "Add Client"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={saveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={form.company_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City/Address</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Interests</label>
                <input
                  type="text"
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  name="gst_number"
                  value={form.gst_number}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
                >
                  {isEdit ? "Update Client" : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
