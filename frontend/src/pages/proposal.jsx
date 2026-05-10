import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, X, Edit2, MinusCircle, PlusCircle, Trash2, Mail, MapPin, ChevronDown, History } from "lucide-react";
import { calculateItemTotal, calculateTotals } from "../utils/invoicecal";
import axios from "axios";
import html2pdf from "html2pdf.js";
import "../Styles/tailwind.css";
import Invoice from "../components/invoicetemplate";

const UOM_OPTIONS = ["Nos", "Units", "Pieces", "Boxes", "Sets", "Meters", "Kg", "Liters"];
const BRANCH_OPTIONS = [
  { value: "Chennai", label: "Chennai", state: "Tamil Nadu" },
  { value: "Coimbatore", label: "Coimbatore", state: "Tamil Nadu" },
  { value: "Bangalore", label: "Bangalore", state: "Karnataka" },
];
const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];
const VALIDITY_OPTIONS = ["2 days", "5 days", "10 days", "15 days", "30 days"];
const PAYMENT_OPTIONS = ["100% Advance", "Payment Against Delivery", "15 Days", "30 Days", "45 Days", "Custom"];
const WARRANTY_OPTIONS = ["No Warranty", "Testing Warranty", "1 Month", "3 Months", "6 Months", "12 Months", "24 Months", "36 Months", "OEM Warranty", "Supplier Warranty", "OEM Hardware Warranty", "No Software Warranty"];

const GST_STATE_MAP = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand",
  "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar",
  "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Dadra and Nagar Haveli and Daman and Diu", "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

const BANK_DETAILS = [
  { id: "1", company: "Achme Communication", bank: "KOTAK MAHINDRA BANK", account: "12345667", ifsc: "34DJFHJDH", branch: "Test, Coimbatore" },
  { id: "2", company: "Achme Communication", bank: "DUMMY BANK", account: "00000000", ifsc: "DUMMY001", branch: "Dummy Branch" }
];

const emptyExtra = () => ({
  from_address_id: "", from_address_custom: "",
  client_company: "", client_address1: "", client_address2: "",
  client_city: "", client_state: "", client_pincode: "", client_country: "India",
  tax_type: "GST18", custom_tax: "",
  exec_name: "", exec_phone: "", exec_email: "",
  terms_general: false, terms_tax: false,
  terms_project_period: "30-60 days from Purchase Order date",
  terms_validity: "15 days",
  terms_separate_orders: { material: false, installation: false, usd: false, boq: false },
  terms_payment: "", terms_payment_custom: "", terms_warranty: "",
  supplier_branch: "Chennai",
  bank_details_id: "1",
  bank_company: "Achme Communication",
  bank_name: "KOTAK MAHINDRA BANK",
  bank_account: "12345667",
  bank_ifsc: "34DJFHJDH",
  bank_branch: "Test, Coimbatore",
  custom_terms: "",
});

const Proposal = () => {
  const [quotationDataList, setQuotationDataList] = useState([]);
  const [fromAddresses, setFromAddresses] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [showinvoice, setShowInvoice] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailSending, setMailSending] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("");
  const [newAddrText, setNewAddrText] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState([]);

  // ── History modal state ──────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyCustomerName, setHistoryCustomerName] = useState("");
  const [historySelectedId, setHistorySelectedId] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyRootId, setHistoryRootId] = useState(null);

  const [items, setItems] = useState([{ name: "", brand_model: "", hsn_sac: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
  const [customer, setCustomer] = useState({ customer_name: "", mobile_number: "", email: "", gst_number: "", location_city: "" });
  const [quotationData, setQuotationData] = useState({ quotation_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() });
  const [extra, setExtra] = useState(emptyExtra());
  const [editingIndex, setEditingIndex] = useState(null);

  const invoiceRef = useRef(null);

  const formatQTNumber = (id, dateStr) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    return `QT-${year}-${String(id).padStart(3, "0")}`;
  };

  const formatSubQTNumber = (rootId, version, dateStr) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    return `QT-${year}-${String(rootId).padStart(3, "0")}-${version}`;
  };

  useEffect(() => {
    fetchQuotationDataList();
    fetchFromAddresses();
    // Pick up lead prefill from telecalling/walkin/field pages
    const prefill = sessionStorage.getItem("qt_prefill");
    if (prefill) {
      try {
        const p = JSON.parse(prefill);
        setCustomer(c => ({
          ...c,
          customer_name: p.customer_name || "",
          mobile_number: p.mobile_number || "",
          email: p.email || "",
          location_city: p.location_city || "",
        }));
        setExtra(ex => ({ ...ex, client_city: p.location_city || "" }));
        setOpen(true);
        sessionStorage.removeItem("qt_prefill");
      } catch (_) {}
    }
    // Pick up contract prefill from AMC page
    const contractPrefill = sessionStorage.getItem("quotation_prefill");
    if (contractPrefill) {
      try {
        const p = JSON.parse(contractPrefill);
        setCustomer(c => ({
          ...c,
          customer_name: p.customer_name || "",
          mobile_number: p.mobile_number || "",
          email: p.email || "",
          location_city: p.location_city || "",
        }));
        setExtra(ex => ({ 
          ...ex, 
          client_city: p.location_city || "",
          exec_name: p.contract_title || "",
        }));
        setOpen(true);
        sessionStorage.removeItem("quotation_prefill");
      } catch (_) {}
    }
  }, []);

  const fetchQuotationDataList = async () => {
    try { const res = await axios.get("http://localhost:3000/api/quotations"); setQuotationDataList(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchFromAddresses = async () => {
    try { const res = await axios.get("http://localhost:3000/api/quotations/from-addresses"); setFromAddresses(res.data); }
    catch (err) { console.error(err); }
  };

  const handleAddAddress = async () => {
    if (!newAddrLabel || !newAddrText) return alert("Label and address required");
    try {
      const res = await axios.post("http://localhost:3000/api/quotations/from-addresses", { label: newAddrLabel, address: newAddrText });
      setFromAddresses(prev => [...prev, res.data]);
      setNewAddrLabel(""); setNewAddrText(""); setShowAddAddress(false);
    } catch (err) { alert("Failed to add address"); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Remove this address?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/quotations/from-addresses/${id}`);
      setFromAddresses(prev => prev.filter(a => a.id !== id));
      if (extra.from_address_id === id) setExtra(e => ({ ...e, from_address_id: "" }));
    } catch (err) { alert("Failed to delete address"); }
  };

  const handleEdit = async (id) => {
    const res = await axios.get(`http://localhost:3000/api/quotations/${id}`);
    const rows = res.data;
    const h = rows[0];
    setCustomer({ customer_name: h.customer_name, mobile_number: h.mobile_number, email: h.email, gst_number: h.gst_number || "", location_city: h.location_city });
    setQuotationData({ quotation_date: h.quotation_date?.split("T")[0] || h.invoice_date?.split("T")[0] || "" });
    const loadedItems = rows.map(r => ({ name: r.description, brand_model: r.brand_model || "", hsn_sac: r.hsn_sac || "", uom: r.uom || "Nos", price: Number(r.price) || 0, qty: Number(r.quantity) || 1, tax: 18, discount: Number(r.discount) || 0 }));
    setItems(loadedItems);
    setDescInput(loadedItems.map(i => i.name).join(", "));
    setExtra({
      from_address_id: h.from_address_id || "", from_address_custom: h.from_address_custom || "",
      client_company: h.client_company || "", client_address1: h.client_address1 || "",
      client_address2: h.client_address2 || "", client_city: h.client_city || "",
      client_state: h.client_state || "", client_pincode: h.client_pincode || "", client_country: h.client_country || "India",
      tax_type: h.tax_type || "GST18", custom_tax: h.custom_tax || "",
      exec_name: h.exec_name || "", exec_phone: h.exec_phone || "", exec_email: h.exec_email || "",
      terms_general: !!h.terms_general, terms_tax: !!h.terms_tax,
      terms_project_period: h.terms_project_period || "30-60 days from Purchase Order date",
      terms_validity: h.terms_validity || "15 days",
      terms_separate_orders: h.terms_separate_orders ? JSON.parse(h.terms_separate_orders) : { material: false, installation: false, usd: false, boq: false },
      terms_payment: h.terms_payment || "", terms_payment_custom: h.terms_payment_custom || "",
      terms_warranty: h.terms_warranty || "",
      supplier_branch: h.supplier_branch || "Chennai",
    });
    setEditId(id);
    setOpen(true);
  };

  const getTaxCalculations = () => {
    if (extra.terms_tax) {
      const subtotal = items.reduce((acc, i) => acc + (i.price * (i.qty || i.quantity || 0)), 0);
      const totalDiscount = items.reduce((acc, i) => acc + (i.discount || 0), 0);
      const grandTotal = subtotal - totalDiscount;
      return { subtotal, total_discount: totalDiscount, total_cgst: 0, total_sgst: 0, total_igst: 0, grand_total: grandTotal };
    }
    const branchState = (BRANCH_OPTIONS.find(b => b.value === extra.supplier_branch)?.state || "Tamil Nadu").toLowerCase().trim();
    const clientState = (extra.client_state || "").toLowerCase().trim();
    const isSameState = branchState === clientState && clientState !== "";

    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach(item => {
      const itemSubtotal = item.price * item.qty;
      const discountAmount = item.discount || 0;
      const taxableAmount = itemSubtotal - discountAmount;
      const taxRate = item.tax || 0;
      const taxAmount = (taxableAmount * taxRate) / 100;

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;

      if (isSameState) {
        totalCGST += taxAmount / 2;
        totalSGST += taxAmount / 2;
      } else {
        totalIGST += taxAmount;
      }
    });

    const grandTotal = subtotal - totalDiscount + totalCGST + totalSGST + totalIGST;
    return { subtotal, total_discount: totalDiscount, total_cgst: totalCGST, total_sgst: totalSGST, total_igst: totalIGST, grand_total: grandTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quotationData.quotation_date) return alert("Please select date");
    if (items.some(i => !i.name.trim())) return alert("Description cannot be empty");
    try {
      const totals = getTaxCalculations();
      const payload = {
        customer,
        invoice: {
          invoice_date: quotationData.quotation_date,
          quotation_date: quotationData.quotation_date,
          subtotal: totals.subtotal, total_discount: totals.total_discount,
          total_cgst: totals.total_cgst, total_sgst: totals.total_sgst, total_igst: totals.total_igst,
          total_tax: totals.total_cgst + totals.total_sgst + totals.total_igst, grand_total: totals.grand_total,
        },
        items: items.map(i => ({
          description: i.name, brand_model: i.brand_model, hsn_sac: i.hsn_sac, uom: i.uom,
          price: i.price, quantity: i.qty, tax: i.tax, discount: i.discount, subtotal: calculateItemTotal(i),
        })),
        extra,
      };
      if (editId) {
        const res = await axios.put(`http://localhost:3000/api/quotations/${editId}`, payload);
        // Backend creates a new version — refresh list and close
        alert(`Version ${res.data.version || ""} saved successfully`);
      } else {
        await axios.post("http://localhost:3000/api/quotations/create", payload);
        alert("Created successfully");
      }
      setOpen(false); resetForm(); fetchQuotationDataList();
    } catch (err) { console.error(err); alert("Error saving Quotation"); }
  };

  const handleAddItem = () => {
    if (!descInput.trim()) return;
    const newItem = { name: descInput, brand_model: "", hsn_sac: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 };
    
    if (editingIndex !== null) {
      const updated = [...items];
      updated[editingIndex] = { ...updated[editingIndex], name: descInput };
      setItems(updated);
      setEditingIndex(null);
    } else {
      setItems(prev => {
        if (prev.length === 1 && !prev[0].name.trim()) return [newItem];
        return [...prev, newItem];
      });
    }
    setDescInput("");
  };

  const resetForm = () => {
    setCustomer({ customer_name: "", mobile_number: "", email: "", gst_number: "", location_city: "" });
    setItems([{ name: "", brand_model: "", hsn_sac: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
    setDescInput("");
    setQuotationData({ quotation_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() });
    setExtra(emptyExtra());
    setEditId(null);
    setEditingIndex(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return alert("Select an item to delete");
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/quotations/${selectedId}`);
      setSelectedId(null); fetchQuotationDataList();
    } catch (error) { console.error(error); }
  };

  const openMailModal = () => {
    if (!selectedId) return alert("Select an invoice to send");
    const inv = quotationDataList.find(p => p.id === selectedId);
    setMailTo(inv?.email || "");
    setMailSubject(`Proposal ${formatQTNumber(selectedId, inv?.quotation_date || inv?.invoice_date)}`);
    setMailOpen(true);
  };

  const handleSendEmail = async () => {
    if (!mailTo) return alert("Please enter recipient email");
    setMailSending(true);
    try {
      await axios.post(`http://localhost:3000/api/quotations/send-email/${selectedId}`, { to: mailTo, subject: mailSubject });
      alert("Email sent successfully"); setMailOpen(false);
    } catch (error) { alert(error.response?.data?.message || "Failed to send email"); }
    finally { setMailSending(false); }
  };

  const handleDescInput = (value) => {
    setDescInput(value);
  };

  // ── Open history modal for a quotation's customer ────────────────────────
  const openHistory = async (e, quotationId, customerName) => {
    e.stopPropagation();
    try {
      const res = await axios.get(`http://localhost:3000/api/quotations/customer-history/${quotationId}`);
      setHistoryList(res.data);
      setHistoryCustomerName(customerName);
      setHistorySelectedId(null);
      setHistorySearch("");
      // Root id: if current row has parent_id use that, else use quotationId itself
      const currentRow = quotationDataList.find(p => p.id === quotationId);
      setHistoryRootId(currentRow?.parent_id || quotationId);
      setHistoryOpen(true);
    } catch (err) { console.error(err); alert("Failed to load history"); }
  };

  const openHistoryMail = (id, customerName) => {
    const inv = historyList.find(p => p.id === id);
    setMailTo(inv?.email || "");
    setMailSubject(`Proposal ${formatQTNumber(id, inv?.invoice_date)}`);
    setSelectedId(id);
    setHistoryOpen(false);
    setMailOpen(true);
  };

  const deleteHistoryVersion = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this version? This cannot be undone.")) return;
    try {
      await axios.delete(`http://localhost:3000/api/quotations/${id}`);
      setHistoryList(prev => prev.filter(q => q.id !== id));
    } catch (err) { alert("Failed to delete version"); }
  };

  const downloadHistoryPdf = (id, dateStr) => {
    // Set selectedId so the invoice preview renders, then trigger download
    setViewId(id);
    setTimeout(() => {
      if (invoiceRef.current) {
        html2pdf().from(invoiceRef.current).set({
          margin: 10, filename: `Quotation_${formatQTNumber(id, dateStr)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        }).save();
      }
    }, 800);
    setHistoryOpen(false);
  };

  const updateItem = (i, field, value) => { const copy = [...items]; copy[i][field] = value; setItems(copy); };
  const addItem = () => { setItems(p => [...p, { name: "", brand_model: "", hsn_sac: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]); setDescInput(prev => prev ? prev + ", " : ""); };
  const removeItem = () => { if (items.length <= 1) return; const n = items.slice(0, -1); setItems(n); setDescInput(n.map(i => i.name).join(", ")); };
  const formatDate = (date) => date ? new Date(date).toLocaleString("en-IN", { dateStyle: "medium" }) : "---";

  useEffect(() => {
    document.body.classList.toggle("modal-open", open || mailOpen);
    return () => document.body.classList.remove("modal-open");
  }, [open, mailOpen]);

  const filteredInvoices = quotationDataList.filter(q => q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mb-4 mt-6">
      <div className="h-1 w-6 bg-blue-500 rounded"></div>
      <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">{children}</h3>
      <div className="flex-1 h-px bg-blue-100"></div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="invoice-heading-tab flex gap-4 justify-between items-center flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">Quotation</h2>
          <nav className="text-sm text-gray-500">Dashboard &gt; Finance &gt; Quotation</nav>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1 rounded-lg border h-10 mt-2">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Search by customer..." className="outline-none text-sm w-40 bg-transparent" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={async () => {
              if (!selectedId && !viewId) return alert("Select an invoice first");
              const id = viewId || selectedId;
              try {
                const res = await fetch(`http://localhost:3000/api/quotations/download-pdf/${id}`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url;
                a.download = `Quotation_${formatQTNumber(id, quotationDataList.find(p=>p.id===id)?.invoice_date)}.pdf`;
                a.click(); URL.revokeObjectURL(url);
              } catch(e) { alert("Download failed"); }
            }} title="Download PDF" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Download size={20} /></button>
            <button onClick={openMailModal} title="Send Email" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Mail size={18} /></button>
            <button onClick={() => { if (!selectedId) return alert("Select an item"); handleEdit(selectedId); }} title="Edit" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Edit2 size={18} /></button>
            <button onClick={handleDelete} title="Delete" className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50 transition"><Trash2 size={18} className="text-red-500" /></button>
          </div>
          <div className="mt-2">
            <button onClick={() => { resetForm(); setOpen(true); }} className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848] transition"><Plus size={24} /></button>
          </div>
        </div>
      </div>

      {/* Table */}
      {!viewId && (
      <div className="bg-white shadow-sm rounded-xl mt-6 overflow-hidden border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm text-center border-collapse min-w-[600px]">
          <thead className="bg-[#f8fafc]">
            <tr className="text-gray-700 font-bold uppercase text-xs border-b border-gray-200">
              <th className="px-4 py-4 border-r">QT Number</th>
              <th className="px-4 py-4 border-r">Customer Name</th>
              <th className="px-4 py-4 border-r">Email</th>
              <th className="px-4 py-4 border-r">Mobile</th>
              <th className="px-4 py-4 border-r">Date</th>
              <th className="px-4 py-4 border-r">Total</th>
              <th className="px-4 py-4 border-r">City</th>
              <th className="px-4 py-4">History</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(p => (
              <tr key={p.id} onClick={() => setSelectedId(p.id)} onDoubleClick={() => { setViewId(p.id); setTimeout(() => setShowInvoice(true), 50); }}
                className={`cursor-pointer border-b hover:bg-gray-50 transition ${selectedId === p.id ? "bg-blue-50/50" : ""}`}>
                <td className="px-4 py-4 border-r font-medium text-blue-600">{formatQTNumber(p.id, p.quotation_date || p.invoice_date)}</td>
                <td className="px-4 py-4 border-r">{p.customer_name}</td>
                <td className="px-4 py-4 border-r text-gray-500">{p.email || "---"}</td>
                <td className="px-4 py-4 border-r">{p.mobile_number}</td>
                <td className="px-4 py-4 border-r">{formatDate(p.quotation_date || p.invoice_date)}</td>
                <td className="px-4 py-4 border-r font-bold text-gray-900">&#8377;{p.grand_total?.toLocaleString()}</td>
                <td className="px-4 py-4 border-r">{p.location_city}</td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={e => openHistory(e, p.id, p.customer_name)}
                    title="View customer history"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition"
                  >
                    <History size={13} /> History
                  </button>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (<tr><td colSpan="8" className="py-10 text-gray-400 italic">No invoices found</td></tr>)}
          </tbody>
        </table>
      </div>
      )}

      {/* Create/Edit Form Modal */}
      <div className={`overlay ${open ? "show" : ""} flex justify-center items-start overflow-y-auto pt-6 pb-10`}>
        <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl p-8 relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{editId ? "Edit Quotation" : "Create Quotation"}</h2>
            <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { setOpen(false); resetForm(); }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <SectionTitle>From Address</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Supplier Branch</label>
                <select value={extra.supplier_branch} onChange={e => {
                  const branch = e.target.value;
                  const matchingAddr = fromAddresses.find(a => a.label.toLowerCase().includes(branch.toLowerCase()));
                  setExtra(ex => ({ 
                    ...ex, 
                    supplier_branch: branch,
                    from_address_id: matchingAddr ? String(matchingAddr.id) : ex.from_address_id
                  }));
                }}
                  className="border rounded-lg px-3 py-2 outline-none bg-white text-sm">
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b.value} value={b.value}>{b.label} ({b.state})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Select Office Address</label>
                <select value={extra.from_address_id} onChange={e => setExtra(ex => ({ ...ex, from_address_id: e.target.value === "ADD_NEW" ? "" : e.target.value, from_address_custom: "" }))}
                  className="border rounded-lg px-3 py-2 outline-none bg-white text-sm">
                  <option value="">-- Select Address --</option>
                  {fromAddresses.map(a => (
                    <option key={a.id} value={a.id}>{a.label} — {a.address.substring(0, 40)}...</option>
                  ))}
                  <option value="ADD_NEW">+ Add New Address</option>
                </select>
                {extra.from_address_id && extra.from_address_id !== "" && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {fromAddresses.filter(a => String(a.id) === String(extra.from_address_id)).map(a => (
                      <div key={a.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex-1">
                        <MapPin size={12} /> <span>{a.address}</span>
                        <button type="button" onClick={() => handleDeleteAddress(a.id)} className="ml-auto text-red-400 hover:text-red-600"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowAddAddress(p => !p)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus size={12} /> Add New Address to List
              </button>
            </div>
            {showAddAddress && (
              <div className="bg-gray-50 border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={newAddrLabel} onChange={e => setNewAddrLabel(e.target.value)} placeholder="Label (e.g. Coimbatore)" className="border rounded-lg px-3 py-2 text-sm outline-none" />
                <input value={newAddrText} onChange={e => setNewAddrText(e.target.value)} placeholder="Full address..." className="border rounded-lg px-3 py-2 text-sm outline-none col-span-1 md:col-span-1" />
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddAddress} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Save</button>
                  <button type="button" onClick={() => setShowAddAddress(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Redesigned Bank Details Section inside Company Profile */}
            <div className="mt-4 p-5 bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h4 className="text-sm font-black text-blue-800 uppercase tracking-tighter flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Bank Details
                </h4>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Template:</label>
                  <select 
                    value={extra.bank_details_id} 
                    onChange={e => {
                      const b = BANK_DETAILS.find(x => x.id === e.target.value);
                      if (b) {
                        setExtra(ex => ({ 
                          ...ex, 
                          bank_details_id: b.id,
                          bank_company: b.company,
                          bank_name: b.bank,
                          bank_account: b.account,
                          bank_ifsc: b.ifsc,
                          bank_branch: b.branch
                        }));
                      }
                    }}
                    className="text-[11px] border-none rounded bg-white shadow-sm px-2 py-1 outline-none font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
                  >
                    {BANK_DETAILS.map(b => (
                      <option key={b.id} value={b.id}>{b.bank} - {b.account}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-center border-b border-slate-100 pb-1">
                  <span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Company</span>
                  <span className="mr-3 text-slate-300">:</span>
                  <input type="text" value={extra.bank_company} onChange={e => setExtra(ex => ({ ...ex, bank_company: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" />
                </div>
                <div className="flex items-center border-b border-slate-100 pb-1">
                  <span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Bank</span>
                  <span className="mr-3 text-slate-300">:</span>
                  <input type="text" value={extra.bank_name} onChange={e => setExtra(ex => ({ ...ex, bank_name: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" />
                </div>
                <div className="flex items-center border-b border-slate-100 pb-1">
                  <span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Account</span>
                  <span className="mr-3 text-slate-300">:</span>
                  <input type="text" value={extra.bank_account} onChange={e => setExtra(ex => ({ ...ex, bank_account: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" />
                </div>
                <div className="flex items-center border-b border-slate-100 pb-1">
                  <span className="w-20 text-[11px] font-bold text-slate-500 uppercase">IFSC</span>
                  <span className="mr-3 text-slate-300">:</span>
                  <input type="text" value={extra.bank_ifsc} onChange={e => setExtra(ex => ({ ...ex, bank_ifsc: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none uppercase" />
                </div>
                <div className="flex items-center border-b border-slate-100 pb-1 md:col-span-2">
                  <span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Branch</span>
                  <span className="mr-3 text-slate-300">:</span>
                  <input type="text" value={extra.bank_branch} onChange={e => setExtra(ex => ({ ...ex, bank_branch: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" />
                </div>
              </div>
            </div>

            {/* ── SECTION 2: CLIENT DETAILS (TO ADDRESS) ── */}
            <SectionTitle>Client Details (To Address)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Reference No</label>
                <input type="text" value={editId ? "Auto-generated" : "Will be auto-generated"} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-gray-400 text-sm cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Search Existing Client</label>
                <div className="relative">
                  <input type="text" placeholder="Type to search clients..." 
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (val.length > 2) {
                        try {
                          const res = await axios.get(`http://localhost:3000/api/client/search?name=${val}`);
                          setClientSearchResults(res.data);
                        } catch (err) { console.error(err); }
                      } else {
                        setClientSearchResults([]);
                      }
                    }}
                    className="border rounded-lg px-3 py-2 outline-none text-sm w-full" />
                  {clientSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 bg-white border rounded-lg mt-1 shadow-lg z-50 max-h-40 overflow-y-auto">
                      {clientSearchResults.map(c => (
                        <div key={c.id} onClick={async () => {
                          try {
                            const res = await axios.get("http://localhost:3000/api/client");
                            const fullClient = res.data.find(cc => cc.id === c.id);
                            if (fullClient) {
                              setCustomer({
                                customer_name: fullClient.name,
                                mobile_number: fullClient.phone || "",
                                email: fullClient.email || "",
                                gst_number: fullClient.gst_number || "",
                                location_city: fullClient.address || ""
                              });
                              setExtra(ex => ({
                                ...ex,
                                client_company: fullClient.company_name || "",
                                client_city: fullClient.address || "",
                                client_state: fullClient.state || "",
                                client_pincode: fullClient.pincode || ""
                              }));
                              if (fullClient.service) {
                                setDescInput(fullClient.service);
                                setItems([{ name: fullClient.service, brand_model: "", hsn_sac: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }]);
                              }
                            }
                          } catch (err) { console.error(err); }
                          setClientSearchResults([]);
                        }} className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm">
                          {c.name} {c.company_name ? `(${c.company_name})` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
                <input type="text" value={extra.client_company} onChange={e => setExtra(ex => ({ ...ex, client_company: e.target.value }))} placeholder="e.g. ABC Technologies" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label>
                <input type="text" value={customer.customer_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setCustomer({ ...customer, customer_name: e.target.value }); }} placeholder="e.g. Ravi Kumar" className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number *</label>
                <input type="text" value={customer.mobile_number} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setCustomer({ ...customer, mobile_number: e.target.value }); }} maxLength={13} inputMode="numeric" className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                <input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">GST Number</label>
                <input type="text" value={customer.gst_number} onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setCustomer({ ...customer, gst_number: val });
                  if (val.length >= 2) {
                    const stateCode = val.substring(0, 2);
                    const stateName = GST_STATE_MAP[stateCode];
                    if (stateName) setExtra(ex => ({ ...ex, client_state: stateName }));
                  }
                }} placeholder="33AABCA1234D1Z5" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Address Line 1</label>
                <input type="text" value={extra.client_address1} onChange={e => setExtra(ex => ({ ...ex, client_address1: e.target.value }))} placeholder="Street / Building" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Address Line 2 (Optional)</label>
                <input type="text" value={extra.client_address2} onChange={e => setExtra(ex => ({ ...ex, client_address2: e.target.value }))} placeholder="Area / Landmark" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">City / District</label>
                <input type="text" value={extra.client_city} onChange={e => setExtra(ex => ({ ...ex, client_city: e.target.value }))} placeholder="e.g. Chennai" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">State</label>
                <select value={extra.client_state} onChange={e => setExtra(ex => ({ ...ex, client_state: e.target.value }))}
                  className="border rounded-lg px-3 py-2 outline-none text-sm bg-white">
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">PIN Code</label>
                <input type="text" value={extra.client_pincode} onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setExtra(ex => ({ ...ex, client_pincode: e.target.value })); }} maxLength={6} inputMode="numeric" placeholder="e.g. 600001" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Country</label>
                <input type="text" value={extra.client_country} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Quotation Date *</label>
                <input type="date" value={quotationData.quotation_date} onChange={e => setQuotationData({ ...quotationData, quotation_date: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
            </div>

            {/* ── SECTION 4: ITEMS TABLE ── */}
            <SectionTitle>Quote Items</SectionTitle>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
              <div className="flex gap-2">
                <textarea value={descInput} onChange={e => setDescInput(e.target.value)} placeholder="e.g. Laptop, specs..." className="flex-1 border rounded-lg px-3 py-2 outline-none min-h-[60px] text-sm" />
                <button type="button" onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold h-fit self-end hover:bg-blue-700 transition">
                  {editingIndex !== null ? "Update Item" : "Add Item"}
                </button>
              </div>
              <p className="text-[10px] text-orange-500 italic font-medium">Content before the first comma will be bolded in the template</p>
            </div>
            <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-center text-sm min-w-[700px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-gray-600 font-bold uppercase text-[10px]">
                    <th className="px-3 py-3 text-left">S.No</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">Brand & Model</th>
                    <th className="px-3 py-3 text-left">HSN/SAC</th>
                    <th className="px-3 py-3">UOM</th>
                    <th className="px-3 py-3">Price</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3 text-gray-400">Tax %</th>
                    <th className="px-3 py-3">Disc (&#8377;)</th>
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input 
                          type="text" 
                          value={item.name} 
                          readOnly 
                          onClick={() => { setDescInput(item.name); setEditingIndex(i); }}
                          className="w-full outline-none bg-transparent text-sm cursor-pointer hover:text-blue-600 font-medium" 
                          placeholder="Click to edit description..." 
                        />
                      </td>
                      <td className="px-3 py-2"><input type="text" value={item.brand_model} onChange={e => updateItem(i, "brand_model", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Brand/Model" /></td>
                      <td className="px-3 py-2"><input type="text" value={item.hsn_sac} onChange={e => updateItem(i, "hsn_sac", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="HSN/SAC" /></td>
                      <td className="px-3 py-2">
                        <select value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} className="border rounded px-2 py-1 text-xs outline-none bg-white">
                          {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                          <option value="custom">Custom</option>
                        </select>
                        {item.uom === "custom" && <input type="text" placeholder="Enter UOM" onChange={e => updateItem(i, "uom", e.target.value)} className="mt-1 border rounded px-2 py-1 text-xs w-full outline-none" />}
                      </td>
                      <td className="px-3 py-2"><input type="number" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="w-20 text-center outline-none bg-transparent text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.qty} onChange={e => updateItem(i, "qty", Number(e.target.value))} className="w-12 text-center outline-none bg-transparent text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.tax} onChange={e => updateItem(i, "tax", Number(e.target.value))} className="w-12 text-center bg-transparent outline-none text-sm border-b border-gray-200" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.discount} onChange={e => updateItem(i, "discount", Number(e.target.value))} className="w-20 text-center outline-none bg-transparent text-sm" /></td>
                      <td className="px-3 py-2 text-right font-bold text-sm">&#8377;{calculateItemTotal(item).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-gray-50 p-3 flex gap-4">
                <button type="button" onClick={removeItem} className="flex items-center gap-2 text-red-500 font-bold text-xs hover:underline"><MinusCircle size={14} /> Remove Line</button>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-2">
                {(() => {
                  const totals = getTaxCalculations();
                  return (<>
                    <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>&#8377;{totals.subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span>-&#8377;{totals.total_discount.toLocaleString()}</span></div>
                    {totals.total_cgst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>CGST</span><span>&#8377;{totals.total_cgst.toLocaleString()}</span></div>}
                    {totals.total_sgst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>SGST</span><span>&#8377;{totals.total_sgst.toLocaleString()}</span></div>}
                    {totals.total_igst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>IGST</span><span>&#8377;{totals.total_igst.toLocaleString()}</span></div>}
                    <div className="flex justify-between border-t pt-2 text-lg font-bold text-blue-700"><span>Grand Total</span><span>&#8377;{totals.grand_total.toLocaleString()}</span></div>
                  </>);
                })()}
              </div>
            </div>

            {/* ── SECTION 5: EXECUTIVE DETAILS ── */}
            <SectionTitle>Executive Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Executive Name</label>
                <input type="text" value={extra.exec_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setExtra(ex => ({ ...ex, exec_name: e.target.value })); }} placeholder="e.g. Anbu Selvan" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label>
                <input type="text" value={extra.exec_phone} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setExtra(ex => ({ ...ex, exec_phone: e.target.value })); }} maxLength={13} inputMode="numeric" placeholder="e.g. 9876543210" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Email ID</label>
                <input type="email" value={extra.exec_email} onChange={e => setExtra(ex => ({ ...ex, exec_email: e.target.value }))} placeholder="exec@company.com" className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            </div>

            {/* ── SECTION 6: TERMS & CONDITIONS ── */}
            <SectionTitle>Terms &amp; Conditions</SectionTitle>
            <div className="space-y-4 bg-gray-50 rounded-xl p-5 border border-gray-200">

              {/* General */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={extra.terms_general} onChange={e => setExtra(ex => ({ ...ex, terms_general: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">General Terms &amp; Conditions</p>
                    <p className="text-xs text-gray-500">Standard terms apply to this quotation</p>
                  </div>
                </label>
                <div className="flex flex-col gap-1 ml-7">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Custom Note</label>
                  <input type="text" value={extra.custom_terms} onChange={e => setExtra(ex => ({ ...ex, custom_terms: e.target.value }))} placeholder="Additional terms..." className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" />
                </div>
              </div>

              {/* Tax */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={extra.terms_tax} onChange={e => setExtra(ex => ({ ...ex, terms_tax: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Tax</p>
                  <p className="text-xs text-gray-500">Prices quoted are exclusive of Sales and Service Tax (SEZ – NIL Tax applicable)</p>
                </div>
              </label>

              {/* Project Period */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Project Period</label>
                <input type="text" value={extra.terms_project_period} onChange={e => setExtra(ex => ({ ...ex, terms_project_period: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" placeholder="e.g. 30-60 days from Purchase Order date" />
              </div>

              {/* Validity */}
              <div>
                <p className="text-sm font-semibold text-gray-700">Validity</p>
                <div className="flex flex-wrap gap-4 mt-2">
                  {VALIDITY_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 transition ${extra.terms_validity === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200"}`}>
                      <input type="radio" name="terms_validity" value={opt} checked={extra.terms_validity === opt} onChange={e => setExtra(ex => ({ ...ex, terms_validity: e.target.value }))} className="accent-blue-600" />
                      <span className="text-xs">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Separate Orders */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Separate Orders</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: "material", label: "A. Material Supply (As per actuals)" },
                    { key: "installation", label: "B. Installation / Services" },
                    { key: "usd", label: "C. Price may vary based on USD rates" },
                    { key: "boq", label: "D. Factory BOQ may vary" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={extra.terms_separate_orders?.[key] || false}
                        onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, [key]: e.target.checked } }))}
                        className="accent-blue-600 w-4 h-4" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Terms</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition ${extra.terms_payment === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="terms_payment" value={opt} checked={extra.terms_payment === opt} onChange={e => setExtra(ex => ({ ...ex, terms_payment: e.target.value }))} className="accent-blue-600" />
                      {opt}
                    </label>
                  ))}
                </div>
                {extra.terms_payment === "Custom" && (
                  <input type="text" value={extra.terms_payment_custom} onChange={e => setExtra(ex => ({ ...ex, terms_payment_custom: e.target.value }))} placeholder="Enter custom payment terms..." className="mt-2 border rounded-lg px-3 py-2 outline-none text-sm w-full bg-white" />
                )}
              </div>

              {/* Warranty */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Warranty</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {WARRANTY_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs transition ${extra.terms_warranty === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="terms_warranty" value={opt} checked={extra.terms_warranty === opt} onChange={e => setExtra(ex => ({ ...ex, terms_warranty: e.target.value }))} className="accent-blue-600" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button type="submit" className="bg-blue-600 text-white px-10 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">Save Quotation</button>
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="bg-gray-200 text-gray-600 px-10 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* ── History Modal ─────────────────────────────────────────────── */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-start overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-3xl p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <History size={20} className="text-indigo-500" /> Previous Versions
                </h2>
                <p className="text-sm text-indigo-600 font-semibold mt-0.5">{historyCustomerName}</p>
              </div>
              <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setHistoryOpen(false)} />
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 mb-4">
              <Search size={15} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by sub-quotation number..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="outline-none text-sm bg-transparent flex-1"
              />
              {historySearch && <X size={14} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setHistorySearch("")} />}
            </div>

            {(() => {
              const filtered = historyList.filter(q => {
                const subNum = formatSubQTNumber(q.parent_id || historyRootId, q.version, q.invoice_date).toLowerCase();
                return !historySearch || subNum.includes(historySearch.toLowerCase());
              });
              return filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-10 italic">
                  {historyList.length === 0
                    ? "No previous versions found. This is the original quotation."
                    : "No results match your search."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr className="text-gray-600 font-bold uppercase text-xs border-b">
                        <th className="px-4 py-3 text-left">Sub-QT Number</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((q) => (
                        <tr
                          key={q.id}
                          onClick={() => setHistorySelectedId(q.id)}
                          onDoubleClick={() => {
                            setViewId(q.id);
                            setTimeout(() => setShowInvoice(true), 50);
                            setHistoryOpen(false);
                          }}
                          className={`border-b cursor-pointer hover:bg-indigo-50/40 transition ${historySelectedId === q.id ? "bg-indigo-50" : ""}`}
                        >
                          <td className="px-4 py-3 font-semibold text-blue-600">
                            {formatSubQTNumber(q.parent_id || historyRootId, q.version, q.invoice_date)}
                            <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">v{q.version || 1}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{formatDate(q.invoice_date)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">₹{q.grand_total?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={e => { e.stopPropagation(); setViewId(q.id); setTimeout(() => setShowInvoice(true), 50); setHistoryOpen(false); }}
                                title="View" className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition"
                              ><Download size={14} /></button>
                              <button
                                onClick={e => { e.stopPropagation(); handleEdit(q.id); setHistoryOpen(false); }}
                                title="Edit" className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition"
                              ><Edit2 size={14} /></button>
                              <button
                                onClick={e => { e.stopPropagation(); openHistoryMail(q.id, historyCustomerName); }}
                                title="Send Email" className="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center hover:bg-orange-100 transition"
                              ><Mail size={14} /></button>
                              <button
                                onClick={e => deleteHistoryVersion(e, q.id)}
                                title="Delete version" className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 transition"
                              ><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 italic mt-3 text-center">Double-click any row to open that quotation</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Mail Modal */}
      <div className={`overlay ${mailOpen ? "show" : ""} flex justify-center items-center`}>
        <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-lg p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail size={20} /> Send Proposal</h2>
            <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setMailOpen(false)} />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">To (Email)</label>
              <input type="email" value={mailTo} onChange={e => setMailTo(e.target.value)} className="border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100" placeholder="recipient@email.com" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Subject</label>
              <input type="text" value={mailSubject} onChange={e => setMailSubject(e.target.value)} className="border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button onClick={handleSendEmail} disabled={mailSending} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow transition disabled:opacity-60">
              {mailSending ? "Sending..." : "Send Email"}
            </button>
            <button onClick={() => setMailOpen(false)} className="bg-gray-200 text-gray-600 px-8 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      {viewId && (
        <div key={viewId} ref={invoiceRef} className={`invoicewrapper w-full mt-6 bg-white shadow-xl p-6 relative overflow-y-auto ${showinvoice ? "See" : ""}`}>
          <div className="flex gap-3 absolute right-6 top-6 z-10">
            <X className="cursor-pointer text-gray-400 hover:text-red-500 bg-white rounded-full p-1" onClick={() => { setShowInvoice(false); setTimeout(() => setViewId(null), 400); }} />
          </div>
          <Invoice quotationId={viewId} type="quotation" />
        </div>
      )}
    </div>
  );
};

export default Proposal;
