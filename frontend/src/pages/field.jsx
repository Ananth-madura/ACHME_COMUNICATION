import React,{useState,useEffect} from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, ChevronDown, Trash2, Edit, FileText, History, Bell, Clock } from "lucide-react";
import axios from "axios";
import {getToday} from "../utils/leadutil";
import { useAuth } from "../auth/AuthContext";
import { API } from "../config";


const Fields = () =>{
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const getAuthConfig = () => { const token = localStorage.getItem("token"); return { headers: { Authorization: `Bearer ${token}` } }; };
     const [open, setOpen] = useState(false);
    const tabopen = () => {
    setOpen(true);
  };
      const [outcomeOpen, setOutcomeOpen] = useState(false);
      const [showMoreDetails, setShowMoreDetails] = useState(false);
      const [remainderDetails, setRemainderDetails] = useState(false);
      const [followOpen, setFollowOpen] = useState(false);
      const [isEdit, setIsEdit] = useState(false);
      const [editId, setEditId] = useState(null);


     const [form, setForm] = useState({
    customer_name: "",
    mobile_number: "",
    location_city: "",
    visit_date: new Date().toISOString().slice(0, 10),
    purpose: "",
    staff_name: "",
    field_outcome: "New",
    followup_required: "Default",
    followup_date: new Date().toISOString().slice(0, 10),
    followup_notes: "",
    reminder_required: "Default",
    reminder_date: new Date().toISOString().slice(0, 10),
    reference: "",
    email: "",
});

// fetch all data;
 const [fields, setFields] = useState([]);
 const [searchTerm, setSearchTerm] = useState("");
 const [missedCounts, setMissedCounts] = useState({});
 const [teamMembers, setTeamMembers] = useState([]);
 const [historyOpen, setHistoryOpen] = useState(false);
 const [historyLead, setHistoryLead] = useState(null);
 const [historyActivity, setHistoryActivity] = useState([]);
 const [historyReminders, setHistoryReminders] = useState([]);
 const [reminderOpen, setReminderOpen] = useState(false);
 const [reminderLeadId, setReminderLeadId] = useState(null);
 const [reminderLeadName, setReminderLeadName] = useState("");
 const [newReminderDate, setNewReminderDate] = useState("");
 const [newReminderTime, setNewReminderTime] = useState("");
 const [newReminderNote, setNewReminderNote] = useState("");
 const [leadReminders, setLeadReminders] = useState([]);

const fetchFields = async () => {
  try {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const res = await axios.get(`${API}/api/fields`, config);
    setFields(res.data);
  } catch (err) { console.error(err); }
};

const fetchMissedCounts = async () => {
  try {
    const res = await axios.get(`${API}/api/leads/missed-counts/field`, getAuthConfig());
    const map = {};
    res.data.forEach(r => { map[r.lead_id] = r.missed_count; });
    setMissedCounts(map);
  } catch (_) {}
};

useEffect(() => { fetchFields(); fetchMissedCounts();
  axios.get(`${API}/api/teammember`, getAuthConfig()).then(r => setTeamMembers(r.data)).catch(() => {});
}, []);

const formatReminderDate = (dateStr) => {
  if (!dateStr) return "---";
  const d = dateStr.toString().slice(0, 10);
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[parseInt(m,10)-1]} ${y}`;
};

const openHistory = async (lead) => {
  setHistoryLead(lead);
  try {
    const [actRes, remRes] = await Promise.all([
      axios.get(`${API}/api/leads/activity/field/${lead.id}`, getAuthConfig()),
      axios.get(`${API}/api/leads/reminders/field/${lead.id}`, getAuthConfig()),
    ]);
    setHistoryActivity(actRes.data);
    setHistoryReminders(remRes.data);
  } catch (_) {}
  setHistoryOpen(true);
};

const openReminderPanel = async (lead) => {
  setReminderLeadId(lead.id); setReminderLeadName(lead.customer_name);
  setNewReminderDate(""); setNewReminderTime(""); setNewReminderNote("");
  try {
    await axios.post(`${API}/api/leads/check-missed`, {}, getAuthConfig()).catch(() => {});
    const res = await axios.get(`${API}/api/leads/reminders/field/${lead.id}`, getAuthConfig());
    setLeadReminders(res.data);
  } catch (_) { setLeadReminders([]); }
  setReminderOpen(true);
};

const saveReminder = async () => {
  if (!newReminderDate) return alert("Please select a date");
  try {
    await axios.post(`${API}/api/leads/reminders`, {
      lead_id: reminderLeadId, lead_type: "field",
      reminder_date: newReminderDate, reminder_time: newReminderTime || null, reminder_notes: newReminderNote,
    }, getAuthConfig());
    const res = await axios.get(`${API}/api/leads/reminders/field/${reminderLeadId}`, getAuthConfig());
    setLeadReminders(res.data); fetchMissedCounts();
    setNewReminderDate(""); setNewReminderTime(""); setNewReminderNote("");
  } catch (_) { alert("Failed to save reminder"); }
};

const deleteReminder = async (id) => {
  await axios.delete(`${API}/api/leads/reminders/${id}`, getAuthConfig());
  setLeadReminders(prev => prev.filter(r => r.id !== id)); fetchMissedCounts();
};

// handlechange;

   const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

// handle Submit;
const handleSubmit = async (e) => {
  e.preventDefault();
  const today = getToday();

  const payload = {
    ...form,
    visit_date: form.visit_date || today,
  };

  try {
    if (isEdit) {
      await axios.put(`${API}/api/fields/${editId}`, payload, getAuthConfig());
      alert("Successfully Updated");
      setForm(prev => ({
        ...prev,
        followup_required: "Default", followup_date: "", followup_notes: "",
        reminder_required: "Default", reminder_date: "", reminder_notes: "",
      }));
    } else {
      await axios.post(`${API}/api/fields/new`, payload, getAuthConfig());
      alert("Successfully Created");
    }

    fetchFields();
    setOpen(false);
    setIsEdit(false);
  } catch (err) {
    console.error("Error saving field:", err);
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to save field";
    alert(msg);
  }
};

  // Date Time
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


// Edit 
const openEdit = async (id) => {
  try {
    const res = await axios.get(`${API}/api/fields/${id}`, getAuthConfig());
    const data = res.data;

    setForm({
      customer_name: data.customer_name || "",
      mobile_number: data.mobile_number || "",
      location_city: data.location_city || "",
      visit_date: data.visit_date
        ? data.visit_date.split("T")[0]
        : "",
      purpose: data.purpose || "",
      staff_name: data.staff_name || "",
      field_outcome: data.field_outcome || "New",
      followup_required: data.followup_required || "Default",
      followup_date: data.followup_date
        ? data.followup_date.split("T")[0]
        : "",
      followup_notes: data.followup_notes || "",
      reminder_required: data.reminder_required || "Default",
      reminder_date: data.reminder_date
        ? data.reminder_date.split("T")[0]
        : "",
      reminder_notes: data.reminder_notes || "",
      reference: data.reference || "",
      email: data.email || "",
      gst_number: data.gst_number || "",
    });

    setEditId(id);
    setIsEdit(true);
    setOpen(true);
  } catch (err) {
    console.error(err);
    alert("Failed to load field data");
  }
};


// delete 
    const deletefield = async (id) => {
  if(!window.confirm("Are you sure?")) return;
  try {
    await axios.delete(`${API}/api/fields/${id}`, getAuthConfig());
    fetchFields();
  } catch (err) {
    alert("message Deleted", err)
  }
};

 useEffect(() => {
  document.body.style.overflow = open ? "hidden" : "auto";
  return () => (document.body.style.overflow = "auto");
}, [open]);


useEffect(() => {
  if (open) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
  }
  
  // Clean up when component unmounts
  return () => document.body.classList.remove("modal-open");
}, [open]);

   return(
     <center>
        <div className="invoice-heading-tab flex gap-4 justify-between item-center">
        <div>
          <h2 className="text-2xl font-[Times-Roman] text-[25px] font-bold text-[#1694CE]">Field Summary</h2>
          <a  className="text-[30px] text-black-500 font-['Times_New_Roman',serif] mr-[84px]" href="vii">
            Leed &gt; Fields
          </a>
        </div>

        <div className="flex gap-3 ">
          <div className="flex items-center gap-3 bg-gray px-2 py-1 rounded-lg  border w-50 h-9 mt-4">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search by customer name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="Search outline-none text-sm w-full bg-gray-100"
            />
          </div>

          <div className="mt-2">
            <button
              onClick={() => { setIsEdit(false); setForm({customer_name: "", mobile_number: "", location_city: "", visit_date: new Date().toISOString().slice(0, 10), purpose: "", staff_name: "", field_outcome: "New", followup_required: "Default", followup_date: new Date().toISOString().slice(0, 10), followup_notes: "", reminder_required: "Default", reminder_date: new Date().toISOString().slice(0, 10), reminder_notes: "", reference: "", email: ""}); setOpen(true); }}
              className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848] "
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>

      {/*Forms  */}
         <div className="application-maintab  p-5">
           <div className={`overlay ${open ? "show" : ""} justify-items-center `}>
           <div  className={`task-application bg-white shadow ml-[70px] w-[65%] mt-[65px]  mb-[50px]   p-10 rounded-lg  ${
             open ? "show" : ""
            }`}>
              {/*  */}

                 <div className="flex justify-between items-center ">
                    <h2 className="text-2xl font-semibold mb-8 text-gray-700 mt-[-20px]">
                        {isEdit ? "Edit Field Summary" : "Add A Field Summary"}
                     </h2>
                    <span className="mt-[-20px] x-icon" >
                     <X onClick={() => setOpen(false)} />
                       </span>
                     </div>

            <form  onSubmit={handleSubmit} action="" className=" invoice-form p-6 space-y-6 relative">
                <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Customer Name</label>
                   <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="e.g. Ravi Kumar" onKeyDown={e => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>

                {/*  */}
                 <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Mobile Number</label>
                   <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleChange} maxLength={13} inputMode="numeric" onKeyDown={e => { if (!/[0-9]/.test(e.key) && !["Backspace","Delete","ArrowLeft","ArrowRight","Tab"].includes(e.key)) e.preventDefault(); }} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>

                {/*  */}

                 <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Location / City</label>
                   <input type="text" name="location_city" value={form.location_city} onChange={handleChange}  className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>
               
                 {/*  */}

                 <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor=""  className="text-sm text-gray-600 text-left">Field Visit Date</label>
                   <input type="Date" readOnly name="visit_date" value={form.visit_date} onChange={handleChange} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>

                {/*  */}
                <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Purpose</label>
                   <input type="text" name="purpose" value={form.purpose} onChange={handleChange} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>
                {/*  */}
                <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Staff Name</label>
                   <div className="col-span-3">
                     <select name="staff_name" value={form.staff_name} onChange={handleChange}
                       className="border rounded-md px-3 py-2 outline-none bg-white w-full text-sm">
                       <option value="">-- Select Staff --</option>
                       {teamMembers.map(t => (
                         <option key={t.id} value={`${t.first_name} ${t.last_name || ""}`.trim()}>
                           {t.first_name} {t.last_name || ""} {t.job_title ? `(${t.job_title})` : ""}
                         </option>
                       ))}
                     </select>
                   </div>
                </div>

                {/* Reference */}
                <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Reference</label>
                   <input type="text" name="reference" value={form.reference} onChange={handleChange} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>

                <div className="grid grid-cols-4 items-center gap-6">
                   <label htmlFor="" className="text-sm text-gray-600 text-left">Email</label>
                   <input type="email" name="email" value={form.email} onChange={handleChange} className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"/>
                </div>

             
  
              {/*Call outcome  */}
                 
                <div className="grid grid-cols-4 items-center gap-6">
                 <label className="text-sm text-gray-600 text-left">Field Outcome <span className="text-red-500">*</span>
                </label>
                 <div className="relative col-span-3">
    {/* INPUT */}
                  <input type="text" readOnly  name="field_outcome" value={form.field_outcome} placeholder="Select Outcome"   onClick={() => setOutcomeOpen(!outcomeOpen)}
                  className="border rounded-md px-3 py-2 outline-none w-full cursor-pointer "/>

    {/* ICON */}
                 <ChevronDown
                   size={18}
                   className={`absolute top-3.5 right-4 cursor-pointer transition-transform duration-300 ${
                   outcomeOpen ? "rotate-180" : ""
                     }`}
                  onClick={() => setOutcomeOpen(!outcomeOpen)} />

         {/* DROPDOWN OPTIONS */}
              {outcomeOpen && (
                 <div className="absolute left-0 right-0 bg-white border rounded-md mt-1 shadow-lg z-20">
                 {["New", "Hot Case", "Warm Case", "Cold Case", "Not Required", "Converted"].map((outcome) => (
           <div key={outcome} onClick={() => { setForm({ ...form, field_outcome: outcome }); setOutcomeOpen(false); }}
             className="px-3 py-2 cursor-pointer hover:bg-blue-600 hover:text-white text-left">{outcome}</div>
         ))}
       </div>
     )}
   </div>
   </div>

   {/* ── Follow-up & Reminder ── */}
               <div className="border-t pt-4 mt-2">
                 <div className="flex justify-between items-center mb-3">
                   <span className="text-sm font-bold text-gray-700">Follow-up & Reminder</span>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" checked={showMoreDetails} onChange={() => setShowMoreDetails(!showMoreDetails)} />
                     <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-4 after:w-4 after:rounded-full after:transition peer-checked:after:translate-x-5"></div>
                   </label>
                 </div>
                 {showMoreDetails && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                     <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40">
                       <div className="flex items-center gap-2 mb-3"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Follow-up</span></div>
                       <div className="space-y-3">
                         <div><label className="text-xs font-semibold text-gray-500">Required</label>
                           <div className="relative mt-1">
                             <input type="text" readOnly value={form.followup_required} onClick={() => setFollowOpen(!followOpen)} className="border rounded-lg px-3 py-2 outline-none w-full cursor-pointer bg-white text-sm" />
                             <ChevronDown size={15} className={`absolute top-3 right-3 cursor-pointer transition-transform ${followOpen ? "rotate-180" : ""}`} onClick={() => setFollowOpen(!followOpen)} />
                             {followOpen && (<div className="absolute left-0 right-0 bg-white border rounded-lg mt-1 shadow-lg z-20">{["Yes","No"].map(o => (<div key={o} onClick={() => { setForm({...form, followup_required: o}); setFollowOpen(false); }} className="px-3 py-2 cursor-pointer hover:bg-blue-600 hover:text-white text-sm">{o}</div>))}</div>)}
                           </div>
                         </div>
                         <div><label className="text-xs font-semibold text-gray-500">Date</label><input type="date" value={form.followup_date} onChange={handleChange} name="followup_date" className="border rounded-lg px-3 py-2 outline-none bg-white w-full text-sm mt-1" /></div>
                         <div><label className="text-xs font-semibold text-gray-500">Notes</label><textarea value={form.followup_notes} onChange={handleChange} name="followup_notes" rows={2} placeholder="Follow-up notes..." className="border rounded-lg px-3 py-2 outline-none bg-white w-full text-sm mt-1 resize-none" /></div>
                       </div>
                     </div>
                     <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50/40">
                       <div className="flex items-center gap-2 mb-3"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Reminder</span></div>
                       <div className="space-y-3">
                         <div><label className="text-xs font-semibold text-gray-500">Required</label>
                           <div className="relative mt-1">
                             <input type="text" readOnly value={form.reminder_required} onClick={() => setRemainderDetails(!remainderDetails)} className="border rounded-lg px-3 py-2 outline-none w-full cursor-pointer bg-white text-sm" />
                             <ChevronDown size={15} className={`absolute top-3 right-3 cursor-pointer transition-transform ${remainderDetails ? "rotate-180" : ""}`} onClick={() => setRemainderDetails(!remainderDetails)} />
                             {remainderDetails && (<div className="absolute left-0 right-0 bg-white border rounded-lg mt-1 shadow-lg z-20">{["Yes","No"].map(o => (<div key={o} onClick={() => { setForm({...form, reminder_required: o}); setRemainderDetails(false); }} className="px-3 py-2 cursor-pointer hover:bg-yellow-500 hover:text-white text-sm">{o}</div>))}</div>)}
                           </div>
                         </div>
                         <div><label className="text-xs font-semibold text-gray-500">Date</label><input type="date" value={form.reminder_date} onChange={handleChange} name="reminder_date" className="border rounded-lg px-3 py-2 outline-none bg-white w-full text-sm mt-1" /></div>
                         <div><label className="text-xs font-semibold text-gray-500">Notes</label><textarea value={form.reminder_notes} onChange={handleChange} name="reminder_notes" rows={2} placeholder="Reminder notes..." className="border rounded-lg px-3 py-2 outline-none bg-white w-full text-sm mt-1 resize-none" /></div>
                       </div>
                     </div>
                   </div>
                 )}
               </div>

  {/* submit and close */}
      <div className="flex gap-4 pt-4 z-30 more">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Submit</button>
                <button type="button" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  onClick={() => { sessionStorage.setItem("qt_prefill", JSON.stringify({ customer_name: form.customer_name, mobile_number: form.mobile_number, email: form.email || "", location_city: form.location_city, lead_id: editId || null, lead_type: "field" })); window.location.href = "/dashboard/proposal"; }}>
                  <FileText size={15} /> Create Quotation
                </button>
                <button onClick={() => setOpen(false)} type="button" className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-red-500">Close</button>
              </div>
   </form>
   
  </div>
  </div>
  </div>
       {/* table */}
         <div className="bg-white shadow rounded-xl overflow-auto mt-5">
            <table className="w-full text-sm border border-gray-200 border-collapse">
               <thead className="bg-[#f8faf9] rounded-xl">
                   <tr className="text-black font-[Times-New-Roman] border-b border-gray-300 uppercase text-xs">
                    <th className="px-4 py-3 border">ID</th>
                    <th className="px-4 py-3 border">Customer Name</th>
                    <th className="px-4 py-3 border">Mobile Number</th>
                    <th className="px-4 py-3 border">Visit Date</th>
                    <th className="px-4 py-3 border">Staff Name</th>
                     <th className="px-4 py-3 border">Created By</th>
                    <th className="px-4 py-3 border">Status</th>
                    <th className="px-4 py-3 border w-[130px]">Actions</th>
                   </tr>
               </thead>
               <tbody className="text-sm font-[Times-New-Roman] text-center">
                 {fields.filter(f => f.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())).map((f) => {
                   const statusColors = {
                     "New": "bg-gray-100 text-gray-700", "Hot Case": "bg-red-100 text-red-700",
                     "Warm Case": "bg-orange-100 text-orange-700", "Cold Case": "bg-blue-100 text-blue-700",
                     "Not Required": "bg-gray-200 text-gray-500", "Converted": "bg-green-100 text-green-700",
                     "Disqualified": "bg-red-100 text-red-700",
                   };
                   const missed = missedCounts[f.id] || 0;
                   return (
                   <tr key={f.id} className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer">
                    <td className="px-4 py-3 border">{f.id}</td>
                    <td className="px-4 py-3 border text-left font-medium">{f.customer_name}</td>
                    <td className="px-4 py-3 border">{f.mobile_number}</td>
                    <td className="px-4 py-3 border">{formatDate(f.visit_date)}</td>
                    <td className="px-4 py-3 border">{f.staff_name || "---"}</td>
                                          <td className="border px-4 py-3 border">
                       <div className="flex flex-col items-center">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Added By</span>
                         <span className="text-xs font-semibold text-blue-600">{f.creator_name || "Admin"}</span>
                       </div>
                     </td>

                    <td className="px-4 py-3 border">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[f.field_outcome] || "bg-gray-100 text-gray-600"}`}>{f.field_outcome}</span>
                    </td>
                    <td className="px-4 py-3 border">
                      <div className="flex gap-2 justify-center items-center">
                        <button type="button" onClick={() => openReminderPanel(f)} title="Reminders" className="relative text-yellow-500 hover:text-yellow-700">
                          <Bell size={16} />
                          {missed > 0 && <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-black px-1 rounded-full text-white ${missed >= 3 ? "bg-red-600" : "bg-orange-500"}`}>{missed}</span>}
                        </button>
                        <button type="button" onClick={() => openHistory(f)} title="History" className="text-indigo-500 hover:text-indigo-700"><History size={16} /></button>
                        <button 
                          type="button" 
                          onClick={async () => {
                            if (!f.customer_name) {
                              alert("Cannot convert: Customer name is missing");
                              return;
                            }
                            if (!window.confirm(`Convert "${f.customer_name}" to Client?`)) return;
                            try {
                              await axios.put(`${API}/api/leads/field/${f.id}`, { field_outcome: "Converted" }, getAuthConfig());
                              alert("Lead converted to Client successfully!");
                              fetchFields();
                              window.dispatchEvent(new Event("refresh-clients"));
                            } catch (err) {
                              console.error("Convert error:", err);
                              const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to convert lead";
                              alert("Conversion failed: " + msg);
                            }
                          }} 
                          title="Convert to Client" 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FileText size={16} />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(f.id); }} className="text-green-600 hover:text-green-800"><Edit size={18} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); deletefield(f.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                      </div>
                    </td>
                   </tr>
                   );
                 })}
               </tbody>
            </table>
         </div>

   {/* History Modal */}
   {historyOpen && historyLead && (
     <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-start overflow-y-auto pt-10 pb-10">
       <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-2xl p-6">
         <div className="flex justify-between items-center mb-4 border-b pb-3">
           <div><h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><History size={18} className="text-indigo-500" /> Lead History</h2><p className="text-sm text-indigo-600 font-semibold">{historyLead.customer_name} · {historyLead.mobile_number}</p></div>
           <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setHistoryOpen(false)} />
         </div>
         <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-xl p-4 mb-5 border">
           <div><span className="text-gray-400 text-xs font-semibold uppercase">Status</span><div className="mt-0.5"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{historyLead.field_outcome}</span></div></div>
           <div><span className="text-gray-400 text-xs font-semibold uppercase">Staff</span><div className="mt-0.5 font-medium">{historyLead.staff_name || "---"}</div></div>
           <div><span className="text-gray-400 text-xs font-semibold uppercase">Purpose</span><div className="mt-0.5">{historyLead.purpose || "---"}</div></div>
           <div><span className="text-gray-400 text-xs font-semibold uppercase">City</span><div className="mt-0.5">{historyLead.location_city || "---"}</div></div>
           <div><span className="text-gray-400 text-xs font-semibold uppercase">Reference</span><div className="mt-0.5">{historyLead.reference || "---"}</div></div>
           <div><span className="text-gray-400 text-xs font-semibold uppercase">Visit Date</span><div className="mt-0.5">{formatDate(historyLead.visit_date)}</div></div>
         </div>
         <div className="mb-5">
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Bell size={13} className="text-yellow-500" /> Reminder Log <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{historyReminders.length}</span></h3>
           {historyReminders.length === 0 ? <p className="text-xs text-gray-400 italic bg-gray-50 rounded-lg p-3">No reminders set.</p> : (
             <div className="space-y-2">{historyReminders.map((r, idx) => (
               <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${r.status === "Missed" ? "bg-red-50 border-red-200" : r.status === "Done" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                 <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gray-400">{idx+1}</div>
                 <div className="flex-1"><div className="font-semibold text-gray-800">{formatReminderDate(r.reminder_date)}{r.reminder_time ? ` · ${r.reminder_time.slice(0,5)}` : ""}</div>{r.reminder_notes && <div className="text-gray-500 text-xs mt-0.5">{r.reminder_notes}</div>}</div>
                 <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === "Missed" ? "bg-red-600 text-white" : r.status === "Done" ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}>{r.status}</span>
               </div>
             ))}</div>
           )}
         </div>
         <div>
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Clock size={13} className="text-blue-500" /> Activity Timeline <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{historyActivity.length}</span></h3>
           {historyActivity.length === 0 ? <p className="text-xs text-gray-400 italic bg-gray-50 rounded-lg p-3">No activity recorded.</p> : (
             <div className="relative"><div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
               <div className="space-y-3 pl-8">{historyActivity.map(a => {
                 const c = a.action === "Lead Created" ? "bg-green-500" : a.action === "Status Updated" ? "bg-blue-500" : a.action === "Follow-up Scheduled" ? "bg-indigo-500" : "bg-yellow-500";
                 return (<div key={a.id} className="relative"><div className={`absolute -left-5 w-3 h-3 rounded-full ${c} border-2 border-white`}></div>
                   <div className="bg-gray-50 rounded-lg p-3 border"><div className="flex justify-between items-start"><span className="font-semibold text-sm text-gray-800">{a.action}</span><span className="text-xs text-gray-400 ml-2">{new Date(a.created_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span></div>{a.details && <p className="text-xs text-gray-500 mt-1">{a.details}</p>}</div>
                 </div>);
               })}</div>
             </div>
           )}
         </div>
       </div>
     </div>
   )}

   {/* Reminder Panel */}
   {reminderOpen && (
     <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-start overflow-y-auto pt-10 pb-10">
       <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-lg p-6">
         <div className="flex justify-between items-center mb-4 border-b pb-3">
           <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Bell size={18} className="text-yellow-500" /> Reminders — {reminderLeadName}</h2>
           <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setReminderOpen(false)} />
         </div>
         <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
           <p className="text-xs font-bold text-gray-500 uppercase">Set New Reminder</p>
           <div className="grid grid-cols-2 gap-3">
             <div><label className="text-xs text-gray-500 font-semibold">Date *</label><input type="date" value={newReminderDate} onChange={e => setNewReminderDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none mt-1" /></div>
             <div><label className="text-xs text-gray-500 font-semibold">Time</label><input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none mt-1" /></div>
           </div>
           <div><label className="text-xs text-gray-500 font-semibold">Note</label><input type="text" value={newReminderNote} onChange={e => setNewReminderNote(e.target.value)} placeholder="e.g. Follow up on visit" className="w-full border rounded-lg px-3 py-2 text-sm outline-none mt-1" /></div>
           <button onClick={saveReminder} className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 text-sm">+ Add Reminder</button>
         </div>
         <p className="text-xs font-bold text-gray-500 uppercase mb-2">Existing Reminders</p>
         {leadReminders.length === 0 ? <p className="text-xs text-gray-400 italic">No reminders yet.</p> : (
           <div className="space-y-2">{leadReminders.map(r => (
             <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${r.status === "Missed" ? "bg-red-50 border-red-200" : r.status === "Done" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
               <div><div className="font-semibold">{formatReminderDate(r.reminder_date)}{r.reminder_time ? ` at ${r.reminder_time.slice(0,5)}` : ""}</div>{r.reminder_notes && <div className="text-gray-500 text-xs mt-0.5">{r.reminder_notes}</div>}</div>
               <div className="flex items-center gap-2">
                 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === "Missed" ? "bg-red-600 text-white" : r.status === "Done" ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}>{r.status}</span>
                                   {r.status === "Pending" && <button onClick={() => { axios.put(`${API}/api/leads/reminders/${r.id}`, {status:"Done"}, getAuthConfig()); setLeadReminders(prev => prev.map(x => x.id===r.id ? {...x,status:"Done"} : x)); }} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-bold">Done</button>}

                 <button onClick={() => deleteReminder(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
               </div>
             </div>
           ))}</div>
         )}
       </div>
     </div>
   )}
         
      </center>
    )
}
export default Fields;