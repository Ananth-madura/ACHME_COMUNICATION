import React, { useState, useEffect } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, Edit2, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

import { API } from "../config";

const Invoice = () => {
  const { user } = useAuth();
  const canEditDelete = user?.role === "admin" || user?.role === "subadmin";
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [clientSearch, setClientSearch] = useState("");
  const [clientList, setClientList] = useState([]);
  const [clientType, setClientType] = useState("existing");

  const [companyName, setCompanyName] = useState("");
  const [clientForm, setClientForm] = useState({
    name: "", company_name: "", email: "", phone: "", address: "", state: "", pincode: "",
  });

  const [projectNames, setProjectname] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [category, setCategory] = useState("Default");

  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const formatInvoiceId = (id) => `INV-${String(id).padStart(6, "0")}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN") : "---";

  const [clientSaved, setClientSaved] = useState(false);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API}/api/invoice/with-payments`, config);
      setInvoices(res.data);
    } catch (err) { console.log("Fetch Error:", err); }
  };

  useEffect(() => {
    fetchInvoices();

    // Check for query params
    const urlParams = new URLSearchParams(window.location.search);
    const qName = urlParams.get('client_name');
    if (qName) {
      setClientSearch(decodeURIComponent(qName));
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const resetForm = () => {
    setClientSearch(""); setClientList([]); setClientType("existing");
    setClientForm({ name: "", company_name: "", email: "", phone: "", address: "", state: "", pincode: "" });
    setProjectname(""); setInvoiceDate(""); setInvoiceDueDate(""); setCategory("Default");
    setEditId(null); setClientSaved(false); setOpen(false);
  };

  const openEdit = async (inv) => {
    setEditId(inv.id);
    setClientSearch(inv.client_company || "");
    setProjectname(inv.project_names || "");
    setInvoiceDate(inv.invoice_date ? inv.invoice_date.split("T")[0] : "");
    setInvoiceDueDate(inv.invoice_duedate ? inv.invoice_duedate.split("T")[0] : "");
    setCategory(inv.category || "Default");
    setClientType("existing");
    setOpen(true);
  };

  const searchClient = async (value) => {
    setClientSearch(value);
    if (!value) return setClientList([]);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API}/api/client/search?name=${value}`, config);
      setClientList(res.data);
    } catch (err) { console.log(err); }
  };

  const selectClient = (client) => {
    setClientSearch(client.company_name || client.name);
    setClientList([]);
  };

  const saveNewClient = async () => {
    if (!clientForm.name || !clientForm.email) {
      return alert("Name and Email are required");
    }
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API}/api/client`, clientForm, config);
      setClientSearch(clientForm.company_name || clientForm.name);
      setClientType("existing");
      setClientSaved(true);
      alert(`Client "${clientForm.company_name || clientForm.name}" saved! Now fill in the invoice details and submit.`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save client");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editId) {
        await axios.put(`${API}/api/invoice/${editId}`, {
          client_company: clientSearch, project_names: projectNames,
          invoice_date: invoiceDate, invoice_duedate: invoiceDueDate, category,
        }, config);
        alert("Invoice updated successfully");
      } else {
        if (!clientSearch) return alert("Please select or add a client first");
        await axios.post(`${API}/api/invoice/new`, {
          client_company: clientSearch, project_names: projectNames,
          invoice_date: invoiceDate, invoice_duedate: invoiceDueDate, category,
        }, config);
        alert("Invoice created successfully");
      }
      fetchInvoices();
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "Submission failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API}/api/invoice/${id}`, config);
      fetchInvoices();
    } catch (err) { alert("Delete failed"); }
  };

  const filtered = invoices.filter(inv =>
    inv.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">INVOICES</h2>
          <nav className="text-sm text-gray-500">
            <a href="/dashboard" className="hover:underline">Dashboard</a> &gt; Invoices
          </nav>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border shadow-sm w-64 h-10">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Search company..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-full bg-transparent" />
          </div>
          <button onClick={() => { resetForm(); setOpen(true); }}
            className="bg-[#FF3355] text-white w-10 h-10 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848] transition">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{editId ? "Edit Invoice" : "New Invoice"}</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Company *</label>
                {clientType === "existing" && (
                  <>
                    <input type="text" value={clientSearch} onChange={e => searchClient(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
                      placeholder="Search Client Company" />
                    {clientList.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border shadow-xl rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
                        {clientList.map((c, i) => (
                          <div key={i} onClick={() => selectClient(c)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm">
                            {c.company_name || c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!editId && (
                <div className="flex justify-end gap-4 text-xs font-medium uppercase tracking-wider">
                  <button type="button" onClick={() => setClientType("new")} className={`px-3 py-1 rounded ${clientType === "new" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>New Client</button>
                  <button type="button" onClick={() => setClientType("existing")} className={`px-3 py-1 rounded ${clientType === "existing" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Existing Client</button>
                </div>
              )}

              {clientType === "new" && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 uppercase">Step 1: Add New Client</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Contact Name *" className="border rounded-lg px-3 py-2 text-sm outline-none bg-white" required />
                    <input type="text" value={clientForm.company_name} onChange={e => setClientForm({ ...clientForm, company_name: e.target.value })} placeholder="Company Name" className="border rounded-lg px-3 py-2 text-sm outline-none bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} placeholder="Email *" className="border rounded-lg px-3 py-2 text-sm outline-none bg-white" required />
                    <input type="text" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="Phone" className="border rounded-lg px-3 py-2 text-sm outline-none bg-white" />
                  </div>
                  <button type="button" onClick={saveNewClient} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition">Save Client & Continue</button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input type="text" value={projectNames} onChange={e => setProjectname(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition" required />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg">
                  {editId ? "Update Invoice" : "Create Invoice"}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-xl overflow-hidden mt-6">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-gray-600 uppercase text-xs border-b">
              <th className="px-4 py-3 border">ID</th>
              <th className="px-4 py-3 border">Date</th>
              <th className="px-4 py-3 border">Client</th>
              <th className="px-4 py-3 border">Project Title</th>
              <th className="px-4 py-3 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="py-12 text-center text-gray-400">No invoices found</td></tr>
            ) : (
              filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition border-b border-gray-100">
                  <td className="px-4 py-3 border">{formatInvoiceId(inv.id)}</td>
                  <td className="px-4 py-3 border">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 border font-medium">{inv.client_company}</td>
                  <td className="px-4 py-3 border">{inv.project_names || "---"}</td>
                  <td className="px-4 py-3 border text-center">
                    <div className="flex justify-center gap-3">
                      {canEditDelete && <button onClick={() => openEdit(inv)} className="text-amber-600 hover:text-amber-800 transition">
                        <Edit2 size={16} />
                      </button>}
                      {canEditDelete && <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700 transition">
                        <Trash2 size={16} />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoice;
