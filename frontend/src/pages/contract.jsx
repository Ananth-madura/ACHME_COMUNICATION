import React, { useState, useEffect } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, Trash2, Edit, FileText } from "lucide-react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

import { API } from "../config";

const Contracts = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const tabopen = () => {
    setOpen(true);
  };

  const [clientSearch, setClientSearch] = useState("");
  const [clientList, setClientList] = useState([]);

  const [projectNames, setProjectname] = useState("");
  const [contractName, setContracts] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [category, setCategory] = useState("Default");
  const [Amount, Setamount] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [selectedContaractId, setSelectedContractId] = useState(null);
  const [contractType, setContractType] = useState("Service"); // Service, AMC, ALC
  const [quotationId, setQuotationId] = useState("");

  const [contracts, setcontracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [quotations, setQuotations] = useState([]);

  const formatInvoiceId = (id) => `CO-${String(id).padStart(6, "0")}`;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN");

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/api/contract`, config);
      setcontracts(response.data);
    } catch (err) {
      console.log("Fetch Error:", err);
    }
  };

  const fetchQuotations = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/api/quotations`, config);
      setQuotations(response.data);
    } catch (err) {
      console.log("Fetch quotations error:", err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchQuotations();

    // Check for query params first (new workflow)
    const urlParams = new URLSearchParams(window.location.search);
    const qName = urlParams.get('client_name');

    if (qName) {
      setClientSearch(decodeURIComponent(qName));
      setContracts(`Contract for ${decodeURIComponent(qName)}`);
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setInvoiceDueDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      setOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check for prefill data from telecalling form
      const prefillData = sessionStorage.getItem("contract_prefill");
      if (prefillData) {
        try {
          const data = JSON.parse(prefillData);
          setClientSearch(data.customer_name || "");
          setContracts(data.customer_name ? `Contract for ${data.customer_name}` : "");
          setInvoiceDate(new Date().toISOString().slice(0, 10));
          setInvoiceDueDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
          setContractType("AMC");
          setCategory("AMC");
          setOpen(true);
          sessionStorage.removeItem("contract_prefill");
        } catch (e) {
          console.error("Prefill error:", e);
        }
      }
    }
  }, []);

  const searchClient = async (value) => {
    setClientSearch(value);
    if (!value) return setClientList([]);

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(
        `${API}/api/client/search?name=${value}`,
        config
      );
      setClientList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const selectClient = (client) => {
    setClientSearch(client.company_name || client.name);
    setClientList([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        client_company: clientSearch,
        template_names: projectNames,
        contract_title: contractName,
        start_date: invoiceDate,
        end_date: invoiceDueDate,
        amount_value: Amount,
        category,
        contract_type: contractType,
        quotation_id: quotationId,
      };

      if (isEdit && selectedContaractId) {
        await axios.put(
          `${API}/api/contract/${selectedContaractId}`,
          payload,
          config
        );
        alert("Contract Updated Successfully");
      } else {
        await axios.post(
          `${API}/api/contract/new`,
          payload,
          config
        );
        alert("Contract Created Successfully");
      }

      fetchContracts();
      resetForm();

    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Submission failed";
      alert(msg);
    }
  };

  const openEditModal = (p) => {
    setClientSearch(p.client_company || "");
    setProjectname(p.template_names || "");
    setContracts(p.contract_title || "");
    setInvoiceDate(p.start_date?.split("T")[0] || "");
    setInvoiceDueDate(p.end_date?.split("T")[0] || "");
    Setamount(p.amount_value || "");
    setCategory(p.category || "Default");
    setContractType(p.contract_type || "Service");
    setQuotationId(p.quotation_id || "");

    setSelectedContractId(p.id);
    setIsEdit(true);
    setOpen(true);
  };

  const handleQuotationConversion = (quotationId) => {
    const quotation = quotations.find(q => q.id === parseInt(quotationId));
    if (quotation) {
      setClientSearch(quotation.client_company || quotation.customer_name || "");
      setProjectname(quotation.project_name || quotation.template_names || "");
      setContracts(`Contract for ${quotation.project_name || quotation.template_names || "Service"}`);
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setInvoiceDueDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      Setamount(quotation.grand_total || quotation.amount_value || "");
      setCategory("AMC");
      setContractType("AMC");
      setQuotationId(quotationId);
    }
  };

  const resetForm = () => {
    setClientSearch("");
    setProjectname("");
    setContracts("");
    setInvoiceDate("");
    setInvoiceDueDate("");
    Setamount("");
    setCategory("Default");
    setContractType("Service");
    setQuotationId("");

    setIsEdit(false);
    setSelectedContractId(null);
    setOpen(false);
  };

  const deletePayment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contract?")) return;

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API}/api/contract/${id}`, config);
      fetchContracts();
    } catch (err) {
      console.error("DELETE ERROR:", err);
      alert("Delete failed");
    }
  };

  const convertToQuotation = (contract) => {
    sessionStorage.setItem("qt_prefill", JSON.stringify({
      customer_name: contract.client_company || "",
      mobile_number: contract.mobile_number || "",
      email: contract.email || "",
      location_city: contract.location_city || "",
      lead_id: contract.id || null,
      lead_type: "contract",
    }));
    window.location.href = "/proposal";
  };

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">CONTRACTS</h2>
          <nav className="text-sm text-gray-500">
            <a href="/dashboard" className="hover:underline">Dashboard</a> &gt; Contracts
          </nav>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border shadow-sm w-64 h-10">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search company..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-full bg-transparent"
            />
          </div>

          <button
            onClick={() => { resetForm(); setOpen(true); }}
            className="bg-[#FF3355] text-white w-10 h-10 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848] transition"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-gray-600 uppercase text-xs border-b">
              <th className="px-4 py-3 border">ID</th>
              <th className="px-4 py-3 border">Date</th>
              <th className="px-4 py-3 border">Client</th>
              <th className="px-4 py-3 border">Contract Title</th>
              <th className="px-4 py-3 border">Type</th>
              <th className="px-4 py-3 border">Value</th>
              <th className="px-4 py-3 border">Status</th>
              <th className="px-4 py-3 border text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-gray-400">
                  No contracts found
                </td>
              </tr>
            ) : (
              contracts.filter(inv => inv.client_company?.toLowerCase().includes(searchTerm.toLowerCase())).map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition border-b border-gray-100">
                  <td className="px-4 py-3 border">{formatInvoiceId(inv.id)}</td>
                  <td className="px-4 py-3 border">{formatDate(inv.start_date)}</td>
                  <td className="px-4 py-3 border font-medium">{inv.client_company}</td>
                  <td className="px-4 py-3 border">{inv.contract_title}</td>
                  <td className="px-4 py-3 border">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${inv.contract_type === 'AMC' ? 'bg-blue-100 text-blue-700' : inv.contract_type === 'ALC' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {inv.contract_type || 'Service'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border font-bold">₹{Number(inv.amount_value || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 border text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${inv.amount_value > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {inv.amount_value > 0 ? "Active" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 border text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => convertToQuotation(inv)} title="Convert to Quotation" className="text-blue-600 hover:text-blue-800 transition">
                        <FileText size={18} />
                      </button>
                      <button onClick={() => openEditModal(inv)} className="text-amber-600 hover:text-amber-800 transition">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => deletePayment(inv.id)} className="text-red-500 hover:text-red-700 transition">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{isEdit ? "Edit Contract" : "New Contract"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Company *</label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => searchClient(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Search Client Company"
                  required
                />
                {clientList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border shadow-xl rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
                    {clientList.map((c, index) => (
                      <div
                        key={index}
                        onClick={() => selectClient(c)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      >
                        {c.company_name || c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Title</label>
                  <input
                    type="text"
                    value={contractName}
                    onChange={(e) => setContracts(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type *</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="Service">Service Contract</option>
                    <option value="AMC">AMC (Annual Maintenance)</option>
                    <option value="ALC">ALC (Annual Labour)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Value *</label>
                  <input
                    type="number"
                    value={Amount}
                    onChange={(e) => Setamount(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="Default">New</option>
                    <option value="AMC">Converted</option>
                    <option value="ALC">Disqualified</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg"
                >
                  {isEdit ? "Update Contract" : "Create Contract"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200 transition"
                >
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

export default Contracts;
