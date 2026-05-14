import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, X, Edit2, MinusCircle, PlusCircle, Trash2, Mail, MapPin, History } from "lucide-react";
import { calculateItemTotal } from "../utils/invoicecal";
import axios from "axios";
import Invoice from "../components/invoicetemplate";
import { API } from "../config";
import { BRANCH_DATA, BRANCH_OPTIONS, BANK_DETAILS } from "../config/branchConfig";

const UOM_OPTIONS = ["Nos","Units","Pieces","Boxes","Sets","Meters","Kg","Liters"];
const INDIAN_STATES = ["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const VALIDITY_OPTIONS = ["2 days","5 days","10 days","15 days","30 days"];
const PAYMENT_OPTIONS = ["100% Advance","Payment Against Delivery","15 Days","30 Days","45 Days","Custom"];
const WARRANTY_OPTIONS = ["No Warranty","Testing Warranty","1 Month","3 Months","6 Months","12 Months","24 Months","36 Months","OEM Warranty","Supplier Warranty","OEM Hardware Warranty","No Software Warranty"];
const GST_STATE_MAP = {"01":"Jammu and Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh","05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal","20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat","25":"Dadra and Nagar Haveli and Daman and Diu","26":"Dadra and Nagar Haveli and Daman and Diu","27":"Maharashtra","29":"Karnataka","30":"Goa","31":"Lakshadweep","32":"Kerala","33":"Tamil Nadu","34":"Puducherry","35":"Andaman and Nicobar Islands","36":"Telangana","37":"Andhra Pradesh","38":"Ladakh"};

const emptyExtra = () => ({
  from_address_id:"",from_address_custom:"",client_company:"",client_address1:"",client_address2:"",
  client_city:"",client_state:"",client_pincode:"",client_country:"India",
  tax_type:"GST18",custom_tax:"",exec_name:"",exec_phone:"",exec_email:"",
  terms_general:false,terms_tax:false,terms_project_period:"30-60 days from Purchase Order date",
  terms_validity:"15 days",terms_separate_orders:{material:false,installation:false,usd:false,boq:false},
  terms_payment:"",terms_payment_custom:"",terms_warranty:"",supplier_branch:"Coimbatore",
  bank_details_id:"hdfc",bank_company:"ACHME COMMUNICATION",bank_name:"HDFC BANK",
  bank_account:"00312320005822",bank_ifsc:"HDFC0000031",bank_branch:"Coimbatore",custom_terms:"",
});
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };


const Quotation = () => {
  const userRole = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").role || "employee"; } catch { return "employee"; } })();
  const canEditDelete = userRole === "admin" || userRole === "subadmin";
  const [list, setList] = useState([]);
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
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyCustomerName, setHistoryCustomerName] = useState("");
  const [historySelectedId, setHistorySelectedId] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyRootId, setHistoryRootId] = useState(null);
  const [items, setItems] = useState([{name:"",brand_model:"",hsn_sac:"",uom:"Nos",price:0,qty:1,tax:18,discount:0}]);
  const [customer, setCustomer] = useState({customer_name:"",mobile_number:"",email:"",gst_number:"",location_city:""});
  const [quotationData, setQuotationData] = useState({quotation_date:todayStr()});
  const [extra, setExtra] = useState(emptyExtra());
  const [editingIndex, setEditingIndex] = useState(null);
  const invoiceRef = useRef(null);

  const fmtQT = (id,d) => `QT-${d?new Date(d).getFullYear():new Date().getFullYear()}-${String(id).padStart(3,"0")}`;
  const fmtSubQT = (rootId,ver,d) => `QT-${d?new Date(d).getFullYear():new Date().getFullYear()}-${String(rootId).padStart(3,"0")}-${ver}`;
  const fmtDate = (d) => d?new Date(d).toLocaleString("en-IN",{dateStyle:"medium"}):"---";

useEffect(() => {
    fetchList();
    fetchAddresses();
    const p = new URLSearchParams(window.location.search);
    const qName = p.get("client_name");
    if (qName) {
      setCustomer(c=>({...c,customer_name:decodeURIComponent(qName),email:p.get("client_email")?decodeURIComponent(p.get("client_email")):c.email}));
      setOpen(true);
      window.history.replaceState({},document.title,window.location.pathname);
    } else {
      const pf = sessionStorage.getItem("qt_prefill");
      if (pf) { try { const v=JSON.parse(pf); setCustomer(c=>({...c,...v})); setExtra(ex=>({...ex,client_city:v.location_city||""})); setOpen(true); sessionStorage.removeItem("qt_prefill"); } catch(_){} }
    }
  }, []);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchList = async () => { try { const r=await axios.get(`${API}/api/quotations`, getAuthConfig()); setList(r.data); } catch(e){console.error(e);} };
  const fetchAddresses = async () => { try { const r=await axios.get(`${API}/api/quotations/from-addresses`, getAuthConfig()); setFromAddresses(r.data); } catch(e){console.error(e);} };

const handleAddAddress = async () => {
    if (!newAddrLabel||!newAddrText) return alert("Label and address required");
    try { const r=await axios.post(`${API}/api/quotations/from-addresses`,{label:newAddrLabel,address:newAddrText},getAuthConfig()); setFromAddresses(p=>[...p,r.data]); setNewAddrLabel(""); setNewAddrText(""); setShowAddAddress(false); }
    catch(e){ alert("Failed to add address"); }
  };

const handleEdit = async (id) => {
    try {
      const res = await axios.get(`${API}/api/quotations/${id}`, getAuthConfig());
      const rows=res.data; const h=rows[0];
      setCustomer({customer_name:h.customer_name,mobile_number:h.mobile_number,email:h.email,gst_number:h.gst_number||"",location_city:h.location_city});
      setQuotationData({quotation_date:h.quotation_date?.split("T")[0]||h.invoice_date?.split("T")[0]||""});
      const li=rows.map(r=>({name:r.description,brand_model:r.brand_model||"",hsn_sac:r.hsn_sac||"",uom:r.uom||"Nos",price:Number(r.price)||0,qty:Number(r.quantity)||1,tax:18,discount:Number(r.discount)||0}));
      setItems(li); setDescInput(li.map(i=>i.name).join(", "));
      setExtra({from_address_id:h.from_address_id||"",from_address_custom:h.from_address_custom||"",client_company:h.client_company||"",client_address1:h.client_address1||"",client_address2:h.client_address2||"",client_city:h.client_city||"",client_state:h.client_state||"",client_pincode:h.client_pincode||"",client_country:h.client_country||"India",tax_type:h.tax_type||"GST18",custom_tax:h.custom_tax||"",exec_name:h.exec_name||"",exec_phone:h.exec_phone||"",exec_email:h.exec_email||"",terms_general:!!h.terms_general,terms_tax:!!h.terms_tax,terms_project_period:h.terms_project_period||"30-60 days from Purchase Order date",terms_validity:h.terms_validity||"15 days",terms_separate_orders:h.terms_separate_orders?JSON.parse(h.terms_separate_orders):{material:false,installation:false,usd:false,boq:false},terms_payment:h.terms_payment||"",terms_payment_custom:h.terms_payment_custom||"",terms_warranty:h.terms_warranty||"",supplier_branch:h.supplier_branch||"Coimbatore",bank_details_id:h.bank_details_id||"hdfc",bank_company:h.bank_company||"ACHME COMMUNICATION",bank_name:h.bank_name||"HDFC BANK",bank_account:h.bank_account||"00312320005822",bank_ifsc:h.bank_ifsc||"HDFC0000031",bank_branch:h.bank_branch||"Coimbatore",custom_terms:h.custom_terms||""});
      setEditId(id); setOpen(true);
    } catch(e){ alert("Failed to load quotation"); }
  };

  const getTotals = () => {
    if (extra.terms_tax) {
      const sub=items.reduce((a,i)=>a+(i.price*(i.qty||0)),0);
      const disc=items.reduce((a,i)=>a+(i.discount||0),0);
      return {subtotal:sub,total_discount:disc,total_cgst:0,total_sgst:0,total_igst:0,grand_total:sub-disc};
    }
    const bState=(BRANCH_OPTIONS.find(b=>b.value===extra.supplier_branch)?.state||"Tamil Nadu").toLowerCase().trim();
    const cState=(extra.client_state||"").toLowerCase().trim();
    const same=bState===cState&&cState!=="";
    let sub=0,disc=0,cgst=0,sgst=0,igst=0;
    items.forEach(i=>{ const s=i.price*i.qty; const d=i.discount||0; const t=((s-d)*(i.tax||0))/100; sub+=s; disc+=d; if(same){cgst+=t/2;sgst+=t/2;}else{igst+=t;} });
    return {subtotal:sub,total_discount:disc,total_cgst:cgst,total_sgst:sgst,total_igst:igst,grand_total:sub-disc+cgst+sgst+igst};
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quotationData.quotation_date) return alert("Please select date");
    if (items.some(i=>!i.name.trim())) return alert("Description cannot be empty");
    try {
      const t=getTotals();
      const payload={customer,invoice:{invoice_date:quotationData.quotation_date,quotation_date:quotationData.quotation_date,...t,total_tax:t.total_cgst+t.total_sgst+t.total_igst},items:items.map(i=>({description:i.name,brand_model:i.brand_model,hsn_sac:i.hsn_sac,uom:i.uom,price:i.price,quantity:i.qty,tax:i.tax,discount:i.discount,subtotal:calculateItemTotal(i)})),extra};
      if (editId) { const r=await axios.put(`${API}/api/quotations/${editId}`,payload,getAuthConfig()); alert(`Version ${r.data.version||""} saved`); }
      else { await axios.post(`${API}/api/quotations/create`,payload,getAuthConfig()); alert("Created successfully"); }
      setOpen(false); resetForm(); fetchList();
    } catch(err){ console.error(err); alert("Error saving Quotation: "+(err.response?.data?.message||err.message)); }
  };

  const resetForm = () => { setCustomer({customer_name:"",mobile_number:"",email:"",gst_number:"",location_city:""}); setItems([{name:"",brand_model:"",hsn_sac:"",uom:"Nos",price:0,qty:1,tax:18,discount:0}]); setDescInput(""); setQuotationData({quotation_date:todayStr()}); setExtra(emptyExtra()); setEditId(null); setEditingIndex(null); };

const handleDelete = async () => {
    if (!selectedId) return alert("Select an item to delete");
    if (!window.confirm("Are you sure?")) return;
    try { await axios.delete(`${API}/api/quotations/${selectedId}`, getAuthConfig()); setSelectedId(null); fetchList(); } catch(e){ console.error(e); }
  };

const handleAddItem = () => {
    if (!descInput.trim()) return;
    const newItem = {name:descInput,brand_model:"",hsn_sac:"",uom:"Nos",price:0,qty:1,tax:18,discount:0};
    if (editingIndex!==null) { const u=[...items]; u[editingIndex]={...u[editingIndex],name:descInput}; setItems(u); setEditingIndex(null); }
    else { setItems(p=>p.length===1&&!p[0].name.trim()?[newItem]:[...p,newItem]); }
    setDescInput("");
  };

  const handleClientSearch = async (val) => {
    if (val.length < 2) { setClientSearchResults([]); setClientSearchOpen(false); return; }
    try {
      const res = await axios.get(`${API}/api/client/search?name=${encodeURIComponent(val)}`, getAuthConfig());
      setClientSearchResults(res.data);
      setClientSearchOpen(true);
    } catch(e) { console.error(e); }
  };

  const handleSelectClient = (client) => {
    setCustomer({
      customer_name: client.name || "",
      mobile_number: client.phone || "",
      email: client.email || client.lead_email || "",
      gst_number: client.gst_number || "",
      location_city: client.lead_city || client.city || client.location_city || ""
    });
    setExtra(ex => ({
      ...ex,
      client_company: client.company_name || "",
      client_address1: client.address || "",
      client_address2: "",
      client_city: client.lead_city || client.city || "",
      client_state: client.state || "",
      client_pincode: client.pincode || "",
      client_country: "India"
    }));
    setClientSearchResults([]); setClientSearchOpen(false);
  };

  const updateItem = (i,f,v) => { const c=[...items]; c[i][f]=v; setItems(c); };
  const removeItem = () => { if(items.length<=1)return; setItems(p=>p.slice(0,-1)); };

  const openMailModal = () => {
    if (!selectedId) return alert("Select an invoice to send");
    const inv=list.find(p=>p.id===selectedId);
    setMailTo(inv?.email||""); setMailSubject(`Proposal ${fmtQT(selectedId,inv?.quotation_date||inv?.invoice_date)}`); setMailOpen(true);
  };

const handleSendEmail = async () => {
    if (!mailTo) return alert("Please enter recipient email");
    setMailSending(true);
    try { await axios.post(`${API}/api/quotations/send-email/${selectedId}`,{to:mailTo,subject:mailSubject},getAuthConfig()); alert("Email sent"); setMailOpen(false); }
    catch(e){ alert(e.response?.data?.message||"Failed to send email"); } finally { setMailSending(false); }
  };

  const openHistory = async (e,id,name) => {
    e.stopPropagation();
    try {
      const res=await axios.get(`${API}/api/quotations/customer-history/${id}`,getAuthConfig());
      setHistoryList(res.data); setHistoryCustomerName(name); setHistorySelectedId(null); setHistorySearch("");
      const cur=list.find(p=>p.id===id); setHistoryRootId(cur?.parent_id||id); setHistoryOpen(true);
    } catch(e){ alert("Failed to load history"); }
  };

  const deleteHistoryVersion = async (e,id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this version?")) return;
    try { await axios.delete(`${API}/api/quotations/${id}`, getAuthConfig()); setHistoryList(p=>p.filter(q=>q.id!==id)); } catch(e){ alert("Failed to delete"); }
  };

  useEffect(() => { document.body.classList.toggle("modal-open",open||mailOpen); return()=>document.body.classList.remove("modal-open"); },[open,mailOpen]);

  const filtered = list.filter(q=>q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const ST = ({children}) => (<div className="flex items-center gap-2 mb-4 mt-6"><div className="h-1 w-6 bg-blue-500 rounded"/><h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">{children}</h3><div className="flex-1 h-px bg-blue-100"/></div>);


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
            <Search size={18} className="text-gray-500"/>
            <input type="text" placeholder="Search by customer..." className="outline-none text-sm w-40 bg-transparent" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={async()=>{ const id=viewId||selectedId; if(!id)return alert("Select an invoice first"); try{const r=await fetch(`${API}/api/quotations/download-pdf/${id}`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`Quotation_${fmtQT(id,list.find(p=>p.id===id)?.invoice_date)}.pdf`;a.click();URL.revokeObjectURL(url);}catch(e){alert("Download failed");} }} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Download size={20}/></button>
<button onClick={openMailModal} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Mail size={18}/></button>
            {canEditDelete && <button onClick={()=>{if(!selectedId)return alert("Select an item");handleEdit(selectedId);}} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Edit2 size={18}/></button>}
            {canEditDelete && <button onClick={handleDelete} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Trash2 size={18} className="text-red-500"/></button>}
          </div>
          <div className="mt-2">
            <button onClick={()=>{resetForm();setOpen(true);}} className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848]"><Plus size={24}/></button>
          </div>
        </div>
      </div>

      {/* List Table */}
      {!viewId && (
        <div className="bg-white shadow-sm rounded-xl mt-6 overflow-hidden border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-center border-collapse min-w-[600px]">
            <thead className="bg-[#f8fafc]">
              <tr className="text-gray-700 font-bold uppercase text-xs border-b border-gray-200">
                <th className="px-4 py-4 border-r">QT Number</th>
                <th className="px-4 py-4 border-r">Customer</th>
                <th className="px-4 py-4 border-r">Email</th>
                <th className="px-4 py-4 border-r">Mobile</th>
                <th className="px-4 py-4 border-r">Date</th>
                <th className="px-4 py-4 border-r">Total</th>
                <th className="px-4 py-4 border-r">City</th>
                <th className="px-4 py-4">History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} onClick={()=>setSelectedId(p.id)} onDoubleClick={()=>{setViewId(p.id);setTimeout(()=>setShowInvoice(true),50);}} className={`cursor-pointer border-b hover:bg-gray-50 ${selectedId===p.id?"bg-blue-50/50":""}`}>
                  <td className="px-4 py-4 border-r font-medium text-blue-600">{fmtQT(p.id,p.quotation_date||p.invoice_date)}</td>
                  <td className="px-4 py-4 border-r">{p.customer_name}</td>
                  <td className="px-4 py-4 border-r text-gray-500">{p.email||"---"}</td>
                  <td className="px-4 py-4 border-r">{p.mobile_number}</td>
                  <td className="px-4 py-4 border-r">{fmtDate(p.quotation_date||p.invoice_date)}</td>
                  <td className="px-4 py-4 border-r font-bold">&#8377;{p.grand_total?.toLocaleString()}</td>
                  <td className="px-4 py-4 border-r">{p.location_city}</td>
                  <td className="px-4 py-4"><button onClick={e=>openHistory(e,p.id,p.customer_name)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold"><History size={13}/> History</button></td>
                </tr>
              ))}
{filtered.length===0&&(<tr><td colSpan="8" className="py-10 text-gray-400 italic">No quotations found</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      <div className={`overlay ${open ? "show" : ""} flex justify-center items-start overflow-y-auto pt-6 pb-10`}>
        <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{editId ? "Edit Quotation" : "Create Quotation"}</h2>
            <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { setOpen(false); resetForm(); }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <ST>From Address</ST>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Branch</label>
                <select value={extra.supplier_branch} onChange={e => {
                  const branch = e.target.value;
                  const branchInfo = BRANCH_DATA[branch];
                  setExtra(ex => ({ ...ex, supplier_branch: branch,
                    from_address_custom: branchInfo ? `${branchInfo.address} | GSTIN: ${branchInfo.gstin}` : ex.from_address_custom,
                    from_address_id: "" }));
                }} className="border rounded-lg px-3 py-2 outline-none bg-white text-sm">
                  <option value="">-- Select Branch --</option>
                  {BRANCH_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label} ({b.state})</option>)}
                </select>
                {extra.supplier_branch && BRANCH_DATA[extra.supplier_branch] && (
                  <div className="mt-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
                    <MapPin size={12} /><span>{BRANCH_DATA[extra.supplier_branch].address}</span>
                    <span className="ml-2 font-mono font-bold">| GSTIN: {BRANCH_DATA[extra.supplier_branch].gstin}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Office Address</label>
                <select value={extra.from_address_id} onChange={e => {
                  const val = e.target.value;
                  if (val === "ADD_NEW") setExtra(ex => ({ ...ex, from_address_id: "", from_address_custom: "" }));
                  else if (BRANCH_DATA[val]) setExtra(ex => ({ ...ex, from_address_id: "", from_address_custom: `${BRANCH_DATA[val].address} | GSTIN: ${BRANCH_DATA[val].gstin}` }));
                  else setExtra(ex => ({ ...ex, from_address_id: val, from_address_custom: "" }));
                }} className="border rounded-lg px-3 py-2 outline-none bg-white text-sm">
                  <option value="">-- Select Address --</option>
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}: {BRANCH_DATA[b.value].address.substring(0, 50)}...</option>
                  ))}
                  <option disabled>─────────────</option>
                  {fromAddresses.map(a => <option key={a.id} value={a.id}>{a.label} — {a.address.substring(0,40)}...</option>)}
                  <option value="ADD_NEW">+ Add New Custom Address</option>
                </select>
                {extra.from_address_custom && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex-wrap mt-1">
                    <MapPin size={12} /> <span>{extra.from_address_custom}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowAddAddress(p => !p)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add New Address</button>
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

            {/* Bank Details */}
            <div className="mt-4 p-5 bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h4 className="text-sm font-black text-blue-800 uppercase tracking-tighter flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>Bank Details</h4>
<div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Bank A/C:</label>
                  <select value={extra.bank_details_id} onChange={e => {
                    const b = BANK_DETAILS.find(x => x.id === e.target.value);
                    if (b) setExtra(ex => ({ ...ex, bank_details_id: e.target.value, bank_company: b.company, bank_name: b.bank, bank_account: b.account, bank_ifsc: b.ifsc, bank_branch: b.branch }));
                  }} className="text-[11px] border-none rounded bg-white shadow-sm px-2 py-1 outline-none font-bold text-slate-600 cursor-pointer">
                    {BANK_DETAILS.map(b => <option key={b.id} value={b.id}>{b.bank} A/C: ***{b.account.slice(-4)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-center border-b border-slate-100 pb-1"><span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Company</span><span className="mr-3 text-slate-300">:</span><input type="text" value={extra.bank_company} onChange={e => setExtra(ex => ({ ...ex, bank_company: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" /></div>
                <div className="flex items-center border-b border-slate-100 pb-1"><span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Bank</span><span className="mr-3 text-slate-300">:</span><input type="text" value={extra.bank_name} onChange={e => setExtra(ex => ({ ...ex, bank_name: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" /></div>
                <div className="flex items-center border-b border-slate-100 pb-1"><span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Account</span><span className="mr-3 text-slate-300">:</span><input type="text" value={extra.bank_account} onChange={e => setExtra(ex => ({ ...ex, bank_account: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" /></div>
                <div className="flex items-center border-b border-slate-100 pb-1"><span className="w-20 text-[11px] font-bold text-slate-500 uppercase">IFSC</span><span className="mr-3 text-slate-300">:</span><input type="text" value={extra.bank_ifsc} onChange={e => setExtra(ex => ({ ...ex, bank_ifsc: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none uppercase" /></div>
                <div className="flex items-center border-b border-slate-100 pb-1 md:col-span-2"><span className="w-20 text-[11px] font-bold text-slate-500 uppercase">Branch</span><span className="mr-3 text-slate-300">:</span><input type="text" value={extra.bank_branch} onChange={e => setExtra(ex => ({ ...ex, bank_branch: e.target.value }))} className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" /></div>
              </div>
            </div>

            <ST>Client Details (To Address)</ST>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Quotation Date *</label>
                <input type="date" value={quotationData.quotation_date} onChange={e => setQuotationData({ ...quotationData, quotation_date: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
                <input type="text" value={extra.client_company} onChange={e => setExtra(ex => ({ ...ex, client_company: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customer.customer_name}
                    onChange={e => {
                      setCustomer({ ...customer, customer_name: e.target.value });
                      handleClientSearch(e.target.value);
                    }}
                    onFocus={e => { if (customer.customer_name.length >= 2) setClientSearchOpen(true); }}
                    onBlur={() => setTimeout(() => setClientSearchOpen(false), 300)}
                    className="border rounded-lg px-3 py-2 outline-none text-sm w-full"
                    placeholder="Type to search client..."
                    required
                  />
                  {clientSearchOpen && clientSearchResults.length > 0 && (
                    <div className="absolute z-50 bg-white border rounded-xl shadow-2xl mt-1 w-full max-h-60 overflow-y-auto">
                      {clientSearchResults.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => handleSelectClient(c)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition">
                          <div className="font-bold text-sm text-gray-800">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.company_name || "—"} | {c.phone || "No phone"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number *</label>
                <input type="text" value={customer.mobile_number} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setCustomer({ ...customer, mobile_number: e.target.value }); }} maxLength={13} className="border rounded-lg px-3 py-2 outline-none text-sm" required />
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
                <input type="text" value={extra.client_address1} onChange={e => setExtra(ex => ({ ...ex, client_address1: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Address Line 2</label>
                <input type="text" value={extra.client_address2} onChange={e => setExtra(ex => ({ ...ex, client_address2: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">City / District</label>
                <input type="text" value={extra.client_city} onChange={e => setExtra(ex => ({ ...ex, client_city: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">State</label>
                <select value={extra.client_state} onChange={e => setExtra(ex => ({ ...ex, client_state: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white">
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">PIN Code</label>
                <input type="text" value={extra.client_pincode} onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setExtra(ex => ({ ...ex, client_pincode: e.target.value })); }} maxLength={6} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Country</label>
                <input type="text" value={extra.client_country} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-sm" />
              </div>
            </div>

            <ST>Quote Items</ST>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
              <div className="flex gap-2">
                <textarea value={descInput} onChange={e => setDescInput(e.target.value)} placeholder="e.g. Laptop, specs..." className="flex-1 border rounded-lg px-3 py-2 outline-none min-h-[60px] text-sm" />
                <button type="button" onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold h-fit self-end hover:bg-blue-700">{editingIndex !== null ? "Update Item" : "Add Item"}</button>
              </div>
            </div>
            <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-center text-sm min-w-[700px]">
                <thead>
                  <tr className="text-gray-600 font-bold uppercase text-[10px]">
                    <th className="px-3 py-3 text-left">S.No</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">HSN/SAC</th>
                    <th className="px-3 py-3">UOM</th>
                    <th className="px-3 py-3">Price</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3">Tax %</th>
                    <th className="px-3 py-3">Disc (&#8377;)</th>
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.name} readOnly onClick={() => { setDescInput(item.name); setEditingIndex(i); }} className="w-full outline-none bg-transparent text-sm cursor-pointer hover:text-blue-600 font-medium" placeholder="Click to edit..." />
                      </td>
                      <td className="px-3 py-2"><input type="text" value={item.hsn_sac} onChange={e => updateItem(i, "hsn_sac", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="HSN/SAC" /></td>
                      <td className="px-3 py-2">
                        <select value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} className="border rounded px-2 py-1 text-xs outline-none bg-white">
                          {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
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
                <button type="button" onClick={() => setItems(p => [...p, { name: "", brand_model: "", hsn_sac: "", uom: "Nos", price: 0, qty: 1, tax: 18, discount: 0 }])} className="flex items-center gap-2 text-green-600 font-bold text-xs hover:underline"><PlusCircle size={14} /> Add Line</button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-2">
                {(() => { const t = getTotals(); return (<>
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>&#8377;{t.subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span>-&#8377;{t.total_discount.toLocaleString()}</span></div>
                  {t.total_cgst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>CGST</span><span>&#8377;{t.total_cgst.toLocaleString()}</span></div>}
                  {t.total_sgst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>SGST</span><span>&#8377;{t.total_sgst.toLocaleString()}</span></div>}
                  {t.total_igst > 0 && <div className="flex justify-between text-sm text-gray-600"><span>IGST</span><span>&#8377;{t.total_igst.toLocaleString()}</span></div>}
                  <div className="flex justify-between border-t pt-2 text-lg font-bold text-blue-700"><span>Grand Total</span><span>&#8377;{t.grand_total.toLocaleString()}</span></div>
                </>); })()}
              </div>
            </div>

            <ST>Executive Details</ST>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Executive Name</label>
                <input type="text" value={extra.exec_name} onChange={e => setExtra(ex => ({ ...ex, exec_name: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label>
                <input type="text" value={extra.exec_phone} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setExtra(ex => ({ ...ex, exec_phone: e.target.value })); }} maxLength={13} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Email ID</label>
                <input type="email" value={extra.exec_email} onChange={e => setExtra(ex => ({ ...ex, exec_email: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            </div>

            <ST>Terms &amp; Conditions</ST>
            <div className="space-y-4 bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={extra.terms_general} onChange={e => setExtra(ex => ({ ...ex, terms_general: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                  <div><p className="text-sm font-semibold text-gray-700">General Terms &amp; Conditions</p><p className="text-xs text-gray-500">Standard terms apply to this quotation</p></div>
                </label>
                <div className="flex flex-col gap-1 ml-7">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Custom Note</label>
                  <input type="text" value={extra.custom_terms} onChange={e => setExtra(ex => ({ ...ex, custom_terms: e.target.value }))} placeholder="Additional terms..." className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" />
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={extra.terms_tax} onChange={e => setExtra(ex => ({ ...ex, terms_tax: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" />
                <div><p className="text-sm font-semibold text-gray-700">Tax</p><p className="text-xs text-gray-500">Prices quoted are exclusive of Sales and Service Tax (SEZ - NIL Tax applicable)</p></div>
              </label>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Project Period</label>
                <input type="text" value={extra.terms_project_period} onChange={e => setExtra(ex => ({ ...ex, terms_project_period: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Validity</p>
                <div className="flex flex-wrap gap-4 mt-2">
                  {VALIDITY_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 transition ${extra.terms_validity === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200"}`}>
                      <input type="radio" name="qt_validity" value={opt} checked={extra.terms_validity === opt} onChange={e => setExtra(ex => ({ ...ex, terms_validity: e.target.value }))} className="accent-blue-600" />
                      <span className="text-xs">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Terms</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition ${extra.terms_payment === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="qt_payment" value={opt} checked={extra.terms_payment === opt} onChange={e => setExtra(ex => ({ ...ex, terms_payment: e.target.value }))} className="accent-blue-600" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Warranty</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {WARRANTY_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs transition ${extra.terms_warranty === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="qt_warranty" value={opt} checked={extra.terms_warranty === opt} onChange={e => setExtra(ex => ({ ...ex, terms_warranty: e.target.value }))} className="accent-blue-600" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="bg-blue-600 text-white px-10 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">{editId ? "Update Quotation" : "Create Quotation"}</button>
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="bg-gray-200 text-gray-600 px-10 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* Mail Modal */}
      <div className={`overlay ${mailOpen ? "show" : ""} flex justify-center items-center`}>
        <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-lg p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail size={20} /> Send Quotation</h2>
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
            <button onClick={handleSendEmail} disabled={mailSending} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow transition disabled:opacity-60">{mailSending ? "Sending..." : "Send Email"}</button>
            <button onClick={() => setMailOpen(false)} className="bg-gray-200 text-gray-600 px-8 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-start overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-3xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><History size={20} className="text-indigo-500" /> Previous Versions</h2>
                <p className="text-sm text-indigo-600 font-semibold">{historyCustomerName}</p>
              </div>
              <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setHistoryOpen(false)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-gray-600 font-bold uppercase text-xs border-b">
                    <th className="px-4 py-3 text-left">QT Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(q => (
                    <tr key={q.id} className="border-b hover:bg-indigo-50/40 transition">
                      <td className="px-4 py-3 font-semibold text-blue-600">
                        {fmtSubQT(historyRootId, q.version, q.invoice_date)}
                        <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">v{q.version || 1}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{fmtDate(q.invoice_date)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">&#8377;{q.grand_total?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={e => { e.stopPropagation(); handleEdit(q.id); setHistoryOpen(false); }} title="Edit" className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100"><Edit2 size={14} /></button>
                          <button onClick={e => deleteHistoryVersion(e, q.id)} title="Delete" className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {historyList.length === 0 && <tr><td colSpan="4" className="py-10 text-center text-gray-400 italic">No previous versions</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      {viewId && (
        <div key={viewId} ref={invoiceRef} className="w-full mt-6 bg-white shadow-xl p-6 relative overflow-y-auto">
          <div className="flex gap-3 absolute right-6 top-6 z-10">
            <X className="cursor-pointer text-gray-400 hover:text-red-500 bg-white rounded-full p-1" onClick={() => { setViewId(null); setShowInvoice(false); }} />
          </div>
          <Invoice quotationId={viewId} type="quotation" />
        </div>
      )}
    </div>
  );
};

export default Quotation;
