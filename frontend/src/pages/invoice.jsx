import React, { useState, useEffect } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, Edit2, Trash2 } from "lucide-react";
import axios from "axios";

const Invoice = () => {
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
      const res = await axios.get("http://localhost:3000/api/invoice/with-payments");
      setInvoices(res.data);
    } catch (err) { console.log("Fetch Error:", err); }
  };

  useEffect(() => { fetchInvoices(); }, []);

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
      const res = await axios.get(`http://localhost:3000/api/client/search?name=${value}`);
      setClientList(res.data);
    } catch (err) { console.log(err); }
  };

  const selectClient = (client) => {
    setClientSearch(client.company_name);
    setClientList([]);
  };

  // Save new client only (step 1 when clientType === "new")
  const saveNewClient = async () => {
    if (!clientForm.name || !clientForm.email) {
      return alert("Name and Email are required");
    }
    try {
      await axios.post("http://localhost:3000/api/client", clientForm);
      // Auto-select the saved company name
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
      if (editId) {
        await axios.put(`http://localhost:3000/api/invoice/${editId}`, {
          client_company: clientSearch, project_names: projectNames,
          invoice_date: invoiceDate, invoice_duedate: invoiceDueDate, category,
        });
        alert("Invoice updated successfully");
      } else {
        if (!clientSearch) return alert("Please select or add a client first");
        await axios.post("http://localhost:3000/api/invoice/new", {
          client_company: clientSearch, project_names: projectNames,
          invoice_date: invoiceDate, invoice_duedate: invoiceDueDate, category,
        });
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
      await axios.delete(`http://localhost:3000/api/invoice/${id}`);
      fetchInvoices();
    } catch (err) { alert("Delete failed"); }
  };

  const filtered = invoices.filter(inv =>
    inv.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="invoices-main-tab">
      <div className="invoice-heading-tab flex gap-4 justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">INVOICES</h2>
          <span className="text-sm text-gray-500">APP &gt; SALES</span>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-lg border h-9 mt-3">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Search by company name..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-44 bg-transparent" />
          </div>
          <div className="mt-2">
            <button onClick={() => { resetForm(); setOpen(true); }}
              className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848]">
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <div className={`${open ? "fixed" : "hidden"} inset-0 bg-black/40 flex items-center justify-center z-50`}>
      {/* <div className={`overlay ${open ? "show" : ""} overflow-y-auto`}> */}
        {/* <div className="task-application bg-white shadow ml-[18%] w-[70%] mb-[50px] overflow-y-auto p-5 rounded-lg"> */}
         <div className="bg-white shadow w-[90%] md:w-[70%] max-h-[90vh] overflow-y-auto p-5 rounded-lg">
         
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              {editId ? "Edit Invoice" : "Create A New Invoice"}
            </h2>
            <span className="x-icon cursor-pointer" onClick={resetForm}><X /></span>
          </div>

          <form className="invoice-form p-6 space-y-6 relative" onSubmit={handleSubmit}>
            <div>
              <div className="grid grid-cols-4 items-center gap-6">
                <label className="text-sm text-gray-600">Client<span className="text-red-500">*</span></label>
                {clientType === "existing" && (
                  <input type="text" value={clientSearch} onChange={e => searchClient(e.target.value)}
                    className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-full"
                    placeholder="Search Client Company" />
                )}
              </div>
              {clientList.length > 0 && (
                <div className="absolute bg-white ml-[190px] border shadow-md mt-1 w-[300px] z-10">
                  {clientList.map((c, i) => (
                    <p key={i} onClick={() => selectClient(c)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                      {c.company_name}
                    </p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-6 mt-4">
                <label className="text-sm text-gray-600">Project</label>
                <input type="text" value={projectNames} onChange={e => setProjectname(e.target.value)}
                  className={`col-span-3 border rounded-md px-3 py-2 outline-none w-full ${clientType === "new" ? "bg-gray-200 cursor-not-allowed" : "bg-white"}`}
                  disabled={clientType === "new"} />
              </div>
            </div>
            {clientType === "new" && (
              <div className="bg-gray-100 p-6 rounded-lg space-y-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-blue-700">Step 1: Add New Client</p>
                  {clientSaved && <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">✓ Client saved</span>}
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={clientForm.name}
                    onChange={e => setClientForm({...clientForm, name: e.target.value})}
                    onKeyDown={e => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                    placeholder="e.g. Ravi Kumar"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" required />
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">Company Name</label>
                  <input type="text" value={clientForm.company_name}
                    onChange={e => setClientForm({...clientForm, company_name: e.target.value})}
                    placeholder="e.g. Madhura Technologies"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" />
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={clientForm.email}
                    onChange={e => setClientForm({...clientForm, email: e.target.value})}
                    placeholder="e.g. ravi@example.com"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" required />
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">Phone</label>
                  <input type="text" value={clientForm.phone}
                    onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setClientForm({...clientForm, phone: e.target.value}); }}
                    maxLength={13} inputMode="numeric" placeholder="e.g. 9876543210"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" />
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">Address</label>
                  <input type="text" value={clientForm.address}
                    onChange={e => setClientForm({...clientForm, address: e.target.value})}
                    placeholder="e.g. 12 Main Street"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" />
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">State</label>
                  <input type="text" value={clientForm.state}
                    onChange={e => setClientForm({...clientForm, state: e.target.value})}
                    placeholder="e.g. Tamil Nadu"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" />
                </div>

                <div className="flex items-center gap-6">
                  <label className="w-40 text-sm text-gray-700">Pincode</label>
                  <input type="text" value={clientForm.pincode}
                    onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setClientForm({...clientForm, pincode: e.target.value}); }}
                    maxLength={6} inputMode="numeric" placeholder="e.g. 641001"
                    className="flex-1 border rounded-lg px-3 py-2 outline-none bg-white" />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="button" onClick={saveNewClient}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold">
                    Save Client & Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 label when client is saved */}
            {clientSaved && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
                ✓ Client "<strong>{clientSearch}</strong>" selected. Now fill in the invoice details below.
              </div>
            )}

            {!editId && (
              <div className="text-sm text-gray-500 text-right">
                <span onClick={() => setClientType("new")} className="cursor-pointer hover:text-blue-600">New Client</span>
                {" | "}
                <span onClick={() => setClientType("existing")} className="cursor-pointer bg-gray-300 text-white px-2 py-1 rounded">Existing Client</span>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-6">
              <label className="text-sm text-gray-600">Invoice Date<span className="text-red-500">*</span></label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="col-span-3 border rounded-md px-3 py-2 outline-none w-full" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <label className="text-sm text-gray-600">Due Date<span className="text-red-500">*</span></label>
              <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} className="col-span-3 border rounded-md px-3 py-2 outline-none" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <label className="text-sm text-gray-600">Category<span className="text-red-500">*</span></label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white">
                <option value="Default">Default</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                {editId ? "Update" : "Submit"}
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-red-500">Close</button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl overflow-x-auto mt-5">
        <table className="w-full text-sm border border-gray-300">
          <thead className="bg-[#f8faf9]">
            <tr className="text-black uppercase text-xs">
              <th className="border px-4 py-3 text-center">ID</th>
              <th className="border px-4 py-3">Invoice Date</th>
              <th className="border px-4 py-3">Company Name</th>
              <th className="border px-4 py-3">Project Title</th>
              <th className="border px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-center">
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="py-6 text-gray-400">No invoices found</td></tr>
            ) : (
              filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition border-b">
                  <td className="border px-3 py-3">{formatInvoiceId(inv.id)}</td>
                  <td className="border px-4 py-2">{formatDate(inv.invoice_date)}</td>
                  <td className="border px-4 py-2">{inv.client_company}</td>
                  <td className="border px-4 py-2">{inv.project_names || "---"}</td>
                  <td className="border px-4 py-2">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(inv)} title="Edit" className="text-green-600 hover:text-green-800 transition">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(inv.id)} title="Delete" className="text-red-500 hover:text-red-700 transition">
                        <Trash2 size={16} />
                      </button>
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
