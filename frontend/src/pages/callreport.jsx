import React, { useState, useEffect, useCallback } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, Trash2, Edit, PlusCircle, History, User, Clock, MapPin, Calendar, AlertCircle, FileText, DollarSign, CheckSquare, Link as LinkIcon, TrendingUp } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";

const API = "http://localhost:5000";

const getAuthConfig = () => { const token = localStorage.getItem("token"); return { headers: { Authorization: `Bearer ${token}` } }; };
const getUserRole = () => { try { return JSON.parse(localStorage.getItem("user") || "{}").role || "employee"; } catch { return "employee"; } };

const CallReport = () => {
  const userRole = getUserRole();
  const canEditDelete = userRole === "admin" || userRole === "subadmin";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("contracts");
  const [contracts, setContracts] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Contract Modal
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    contract_title: "",
    client_company: "",
    mobile_number: "",
    email: "",
    location_city: "",
    service_type: "None",
    amount_value: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10)
  });

  // Service Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [isEditService, setIsEditService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractUsage, setContractUsage] = useState(null);
  const [serviceContracts, setServiceContracts] = useState([]);
  const [contractSearch, setContractSearch] = useState("");
  const [showContractDropdown, setShowContractDropdown] = useState(false);

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
    status: "Completed"
  });

  const showCostBreakdown = ["Warranty", "Installation", "Service Call"].includes(serviceForm.service_type);

  // Returns actual duration in minutes between start and end time
  const calcTotalMinutes = () => {
    const { start_time, end_time } = serviceForm;
    if (!start_time || !end_time) return null;
    const [sh, sm] = start_time.split(":").map(Number);
    const [eh, em] = end_time.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  };

  // Returns true if actual duration exceeds the selected limit
  const isDurationExceeded = () => {
    const { duration_limit } = serviceForm;
    if (!duration_limit) return false;
    const actual = calcTotalMinutes();
    return actual !== null && actual > parseInt(duration_limit);
  };

  // Call Report Modal
  const [callReportModalOpen, setCallReportModalOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [performance, setPerformance] = useState([]);

  // Fetch Contracts
  const fetchContracts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/contract/with-usage`, getAuthConfig());
      setContracts(res.data);
    } catch (err) { console.error("Fetch contracts error:", err); }
  }, []);

  // Fetch Services
  const fetchServices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/amc/amc-alc`, getAuthConfig());
      setServices(res.data);
    } catch (err) { console.error("Fetch services error:", err); }
  }, []);

  // Fetch Call Reports
  const fetchReports = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/call-reports`, getAuthConfig());
      setReports(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/call-reports/performance`, getAuthConfig());
      setPerformance(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchContracts();
    fetchServices();
    fetchReports();
    fetchPerformance();
  }, [fetchContracts, fetchServices, fetchReports, fetchPerformance]);

  useEffect(() => {
    const handleDataChanged = () => {
      fetchContracts();
      fetchServices();
      fetchReports();
      fetchPerformance();
    };
    socket.on("data_changed", handleDataChanged);
    return () => socket.off("data_changed", handleDataChanged);
  }, [fetchContracts, fetchServices, fetchReports, fetchPerformance]);

  // Contract Form
  const handleContractChange = (e) => {
    const { name, value } = e.target;
    setContractForm({ ...contractForm, [name]: value });
  };

  const saveContract = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/contract/new`, contractForm, getAuthConfig());
      alert("Contract created successfully!");
      setContractModalOpen(false);
      setContractForm({
        contract_title: "",
        client_company: "",
        mobile_number: "",
        email: "",
        location_city: "",
        service_type: "None",
        amount_value: "",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10)
      });
      fetchContracts();
    } catch (err) {
      alert("Failed to create contract: " + (err.response?.data?.message || err.message));
    }
  };

  const deleteContract = async (id) => {
    if (!window.confirm("Delete this contract?")) return;
    try {
      await axios.delete(`${API}/api/contract/${id}`, getAuthConfig());
      fetchContracts();
    } catch (err) { alert("Failed to delete"); }
  };

  // Service Form
  const handleServiceTypeChange = (value) => {
    setServiceForm(prev => ({ ...prev, service_type: value }));
    setContractSearch("");
    setSelectedContract(null);
    setContractUsage(null);
  };

  const fetchServiceContracts = async () => {
    try {
      const res = await axios.get(`${API}/api/contract/with-usage`, getAuthConfig());
      setServiceContracts(res.data || []);
    } catch (err) { console.error(err); setServiceContracts([]); }
  };

  useEffect(() => {
    fetchServiceContracts();
  }, []);

  const searchContract = (value) => {
    setContractSearch(value);
    if (!value || serviceForm.service_type === "None") {
      setShowContractDropdown(false);
      return;
    }
    const filtered = serviceContracts.filter(c =>
      c.contract_title?.toLowerCase().includes(value.toLowerCase()) ||
      c.client_company?.toLowerCase().includes(value.toLowerCase())
    );
    setServiceContracts(filtered);
    setShowContractDropdown(true);
  };

  const fetchContractUsageForService = async (contractId) => {
    try {
      const res = await axios.get(`${API}/api/contract/usage/${contractId}`, getAuthConfig());
      setContractUsage(res.data);
    } catch (err) { setContractUsage(null); }
  };

  const selectServiceContract = (contract) => {
    setContractSearch(contract.contract_title || contract.client_company || "");
    setSelectedContract(contract);
    setServiceForm(prev => ({
      ...prev,
      contract_id: contract.id,
      contract_title: contract.contract_title || "",
      customer_name: contract.client_company || "",
      mobile_number: contract.mobile_number || "",
      location_city: contract.location_city || "",
      service_type: contract.contract_type
    }));
    setShowContractDropdown(false);
    fetchContractUsageForService(contract.id);
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceForm({ ...serviceForm, [name]: value });
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
        amount_collected: parseFloat(serviceForm.amount_collected) || 0
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
    } catch (err) {
      alert("Failed: " + (err.response?.data?.error || err.message));
    }
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
      service_person: service.service_person || "",
      description: service.description || "",
      petrol_charges: service.petrol_charges?.toString() || "",
      spare_parts_price: service.spare_parts_price?.toString() || "",
      labour_charges: service.labour_charges?.toString() || "",
      total_expenses: service.total_expenses?.toString() || "",
      amount_collected: service.amount_collected?.toString() || "",
      payment_mode: service.payment_mode || "",
      status: service.status || "Completed"
    });
    setSelectedServiceId(service.id);
    setIsEditService(true);
    setServiceModalOpen(true);
    if (service.contract_id) {
      fetchContractUsageForService(service.contract_id);
      setContractSearch(service.contract_title || "");
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await axios.delete(`${API}/api/amc/amc-alc/${id}`, getAuthConfig());
      fetchServices();
    } catch (err) { alert("Failed to delete"); }
  };

  const resetServiceForm = () => {
    setServiceForm({
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
      status: "Completed"
    });
    setContractSearch("");
    setSelectedContract(null);
    setContractUsage(null);
    setIsEditService(false);
    setSelectedServiceId(null);
  };

  // Open contract for quotation
  const openQuotation = (contract) => {
    navigate(`/dashboard/proposal?contract_id=${contract.id}&client=${encodeURIComponent(contract.client_company)}`);
  };

  // Open AMC page
  const openAMCPage = () => {
    navigate("/dashboard/amc");
  };

  // Filter contracts
  const filteredContracts = contracts.filter(c =>
    c.client_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contract_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter services
  const filteredServices = services.filter(s =>
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contract_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalContractValue = contracts.reduce((sum, c) => sum + (parseFloat(c.amount_value) || 0), 0);
  const totalUsed = contracts.reduce((sum, c) => sum + (parseFloat(c.used_total) || 0), 0);

  return (
    <div className="w-full p-2 md:p-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1694CE]">Call Report</h1>
          <a className="text-xs md:text-sm text-gray-500" href="/dashboard">Dashboard &gt; Call Report</a>
        </div>
        <button onClick={openAMCPage} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <LinkIcon size={16} /> View AMC Page
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow mb-4 overflow-hidden">
        <div className="flex border-b">
          <button onClick={() => setActiveTab("contracts")} className={`px-4 md:px-6 py-3 font-medium text-sm ${activeTab === "contracts" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
            <FileText size={16} className="inline mr-2" /> Contracts
          </button>
          <button onClick={() => setActiveTab("services")} className={`px-4 md:px-6 py-3 font-medium text-sm ${activeTab === "services" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
            <DollarSign size={16} className="inline mr-2" /> Services
          </button>
          <button onClick={() => setActiveTab("calls")} className={`px-4 md:px-6 py-3 font-medium text-sm ${activeTab === "calls" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
            <History size={16} className="inline mr-2" /> Call Reports
          </button>
          <button onClick={() => setActiveTab("performance")} className={`px-4 md:px-6 py-3 font-medium text-sm ${activeTab === "performance" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
            <TrendingUp size={16} className="inline mr-2" /> Performance
          </button>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="bg-[#F3F8FA] p-3 md:p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center shadow mb-4 gap-3">
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow border w-full sm:w-80">
          <Search size={18} className="text-gray-500" />
          <input type="text" placeholder={`Search ${activeTab}...`} className="outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {activeTab === "services" && (
            <button onClick={() => { resetServiceForm(); setServiceModalOpen(true); }} className="bg-[#FF3355] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#e62848]">
              <Plus size={18} /> Add Service
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-600" size={20} />
            <div>
              <p className="text-xs text-blue-600 font-medium">Total Contracts</p>
              <p className="text-xl font-bold text-blue-700">{contracts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-green-600" size={20} />
            <div>
              <p className="text-xs text-green-600 font-medium">Total Value</p>
              <p className="text-xl font-bold text-green-700">₹{totalContractValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-orange-600" size={20} />
            <div>
              <p className="text-xs text-orange-600 font-medium">Used</p>
              <p className="text-xl font-bold text-orange-700">₹{totalUsed.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-purple-600" size={20} />
            <div>
              <p className="text-xs text-purple-600 font-medium">Remaining</p>
              <p className="text-xl font-bold text-purple-700">₹{(totalContractValue - totalUsed).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTRACTS TABLE */}
      {activeTab === "contracts" && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-xs md:text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase text-gray-500 font-bold border-b">
                <th className="p-2 md:p-3 text-left">Contract</th>
                <th className="p-2 md:p-3 text-left">Client</th>
                <th className="p-2 md:p-3 text-center">Type</th>
                <th className="p-2 md:p-3 text-right">Value</th>
                <th className="p-2 md:p-3 text-right">Used</th>
                <th className="p-2 md:p-3 text-right">Remaining</th>
                <th className="p-2 md:p-3 text-center">Services</th>
                <th className="p-2 md:p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr><td colSpan="8" className="py-10 text-gray-400 text-center">No contracts found</td></tr>
              ) : (
                filteredContracts.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 md:p-3 font-medium">{c.contract_title}</td>
                    <td className="p-2 md:p-3">{c.client_company}</td>
                    <td className="p-2 md:p-3 text-center">
                      <span className={`px-1 md:px-2 py-0.5 rounded-full text-xs font-bold ${c.contract_type === "AMC" ? "bg-blue-100 text-blue-700" : c.contract_type === "ALC" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {c.contract_type || "Service"}
                      </span>
                    </td>
                    <td className="p-2 md:p-3 text-right font-semibold">₹{parseFloat(c.amount_value || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-right text-orange-600">₹{parseFloat(c.used_total || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-right font-bold text-green-600">₹{parseFloat(c.remaining || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-center">{c.service_count || 0}</td>
                    <td className="p-2 md:p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openQuotation(c)} className="text-purple-600 hover:underline text-xs">Quotation</button>
                        <button onClick={() => deleteContract(c.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SERVICES TABLE */}
      {activeTab === "services" && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-xs md:text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase text-gray-500 font-bold border-b">
                <th className="p-2 md:p-3 text-left">Date</th>
                <th className="p-2 md:p-3 text-left">Contract</th>
                <th className="p-2 md:p-3 text-left">Customer</th>
                <th className="p-2 md:p-3 text-center">Type</th>
                <th className="p-2 md:p-3 text-right">Petrol</th>
                <th className="p-2 md:p-3 text-right">Spare</th>
                <th className="p-2 md:p-3 text-right">Labour</th>
                <th className="p-2 md:p-3 text-right">Total</th>
                <th className="p-2 md:p-3 text-center">Status</th>
                <th className="p-2 md:p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr><td colSpan="10" className="py-10 text-gray-400 text-center">No services found</td></tr>
              ) : (
                filteredServices.map(s => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 md:p-3 text-xs">{new Date(s.service_date).toLocaleDateString()}</td>
                    <td className="p-2 md:p-3 font-medium">{s.contract_title}</td>
                    <td className="p-2 md:p-3">{s.customer_name}</td>
                    <td className="p-2 md:p-3 text-center">
                      <span className={`px-1 md:px-2 py-0.5 rounded-full text-xs font-bold ${
                        s.service_type === "AMC" ? "bg-blue-100 text-blue-700" :
                        s.service_type === "ALC" ? "bg-green-100 text-green-700" :
                        s.service_type === "Service Call" ? "bg-orange-100 text-orange-700" :
                        s.service_type === "Installation" ? "bg-purple-100 text-purple-700" :
                        s.service_type === "Warranty" ? "bg-teal-100 text-teal-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {s.service_type}
                      </span>
                    </td>
                    <td className="p-2 md:p-3 text-right">₹{(parseFloat(s.petrol_charges) || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-right">₹{(parseFloat(s.spare_parts_price) || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-right">₹{(parseFloat(s.labour_charges) || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-right font-bold">₹{(parseFloat(s.total_expenses) || 0).toLocaleString()}</td>
                    <td className="p-2 md:p-3 text-center">
                      <span className={`px-1 md:px-2 py-0.5 rounded-full text-xs ${s.status === "Completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-2 md:p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEditService(s)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => deleteService(s.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Placeholder for Call Reports tab - you can add existing functionality */}
      {activeTab === "calls" && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-gray-500">Call Reports functionality - {reports.length} reports found</p>
          <p className="text-sm text-gray-400 mt-2">Use the existing call report feature for detailed tracking</p>
        </div>
      )}

      {/* Placeholder for Performance tab */}
      {activeTab === "performance" && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-lg font-bold text-gray-700">Performance Analytics</h2>
          </div>
          <p className="text-gray-500">{performance.length} staff members tracked</p>
          <p className="text-sm text-gray-400 mt-2">Performance metrics coming soon...</p>
        </div>
      )}

      {/* ============= SERVICE ENTRY MODAL ============= */}
      {serviceModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold">{isEditService ? "Edit Service" : "Add Service"}</h2>
              <X className="cursor-pointer hover:text-red-500" onClick={() => setServiceModalOpen(false)} />
            </div>
            <form onSubmit={saveService} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Service Type <span className="text-red-500">*</span></label>
                <select value={serviceForm.service_type} onChange={(e) => handleServiceTypeChange(e.target.value)} className="w-full border rounded-lg p-2 mt-1" required>
                  <option value="AMC">AMC (Annual Maintenance)</option>
                  <option value="ALC">ALC (Annual Labour)</option>
                  <option value="Service Call">Service Call</option>
                  <option value="Installation">New Installation</option>
                  <option value="Warranty">Warranty</option>
                </select>
              </div>
              {serviceForm.service_type !== "Service" && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Select Contract <span className="text-red-500">*</span></label>
                  {serviceContracts.length > 0 ? (
                    <select 
                      value={serviceForm.contract_id || ""} 
                      onChange={(e) => {
                        const contract = serviceContracts.find(c => c.id === parseInt(e.target.value));
                        if (contract) selectServiceContract(contract);
                      }}
                      className="w-full border rounded-lg p-2 mt-1"
                      required
                    >
                      <option value="">-- Select Contract --</option>
                      {serviceForm.service_type === "AMC" && (
                        <>
                          <optgroup label="AMC Contracts" className="font-bold text-blue-700">
                            {serviceContracts.filter(c => c.contract_type === "AMC").map(c => (
                              <option key={c.id} value={c.id}>
                                {c.contract_title || c.client_company} - ₹{parseFloat(c.amount_value || 0).toLocaleString()} (Remaining: ₹{parseFloat(c.remaining || 0).toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                      {serviceForm.service_type === "ALC" && (
                        <>
                          <optgroup label="ALC Contracts" className="font-bold text-green-700">
                            {serviceContracts.filter(c => c.contract_type === "ALC").map(c => (
                              <option key={c.id} value={c.id}>
                                {c.contract_title || c.client_company} - ₹{parseFloat(c.amount_value || 0).toLocaleString()} (Remaining: ₹{parseFloat(c.remaining || 0).toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  ) : (
                    <div className="w-full border rounded-lg p-2 mt-1 bg-gray-50 text-gray-500">
                      No {serviceForm.service_type} contracts found. Please create a contract first.
                    </div>
                  )}
                </div>
              )}
              {contractUsage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="text-center"><p className="text-xs text-gray-500">Contract Value</p><p className="font-bold text-blue-700">₹{parseFloat(contractUsage.amount_value).toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-gray-500">Used</p><p className="font-bold text-orange-600">₹{parseFloat(contractUsage.used_total).toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-gray-500">Services</p><p className="font-bold text-purple-700">{contractUsage.service_count}</p></div>
                    <div className="text-center"><p className="text-xs text-gray-500">Remaining</p><p className="font-bold text-green-600">₹{Math.max(0, parseFloat(contractUsage.remaining)).toLocaleString()}</p></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-600">Status</label><select name="status" value={serviceForm.status} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1"><option value="Completed">Completed</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option></select></div>
                <div><label className="text-sm font-medium text-gray-600">Service Date <span className="text-red-500">*</span></label><input type="date" name="service_date" value={serviceForm.service_date} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" required /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-600">Start Time</label><input type="time" name="start_time" value={serviceForm.start_time} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" /></div>
                <div><label className="text-sm font-medium text-gray-600">End Time</label><input type="time" name="end_time" value={serviceForm.end_time} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" /></div>
              </div>

              {/* Total time display */}
              {calcTotalMinutes() !== null && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: "#dcecfa", color: "#0075de" }}>
                  <Clock size={15} />
                  Total service time: <span className="font-bold">{Math.floor(calcTotalMinutes() / 60) > 0 ? `${Math.floor(calcTotalMinutes() / 60)}h ` : ""}{calcTotalMinutes() % 60}min</span>
                </div>
              )}

              {/* Expected Duration dropdown */}
              <div>
                <label className="text-sm font-medium text-gray-600">Expected Duration</label>
                <select name="duration_limit" value={serviceForm.duration_limit} onChange={handleServiceChange}
                  className="w-full border rounded-lg p-2 mt-1" style={{ borderColor: "#c8c4be" }}>
                  <option value="">— No limit —</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              {/* Remarks — always visible but required when duration exceeded */}
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  Remarks
                  {isDurationExceeded() && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fef7d6", color: "#793400" }}>
                      ⚠ Required — exceeded {serviceForm.duration_limit} min limit
                    </span>
                  )}
                </label>
                <textarea name="remarks" value={serviceForm.remarks} onChange={handleServiceChange}
                  className="w-full border rounded-lg p-2 mt-1 text-sm outline-none"
                  style={{ borderColor: isDurationExceeded() ? "#dd5b00" : "#c8c4be" }}
                  rows={2}
                  placeholder={isDurationExceeded() ? "Explain why the service took longer…" : "Additional remarks..."}
                  required={isDurationExceeded()}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-600">KM (Kilometers)</label><input type="number" name="km" value={serviceForm.km} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" placeholder="Enter kilometers" /></div>
                <div><label className="text-sm font-medium text-gray-600">Technician</label><input type="text" name="technician" value={serviceForm.technician} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" placeholder="Enter technician name" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-600">Sales Person</label><input type="text" name="sales_person" value={serviceForm.sales_person} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" placeholder="Enter sales person name" /></div>
                <div><label className="text-sm font-medium text-gray-600">Service Person</label><input type="text" name="service_person" value={serviceForm.service_person} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" /></div>
              </div>

<div><label className="text-sm font-medium text-gray-600">Description</label><textarea name="description" value={serviceForm.description} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" rows={2} /></div>
              
              <div><label className="text-sm font-medium text-gray-600">Remarks</label><textarea name="remarks" value={serviceForm.remarks} onChange={handleServiceChange} className="w-full border rounded-lg p-2 mt-1" placeholder="Additional remarks..." rows={2} /></div>
              
              {showCostBreakdown && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Cost Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div><label className="text-xs text-gray-600">Petrol (₹)</label><input type="number" name="petrol_charges" value={serviceForm.petrol_charges} onChange={handleServiceChange} className="w-full border rounded p-1 mt-1" placeholder="0" /></div>
                      <div><label className="text-xs text-gray-600">Spare Parts (₹)</label><input type="number" name="spare_parts_price" value={serviceForm.spare_parts_price} onChange={handleServiceChange} className="w-full border rounded p-1 mt-1" placeholder="0" /></div>
                      <div><label className="text-xs text-gray-600">Labour (₹)</label><input type="number" name="labour_charges" value={serviceForm.labour_charges} onChange={handleServiceChange} className="w-full border rounded p-1 mt-1" placeholder="0" /></div>
                      <div><label className="text-xs text-gray-600">Total (₹)</label><input type="number" name="total_expenses" value={serviceForm.total_expenses} readOnly className="w-full border rounded p-1 mt-1 bg-white font-bold text-blue-700" /></div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Payment Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="text-xs text-gray-600">Payment Mode</label><select name="payment_mode" value={serviceForm.payment_mode} onChange={handleServiceChange} className="w-full border rounded p-1 mt-1"><option value="">— Select —</option><option value="UPI">UPI</option><option value="Cash">Cash</option><option value="Credit">Credit</option></select></div>
                      <div><label className="text-xs text-gray-600">Amount Collected (₹)</label><input type="number" name="amount_collected" value={serviceForm.amount_collected} onChange={handleServiceChange} className="w-full border rounded p-1 mt-1" placeholder="0" /></div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{isEditService ? "Update" : "Save Service"}</button>
                <button type="button" onClick={() => setServiceModalOpen(false)} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallReport;