import React, { useState, useEffect } from "react";
import { Search, X, Edit, Trash2 } from "lucide-react";
import "../Styles/tailwind.css";
import axios from "axios";

const API_BACKEND = "http://localhost:5000";

const Clients = () => {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit
  const [isEdit, setIsEdit] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_BACKEND}/api/client`);
      setClients(response.data);
    } catch (err) {
      try {
        const response = await axios.get("/api/client");
        setClients(response.data);
      } catch (err2) {
        console.log("Fetch Error:", err2);
      }
    }
  };

  const downloadExcel = () => {
    const data = filteredClients.length > 0 ? filteredClients : clients;
    if (!data.length) return alert("No client data to export");

    // Match exactly the table columns shown: ID, Name, Email, Phone, City, Service
    const headers = ["ID", "Name", "Email", "Phone", "City", "Service"];
    const rows = data.map(c => [
      c.id,
      c.name || "",
      c.email || "",
      c.phone || "",
      c.address || "",
      c.service || ""
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
  }, []);

  //  delete client
  const deleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/client/${id}`);
      fetchClients();
    } catch (err) {
      console.log("delete error", err);
    }
  };

  // form State
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Save
  const saveClient = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await axios.put(`http://localhost:3000/api/client/${selectedClientId}`, form);
        alert("Client updated successfully");
      } else {
        await axios.post("http://localhost:3000/api/client", form);
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
    setForm({ name: "", email: "", phone: "", address: "", service: "" });
    setIsEdit(false);
    setSelectedClientId(null);
  };

  const openEditModal = (selectedClient) => {
    setForm({
      name: selectedClient.name || "",
      email: selectedClient.email || "",
      phone: selectedClient.phone || "",
      address: selectedClient.address || "",
      service: selectedClient.service || "",
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

  // Filter clients by name
  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="w-full h-[111vh]">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-[#1694CE]">Clients</h1>
        <a className="text-sm text-gray-500" href="/dashboard">
          Dashboard &gt; Customers &gt; Clients
        </a>
      </div>

      {/* ----------------- FILTER & SEARCH BAR ----------------- */}
      <div className="bg-[#F3F8FA] p-4 rounded-xl flex justify-between items-center shadow mb-4">
        {/* Search */}
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow border w-80">
          <Search size={18} className="text-gray-500" />
          <label htmlFor="client-search" className="sr-only">Search Clients</label>
          <input
            id="client-search"
            type="text"
            placeholder="Search Clients"
            className="outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Download XL */}
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-800 transition shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <span className="text-lg">↓</span> Download XL
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl mt-[20px] overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#f8faf9]">
            <tr className="text-black font-[Times-New-Roman] uppercase text-xs border-b">
              <th className="px-4 py-3 border text-left">ID</th>
              <th className="px-4 py-3 border text-left">Name</th>
              <th className="px-4 py-3 border text-left">Email</th>
              <th className="px-4 py-3 border text-left">Phone</th>
              <th className="px-4 py-3 border text-left">City</th>
              <th className="px-4 py-3 border text-left">Service</th>
              <th className="px-4 py-3 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-[Times-New-Roman]">
            {filteredClients.map((c) => (
              <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-4 py-3 border">{c.id}</td>
                <td className="px-4 py-3 border font-medium">{c.name}</td>
                <td className="px-4 py-3 border">{c.email}</td>
                <td className="px-4 py-3 border">{c.phone}</td>
                <td className="px-4 py-3 border">{c.address}</td>
                <td className="px-4 py-3 border">{c.service}</td>
                <td className="px-4 py-3 border">
                  <div className="flex justify-center">
                    <button
                      type="button"
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
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No clients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
};

export default Clients;
