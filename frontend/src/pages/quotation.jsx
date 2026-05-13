import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, X, Edit2, MinusCircle, Trash2, Mail, MapPin, History } from "lucide-react";
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
    fetchList(); fetchAddresses();
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

  const fetchList = async () => { try { const r=await axios.get(`${API}/api/quotations`); setList(r.data); } catch(e){console.error(e);} };
  const fetchAddresses = async () => { try { const r=await axios.get(`${API}/api/quotations/from-addresses`); setFromAddresses(r.data); } catch(e){console.error(e);} };

  const handleAddAddress = async () => {
    if (!newAddrLabel||!newAddrText) return alert("Label and address required");
    try { const r=await axios.post(`${API}/api/quotations/from-addresses`,{label:newAddrLabel,address:newAddrText}); setFromAddresses(p=>[...p,r.data]); setNewAddrLabel(""); setNewAddrText(""); setShowAddAddress(false); }
    catch(e){ alert("Failed to add address"); }
  };

  const handleEdit = async (id) => {
    try {
      const res = await axios.get(`${API}/api/quotations/${id}`);
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
      if (editId) { const r=await axios.put(`${API}/api/quotations/${editId}`,payload); alert(`Version ${r.data.version||""} saved`); }
      else { await axios.post(`${API}/api/quotations/create`,payload); alert("Created successfully"); }
      setOpen(false); resetForm(); fetchList();
    } catch(err){ console.error(err); alert("Error saving Quotation: "+(err.response?.data?.message||err.message)); }
  };

  const resetForm = () => { setCustomer({customer_name:"",mobile_number:"",email:"",gst_number:"",location_city:""}); setItems([{name:"",brand_model:"",hsn_sac:"",uom:"Nos",price:0,qty:1,tax:18,discount:0}]); setDescInput(""); setQuotationData({quotation_date:todayStr()}); setExtra(emptyExtra()); setEditId(null); setEditingIndex(null); };

  const handleDelete = async () => {
    if (!selectedId) return alert("Select an item to delete");
    if (!window.confirm("Are you sure?")) return;
    try { await axios.delete(`${API}/api/quotations/${selectedId}`); setSelectedId(null); fetchList(); } catch(e){ console.error(e); }
  };

  const handleAddItem = () => {
    if (!descInput.trim()) return;
    const newItem={name:descInput,brand_model:"",hsn_sac:"",uom:"Nos",price:0,qty:1,tax:18,discount:0};
    if (editingIndex!==null) { const u=[...items]; u[editingIndex]={...u[editingIndex],name:descInput}; setItems(u); setEditingIndex(null); }
    else { setItems(p=>p.length===1&&!p[0].name.trim()?[newItem]:[...p,newItem]); }
    setDescInput("");
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
    try { await axios.post(`${API}/api/quotations/send-email/${selectedId}`,{to:mailTo,subject:mailSubject}); alert("Email sent"); setMailOpen(false); }
    catch(e){ alert(e.response?.data?.message||"Failed to send email"); } finally { setMailSending(false); }
  };

  const openHistory = async (e,id,name) => {
    e.stopPropagation();
    try {
      const res=await axios.get(`${API}/api/quotations/customer-history/${id}`);
      setHistoryList(res.data); setHistoryCustomerName(name); setHistorySelectedId(null); setHistorySearch("");
      const cur=list.find(p=>p.id===id); setHistoryRootId(cur?.parent_id||id); setHistoryOpen(true);
    } catch(e){ alert("Failed to load history"); }
  };

  const deleteHistoryVersion = async (e,id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this version?")) return;
    try { await axios.delete(`${API}/api/quotations/${id}`); setHistoryList(p=>p.filter(q=>q.id!==id)); } catch(e){ alert("Failed to delete"); }
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
            <button onClick={async()=>{ const id=viewId||selectedId; if(!id)return alert("Select an invoice first"); try{const r=await fetch(`${API}/api/quotations/download-pdf/${id}`);const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`Quotation_${fmtQT(id,list.find(p=>p.id===id)?.invoice_date)}.pdf`;a.click();URL.revokeObjectURL(url);}catch(e){alert("Download failed");} }} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Download size={20}/></button>
            <button onClick={openMailModal} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Mail size={18}/></button>
            <button onClick={()=>{if(!selectedId)return alert("Select an item");handleEdit(selectedId);}} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Edit2 size={18}/></button>
            <button onClick={handleDelete} className="w-10 h-10 bg-white border rounded-lg shadow-sm flex justify-center items-center hover:bg-gray-50"><Trash2 size={18} className="text-red-500"/></button>
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
    </div>
  );
};

export default Quotation;
