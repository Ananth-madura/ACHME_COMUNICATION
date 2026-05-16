import React, { useState, useEffect, useCallback, useMemo } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, Trash2, Edit, ChevronDown, ChevronRight, Clock, MapPin, Calendar, FileText, DollarSign, CheckCircle, Phone, User, Wrench, Link as LinkIcon, Layers, Target, Zap } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";

const API = "http://localhost:5000";

const getAuthConfig = () => { const token = localStorage.getItem("token"); return { headers: { Authorization: `Bearer ${token}` } }; };
const getUserRole = () => { try { return JSON.parse(localStorage.getItem("user") || "{}").role || "employee"; } catch { return "employee"; } };

const BREAKPOINT_STAGES = [
  { key: "arrival", label: "Arrival", icon: MapPin, color: "#1694CE" },
  { key: "diagnosis", label: "Diagnosis", icon: Search, color: "#dd5b00" },
  { key: "repair", label: "Repair/Work", icon: Wrench, color: "#5645d4" },
  { key: "testing", label: "Testing", icon: Zap, color: "#1aae39" },
  { key: "completion", label: "Completion", icon: CheckCircle, color: "#1aae39" },
];

const CallReport = () => {
  const userRole = getUserRole();
  const canEditDelete = userRole === "admin" || userRole === "subadmin";
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterContract, setFilterContract] = useState("");
  const [expandedContracts, setExpandedContracts] = useState({});

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailService, setDetailService] = useState(null);
  const [detailBreakpoints, setDetailBreakpoints] = useState([]);

  // Service Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [isEditService, setIsEditService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [contractUsage, setContractUsage] = useState(null);
  const [serviceContracts, setServiceContracts] = useState([]);

  const [serviceForm, setServiceForm] = useState({
    contract_id: "",
    contract_title: "",
    service_type: "AMC",
    customer_name: "",
    mobile_number: "",
    location_city: "",
    service_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    end_time: "",
    duration_limit: "",
    km: "",
    technician: "",
    sales_person: "",
    service_person: "",
    description: "",
    remarks: "",
    petrol_charges: "",
    spare_parts_price: "",
    labour_charges: "",
    total_expenses: "",
    amount_collected: "",
    payment_mode: "",
    status: "Completed",
    call_number: 1,
    breakpoints: JSON.stringify({ arrival: false, diagnosis: false, repair: false, testing: false, completion: false }),
  });

  const calcTotalMinutes = () => {
    const { start_time, end_time } = serviceForm;
    if (!start_time || !end_time) return null;
    const [sh, sm] = start_time.split(":").map(Number);
    const [eh, em] = end_time.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  };

  const isDurationExceeded = () => {
    const { duration_limit } = serviceForm;
    if (!duration_limit) return false;
    const actual = calcTotalMinutes();
    return actual !== null && actual > parseInt(duration_limit);
  };



  const fetchContracts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/contract/with-usage`, getAuthConfig());
      setContracts(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/amc/amc-alc`, getAuthConfig());
      setServices(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchReports = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/call-reports`, getAuthConfig()); } catch (err) { console.error(err); }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/call-reports/performance`, getAuthConfig()); } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchContracts(); fetchServices(); fetchReports(); fetchPerformance(); }, [fetchContracts, fetchServices, fetchReports, fetchPerformance]);

  useEffect(() => {
    const handleDataChanged = () => { fetchContracts(); fetchServices(); fetchReports(); fetchPerformance(); };
    socket.on("data_changed", handleDataChanged);
    return () => socket.off("data_changed", handleDataChanged);
  }, [fetchContracts, fetchServices, fetchReports, fetchPerformance]);

  const fetchServiceContracts = async () => {
    try { const res = await axios.get(`${API}/api/contract/with-usage`, getAuthConfig()); setServiceContracts(res.data || []); } catch (err) { setServiceContracts([]); }
  };
  useEffect(() => { fetchServiceContracts(); }, []);

  const fetchContractUsageForService = async (contractId) => {
    try { const res = await axios.get(`${API}/api/contract/usage/${contractId}`, getAuthConfig()); setContractUsage(res.data); } catch (err) { setContractUsage(null); }
  };

  const selectServiceContract = (contract) => {
    setSelectedContract(contract);
    const contractServices = services.filter(s => s.contract_id === contract.id);
    const nextCallNum = contractServices.length + 1;
    setServiceForm(prev => ({
      ...prev,
      contract_id: contract.id,
      contract_title: contract.contract_title || "",
      customer_name: contract.client_company || "",
      mobile_number: contract.mobile_number || "",
      location_city: contract.location_city || "",
      service_type: contract.contract_type || "AMC",
      call_number: nextCallNum,
    }));
    fetchContractUsageForService(contract.id);
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceForm({ ...serviceForm, [name]: value });
  };

  const toggleBreakpoint = (key) => {
    try {
      const bp = JSON.parse(serviceForm.breakpoints || "{}");
      bp[key] = !bp[key];
      setServiceForm({ ...serviceForm, breakpoints: JSON.stringify(bp) });
    } catch { setServiceForm({ ...serviceForm, breakpoints: JSON.stringify({ [key]: true }) }); }
  };

  const getBreakpointStatus = (service) => {
    try { return JSON.parse(service.breakpoints || "{}"); } catch { return {}; }
  };

  const getCallNumber = (service) => {
    if (service.call_number) return service.call_number;
    const sameContract = services.filter(s => s.contract_id === service.contract_id && s.id <= service.id);
    return sameContract.length;
  };

  useEffect(() => {
    const petrol = parseFloat(serviceForm.petrol_charges) || 0;
    const spare = parseFloat(serviceForm.spare_parts_price) || 0;
    const labour = parseFloat(serviceForm.labour_charges) || 0;
    setServiceForm(prev => ({ ...prev, total_expenses: (petrol + spare + labour).toString() }));
  }, [serviceForm.petrol_charges, serviceForm.spare_parts_price, serviceForm.labour_charges]);

  const saveService = async (e) => {
    e.preventDefault();
    if (isDurationExceeded() && !serviceForm.remarks.trim()) {
      alert("Remark is required when service duration exceeds the selected limit.");
      return;
    }
    try {
      const payload = {
        ...serviceForm,
        petrol_charges: parseFloat(serviceForm.petrol_charges) || 0,
        spare_parts_price: parseFloat(serviceForm.spare_parts_price) || 0,
        labour_charges: parseFloat(serviceForm.labour_charges) || 0,
        total_expenses: parseFloat(serviceForm.total_expenses) || 0,
        amount_collected: parseFloat(serviceForm.amount_collected) || 0,
      };
      if (isEditService && selectedServiceId) {
        await axios.put(`${API}/api/amc/amc-alc/${selectedServiceId}`, payload, getAuthConfig());
        alert("Service updated!");
      } else {
        await axios.post(`${API}/api/amc/amc-alc`, payload, getAuthConfig());
        alert("Service recorded!");
      }
      setServiceModalOpen(false);
      resetServiceForm();
      fetchServices();
    } catch (err) { alert("Failed: " + (err.response?.data?.error || err.message)); }
  };

  const openEditService = (service) => {
    setServiceForm({
      contract_id: service.contract_id || "",
      contract_title: service.contract_title || "",
      service_type: service.service_type || "AMC",
      customer_name: service.customer_name || "",
      mobile_number: service.mobile_number || "",
      location_city: service.location_city || "",
      service_date: service.service_date?.split("T")[0] || "",
      start_time: service.start_time || "",
      end_time: service.end_time || "",
      duration_limit: service.duration_limit || "",
      km: service.km || "",
      technician: service.technician || "",
      sales_person: service.sales_person || "",
      service_person: service.service_person || "",
      description: service.description || "",
      remarks: service.remarks || "",
      petrol_charges: service.petrol_charges?.toString() || "",
      spare_parts_price: service.spare_parts_price?.toString() || "",
      labour_charges: service.labour_charges?.toString() || "",
      total_expenses: service.total_expenses?.toString() || "",
      amount_collected: service.amount_collected?.toString() || "",
      payment_mode: service.payment_mode || "",
      status: service.status || "Completed",
      call_number: service.call_number || getCallNumber(service),
      breakpoints: service.breakpoints || JSON.stringify({ arrival: false, diagnosis: false, repair: false, testing: false, completion: false }),
    });
    setSelectedServiceId(service.id);
    setIsEditService(true);
    setServiceModalOpen(true);
    if (service.contract_id) {
      fetchContractUsageForService(service.contract_id);
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try { await axios.delete(`${API}/api/amc/amc-alc/${id}`, getAuthConfig()); fetchServices(); } catch (err) { alert("Failed to delete"); }
  };

  const resetServiceForm = () => {
    setServiceForm({
      contract_id: "", contract_title: "", service_type: "AMC",
      customer_name: "", mobile_number: "", location_city: "",
      service_date: new Date().toISOString().slice(0, 10),
      start_time: "", end_time: "", duration_limit: "", km: "",
      technician: "", sales_person: "", service_person: "",
      description: "", remarks: "",
      petrol_charges: "", spare_parts_price: "", labour_charges: "", total_expenses: "",
      amount_collected: "", payment_mode: "", status: "Completed",
      call_number: 1,
      breakpoints: JSON.stringify({ arrival: false, diagnosis: false, repair: false, testing: false, completion: false }),
    });
    setSelectedContract(null); setContractUsage(null);
    setIsEditService(false); setSelectedServiceId(null);
  };

  const openServiceDetail = (service) => {
    setDetailService(service);
    setDetailBreakpoints(getBreakpointStatus(service));
    setDetailOpen(true);
  };

  const openAMCPage = () => { navigate("/dashboard/amc"); };

  // Group services by contract
  const servicesByContract = useMemo(() => {
    const grouped = {};
    services.forEach(s => {
      const cid = s.contract_id || "no-contract";
      if (!grouped[cid]) grouped[cid] = { contract_title: s.contract_title || "No Contract", customer_name: s.customer_name, service_type: s.service_type, services: [] };
      grouped[cid].services.push(s);
    });
    Object.values(grouped).forEach(g => g.services.sort((a, b) => (a.call_number || 0) - (b.call_number || 0)));
    return grouped;
  }, [services]);

  const filteredContractIds = useMemo(() => {
    if (!filterContract) return Object.keys(servicesByContract);
    return Object.entries(servicesByContract)
      .filter(([_, g]) => g.contract_title?.toLowerCase().includes(filterContract.toLowerCase()) || g.customer_name?.toLowerCase().includes(filterContract.toLowerCase()))
      .map(([id]) => id);
  }, [servicesByContract, filterContract]);

  const totalContractValue = contracts.reduce((sum, c) => sum + (parseFloat(c.amount_value) || 0), 0);
  const totalServices = services.length;
  const completedServices = services.filter(s => s.status === "Completed").length;

  const toggleContract = (id) => setExpandedContracts(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const formatCurrency = (v) => `₹${(parseFloat(v) || 0).toLocaleString()}`;

  const typeColors = {
    AMC: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
    ALC: { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
    "Service Call": { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
    Installation: { bg: "#f3e8ff", text: "#7c3aed", border: "#c4b5fd" },
    Warranty: { bg: "#ccfbf1", text: "#0d9488", border: "#5eead4" },
  };

  return (
    <div className="w-full p-2 md:p-4" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#1694CE", letterSpacing: "-0.5px" }}>Call Report</h1>
          <p className="text-xs md:text-sm" style={{ color: "#94a3b8" }}>Dashboard &gt; Services &gt; Call Report</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openAMCPage} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            <LinkIcon size={14} /> AMC Page
          </button>
          <button onClick={() => { resetServiceForm(); setServiceModalOpen(true); }} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ background: "#FF3355" }}>
            <Plus size={16} /> New Call
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Contracts", value: contracts.length, icon: FileText, color: "#1694CE", bg: "#dbeafe" },
          { label: "Contract Value", value: formatCurrency(totalContractValue), icon: DollarSign, color: "#16a34a", bg: "#dcfce7" },
          { label: "Total Calls", value: totalServices, icon: Phone, color: "#dd5b00", bg: "#fef3c7" },
          { label: "Completed", value: `${completedServices}/${totalServices}`, icon: CheckCircle, color: "#0d9488", bg: "#ccfbf1" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4 border" style={{ background: "#fff", borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "#64748b" }}>{s.label}</p>
                <p className="text-lg font-bold" style={{ color: "#1e293b" }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border p-4 mb-6" style={{ borderColor: "#e2e8f0" }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
            <Search size={16} style={{ color: "#94a3b8" }} />
            <input type="text" placeholder="Search by contract, customer..." className="outline-none text-sm w-full bg-transparent" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setFilterContract(e.target.value); }} />
          </div>
        </div>
      </div>

      {/* Contract Groups */}
      <div className="space-y-4">
        {filteredContractIds.map(cid => {
          const group = servicesByContract[cid];
          const isExpanded = expandedContracts[cid];
          const contract = contracts.find(c => c.id === parseInt(cid));
          const remaining = contract ? parseFloat(contract.remaining || 0) : null;

          return (
            <div key={cid} className="rounded-xl border overflow-hidden" style={{ borderColor: "#e2e8f0", background: "#fff" }}>
              {/* Contract Header */}
              <button
                onClick={() => toggleContract(cid)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: typeColors[group.service_type]?.bg || "#f1f5f9" }}>
                    <Layers size={16} style={{ color: typeColors[group.service_type]?.text || "#64748b" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold" style={{ color: "#1e293b" }}>{group.contract_title}</p>
                    <p className="text-xs" style={{ color: "#64748b" }}>{group.customer_name} • {group.services.length} call{group.services.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {remaining !== null && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs" style={{ color: "#64748b" }}>Remaining</p>
                      <p className="text-sm font-bold" style={{ color: remaining > 0 ? "#16a34a" : "#e03131" }}>{formatCurrency(remaining)}</p>
                    </div>
                  )}
                  {isExpanded ? <ChevronDown size={18} style={{ color: "#94a3b8" }} /> : <ChevronRight size={18} style={{ color: "#94a3b8" }} />}
                </div>
              </button>

              {/* Call Timeline */}
              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "#e2e8f0" }}>
                  <div className="space-y-3">
                    {group.services.map((s, idx) => {
                      const bp = getBreakpointStatus(s);
                      const completedBp = BREAKPOINT_STAGES.filter(st => bp[st.key]).length;
                      const tc = typeColors[s.service_type] || { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };

                      return (
                        <div key={s.id} className="rounded-lg border-l-4 p-3 transition hover:shadow-md cursor-pointer" style={{ borderLeftColor: tc.text, background: "#fafbfc" }} onClick={() => openServiceDetail(s)}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {/* Call Number Badge */}
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: tc.bg, color: tc.text }}>
                                #{s.call_number || idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold" style={{ color: "#1e293b" }}>{s.customer_name}</p>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: tc.bg, color: tc.text }}>{s.service_type}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === "Completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#64748b" }}>
                                  <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(s.service_date)}</span>
                                  {s.start_time && <span className="flex items-center gap-1"><Clock size={11} /> {s.start_time} - {s.end_time}</span>}
                                  {s.technician && <span className="flex items-center gap-1"><User size={11} /> {s.technician}</span>}
                                </div>
                                {/* Breakpoint Progress */}
                                <div className="flex items-center gap-1 mt-2">
                                  {BREAKPOINT_STAGES.map(st => {
                                    const Icon = st.icon;
                                    const done = bp[st.key];
                                    return (
                                      <div key={st.key} className="flex items-center gap-1" title={`${st.label}: ${done ? "Done" : "Pending"}`}>
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: done ? st.color : "#e2e8f0" }}>
                                          <Icon size={11} style={{ color: done ? "#fff" : "#94a3b8" }} />
                                        </div>
                                        {st.key !== "completion" && <div className="w-4 h-0.5" style={{ background: done ? st.color : "#e2e8f0" }} />}
                                      </div>
                                    );
                                  })}
                                  <span className="text-[10px] ml-1" style={{ color: "#94a3b8" }}>{completedBp}/{BREAKPOINT_STAGES.length}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold" style={{ color: "#1e293b" }}>{formatCurrency(s.total_expenses)}</p>
                              <div className="flex gap-1 mt-1">
                                <button onClick={e => { e.stopPropagation(); openEditService(s); }} className="p-1 rounded hover:bg-blue-50" title="Edit"><Edit size={12} style={{ color: "#1694CE" }} /></button>
                                {canEditDelete && <button onClick={e => { e.stopPropagation(); deleteService(s.id); }} className="p-1 rounded hover:bg-red-50" title="Delete"><Trash2 size={12} style={{ color: "#e03131" }} /></button>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredContractIds.length === 0 && (
          <div className="rounded-xl border p-12 text-center" style={{ borderColor: "#e2e8f0", background: "#fff", color: "#94a3b8" }}>
            <Phone size={40} className="mx-auto mb-3" style={{ color: "#cbd5e1" }} />
            <p className="font-medium">No call reports found</p>
            <p className="text-sm mt-1">Click "New Call" to create your first service call</p>
          </div>
        )}
      </div>

      {/* ============= SERVICE DETAIL MODAL ============= */}
      {detailOpen && detailService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto" onClick={() => setDetailOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: "#fff" }}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10" style={{ borderColor: "#e2e8f0" }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1e293b" }}>Call #{detailService.call_number || "—"} Details</h2>
                <p className="text-sm" style={{ color: "#64748b" }}>{detailService.contract_title || "No Contract"}</p>
              </div>
              <X className="cursor-pointer hover:text-red-500 transition" style={{ color: "#94a3b8" }} onClick={() => setDetailOpen(false)} />
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Customer", value: detailService.customer_name, icon: User },
                  { label: "Phone", value: detailService.mobile_number || "—", icon: Phone },
                  { label: "Date", value: formatDate(detailService.service_date), icon: Calendar },
                  { label: "Location", value: detailService.location_city || "—", icon: MapPin },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: "#f8fafc" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon size={12} style={{ color: "#94a3b8" }} />
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#1e293b" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Breakpoint Timeline */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#1e293b" }}>
                  <Target size={14} style={{ color: "#1694CE" }} /> Call Progress
                </h3>
                <div className="space-y-2">
                  {BREAKPOINT_STAGES.map((st, i) => {
                    const Icon = st.icon;
                    const done = detailBreakpoints[st.key];
                    return (
                      <div key={st.key} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: done ? st.color : "#e2e8f0", transition: "all 0.2s" }}>
                            <Icon size={14} style={{ color: done ? "#fff" : "#94a3b8" }} />
                          </div>
                          {i < BREAKPOINT_STAGES.length - 1 && <div className="w-0.5 h-6" style={{ background: done ? st.color : "#e2e8f0" }} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: done ? st.color : "#94a3b8" }}>{st.label}</p>
                          <p className="text-[10px]" style={{ color: done ? st.color : "#cbd5e1" }}>{done ? "Completed" : "Pending"}</p>
                        </div>
                        {done && <CheckCircle size={16} style={{ color: st.color }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Details */}
              <div className="rounded-lg p-4" style={{ background: "#f8fafc" }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: "#1e293b" }}>Service Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Type", value: detailService.service_type },
                    { label: "Status", value: detailService.status },
                    { label: "Technician", value: detailService.technician || "—" },
                    { label: "Service Person", value: detailService.service_person || "—" },
                    { label: "Sales Person", value: detailService.sales_person || "—" },
                    { label: "KM", value: detailService.km ? `${detailService.km} km` : "—" },
                    { label: "Time", value: detailService.start_time && detailService.end_time ? `${detailService.start_time} - ${detailService.end_time}` : "—" },
                    { label: "Payment", value: detailService.payment_mode || "—" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{item.label}</p>
                      <p className="font-medium" style={{ color: "#1e293b" }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="rounded-lg p-4" style={{ background: "#f8fafc" }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: "#1e293b" }}>Cost Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Petrol", value: detailService.petrol_charges, color: "#dd5b00" },
                    { label: "Spare Parts", value: detailService.spare_parts_price, color: "#5645d4" },
                    { label: "Labour", value: detailService.labour_charges, color: "#1694CE" },
                    { label: "Total", value: detailService.total_expenses, color: "#1aae39" },
                  ].map((item, i) => (
                    <div key={i} className="text-center rounded-lg p-3" style={{ background: "#fff" }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: "#94a3b8" }}>{item.label}</p>
                      <p className="text-lg font-bold" style={{ color: item.color }}>{formatCurrency(item.value)}</p>
                    </div>
                  ))}
                </div>
                {detailService.amount_collected && (
                  <div className="mt-3 flex justify-between items-center pt-3 border-t" style={{ borderColor: "#e2e8f0" }}>
                    <p className="text-sm font-semibold" style={{ color: "#64748b" }}>Amount Collected</p>
                    <p className="text-lg font-bold" style={{ color: "#1aae39" }}>{formatCurrency(detailService.amount_collected)}</p>
                  </div>
                )}
              </div>

              {/* Description & Remarks */}
              {detailService.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#94a3b8" }}>Description</p>
                  <p className="text-sm p-3 rounded-lg" style={{ background: "#f8fafc", color: "#1e293b" }}>{detailService.description}</p>
                </div>
              )}
              {detailService.remarks && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#94a3b8" }}>Remarks</p>
                  <p className="text-sm p-3 rounded-lg" style={{ background: "#fef3c7", color: "#793400" }}>{detailService.remarks}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3" style={{ borderColor: "#e2e8f0" }}>
              <button onClick={() => { setDetailOpen(false); openEditService(detailService); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#1694CE" }}>
                <Edit size={14} className="inline mr-1" /> Edit Call
              </button>
              <button onClick={() => setDetailOpen(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#f1f5f9", color: "#64748b" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============= SERVICE ENTRY MODAL ============= */}
      {serviceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10" style={{ borderColor: "#e2e8f0" }}>
              <h2 className="text-lg font-bold" style={{ color: "#1e293b" }}>{isEditService ? "Edit Call" : "New Service Call"}</h2>
              <X className="cursor-pointer hover:text-red-500 transition" style={{ color: "#94a3b8" }} onClick={() => { setServiceModalOpen(false); resetServiceForm(); }} />
            </div>

            <form onSubmit={saveService} className="p-6 space-y-4">
              {/* Service Type & Contract */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Service Type</label>
                  <select value={serviceForm.service_type} onChange={e => { setServiceForm(prev => ({ ...prev, service_type: e.target.value })); setSelectedContract(null); setContractUsage(null); }} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} required>
                    <option value="AMC">AMC (Annual Maintenance)</option>
                    <option value="ALC">ALC (Annual Labour)</option>
                    <option value="Service Call">Service Call</option>
                    <option value="Installation">New Installation</option>
                    <option value="Warranty">Warranty</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Call Number</label>
                  <input type="number" value={serviceForm.call_number} onChange={e => setServiceForm(prev => ({ ...prev, call_number: parseInt(e.target.value) || 1 }))} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} min="1" />
                </div>
              </div>

              {serviceForm.service_type !== "Service" && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Select Contract</label>
                  <select value={serviceForm.contract_id || ""} onChange={e => { const c = serviceContracts.find(x => x.id === parseInt(e.target.value)); if (c) selectServiceContract(c); }} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }}>
                    <option value="">-- Select Contract --</option>
                    {serviceContracts.filter(c => c.contract_type === serviceForm.service_type).map(c => (
                      <option key={c.id} value={c.id}>{c.contract_title || c.client_company} - {formatCurrency(c.amount_value)} (Remaining: {formatCurrency(c.remaining)})</option>
                    ))}
                  </select>
                </div>
              )}

              {contractUsage && (
                <div className="rounded-lg p-3 border" style={{ background: "#dbeafe", borderColor: "#93c5fd" }}>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div><p className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Value</p><p className="font-bold" style={{ color: "#1694CE" }}>{formatCurrency(contractUsage.amount_value)}</p></div>
                    <div><p className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Used</p><p className="font-bold" style={{ color: "#dd5b00" }}>{formatCurrency(contractUsage.used_total)}</p></div>
                    <div><p className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Calls</p><p className="font-bold" style={{ color: "#5645d4" }}>{contractUsage.service_count}</p></div>
                    <div><p className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Left</p><p className="font-bold" style={{ color: "#16a34a" }}>{formatCurrency(Math.max(0, contractUsage.remaining))}</p></div>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Customer Name</label><input type="text" name="customer_name" value={serviceForm.customer_name} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Mobile</label><input type="text" name="mobile_number" value={serviceForm.mobile_number} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Date</label><input type="date" name="service_date" value={serviceForm.service_date} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} required /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Start Time</label><input type="time" name="start_time" value={serviceForm.start_time} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>End Time</label><input type="time" name="end_time" value={serviceForm.end_time} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
              </div>

              {calcTotalMinutes() !== null && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: "#dcecfa", color: "#0075de" }}>
                  <Clock size={14} /> Duration: <span className="font-bold">{Math.floor(calcTotalMinutes() / 60)}h {calcTotalMinutes() % 60}min</span>
                </div>
              )}

              {/* Breakpoint Checklist */}
              <div className="rounded-lg p-4 border" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "#1e293b" }}>
                  <Target size={14} style={{ color: "#1694CE" }} /> Call Breakpoints
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {BREAKPOINT_STAGES.map(st => {
                    const Icon = st.icon;
                    try {
                      const bp = JSON.parse(serviceForm.breakpoints || "{}");
                      const done = bp[st.key];
                      return (
                        <button key={st.key} type="button" onClick={() => toggleBreakpoint(st.key)} className="flex flex-col items-center gap-1 p-2 rounded-lg border transition" style={{ borderColor: done ? st.color : "#e2e8f0", background: done ? st.color + "15" : "#fff" }}>
                          <Icon size={16} style={{ color: done ? st.color : "#94a3b8" }} />
                          <span className="text-[10px] font-semibold" style={{ color: done ? st.color : "#64748b" }}>{st.label}</span>
                        </button>
                      );
                    } catch { return null; }
                  })}
                </div>
              </div>

              {/* Staff */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Technician</label><input type="text" name="technician" value={serviceForm.technician} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Service Person</label><input type="text" name="service_person" value={serviceForm.service_person} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Sales Person</label><input type="text" name="sales_person" value={serviceForm.sales_person} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>KM</label><input type="number" name="km" value={serviceForm.km} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Status</label><select name="status" value={serviceForm.status} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }}><option value="Completed">Completed</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option></select></div>
              </div>

              <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Description</label><textarea name="description" value={serviceForm.description} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} rows={2} /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>Remarks</label><textarea name="remarks" value={serviceForm.remarks} onChange={handleServiceChange} className="w-full border rounded-lg p-2.5 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} rows={2} /></div>

              {/* Cost */}
              <div className="rounded-lg p-4 border" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#1e293b" }}>Cost Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Petrol (₹)</label><input type="number" name="petrol_charges" value={serviceForm.petrol_charges} onChange={handleServiceChange} className="w-full border rounded p-2 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                  <div><label className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Spare Parts (₹)</label><input type="number" name="spare_parts_price" value={serviceForm.spare_parts_price} onChange={handleServiceChange} className="w-full border rounded p-2 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                  <div><label className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Labour (₹)</label><input type="number" name="labour_charges" value={serviceForm.labour_charges} onChange={handleServiceChange} className="w-full border rounded p-2 mt-1 text-sm" style={{ borderColor: "#e2e8f0" }} /></div>
                  <div><label className="text-[10px] font-semibold" style={{ color: "#64748b" }}>Total (₹)</label><input type="number" value={serviceForm.total_expenses} readOnly className="w-full border rounded p-2 mt-1 text-sm font-bold bg-white" style={{ borderColor: "#e2e8f0", color: "#1694CE" }} /></div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#1694CE" }}>{isEditService ? "Update" : "Save Call"}</button>
                <button type="button" onClick={() => { setServiceModalOpen(false); resetServiceForm(); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#f1f5f9", color: "#64748b" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallReport;
