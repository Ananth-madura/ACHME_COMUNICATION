import React, { useState, useEffect, useCallback } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, TrendingUp, DollarSign, Wrench, FileText, RefreshCw, Link as LinkIcon } from "lucide-react";
import axios from "axios";
import socket from "../socket/socket";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000";

const AMCService = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [activeTab, setActiveTab] = useState("contracts");

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
  const [selectedClient, setSelectedClient] = useState("");
  const [showOtherClient, setShowOtherClient] = useState(false);

  const [contractSearch, setContractSearch] = useState("");
  const [contractList, setContractList] = useState([]);
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractUsage, setContractUsage] = useState(null);
  const [serviceFilterContract, setServiceFilterContract] = useState("");

  const [form, setForm] = useState({
    contract_id: "",
    contract_title: "",
    service_type: "AMC",
    customer_name: "",
    mobile_number: "",
    email: "",
    location_city: "",
    service_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    end_time: "",
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
    status: "Completed",
    next_service_date: ""
  });

const fetchServices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/amc/amc-alc`);
      setServices(res.data);
    } catch (err) {
      console.error("Fetch services error:", err);
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/contract/with-usage`);
      setContracts(res.data);
    } catch (err) {
      console.error("Fetch contracts error:", err);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/client`);
      setClients(res.data);
    } catch (err) {
      console.error("Fetch clients error:", err);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchContracts();
    fetchClients();
  }, [fetchServices, fetchContracts, fetchClients]);

  // Contract form handlers
  const handleContractChange = (e) => {
    const { name, value } = e.target;
    setContractForm({ ...contractForm, [name]: value });
  };

  // Handle client selection from dropdown
  const handleClientSelect = (e) => {
    const value = e.target.value;
    setSelectedClient(value);
    
    if (value === "other") {
      setShowOtherClient(true);
      setContractForm(prev => ({
        ...prev,
        client_company: "",
        mobile_number: "",
        email: "",
        location_city: ""
      }));
    } else if (value) {
      setShowOtherClient(false);
      const client = clients.find(c => c.id.toString() === value);
      if (client) {
        setContractForm(prev => ({
          ...prev,
          client_company: client.name || "",
          mobile_number: client.phone || "",
          email: client.email || "",
          location_city: client.address || ""
        }));
      }
    } else {
      setShowOtherClient(false);
    }
  };

  const saveContract = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/contract/new`, contractForm);
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
      setSelectedClient("");
      setShowOtherClient(false);
      fetchContracts();
    } catch (err) {
      alert("Failed to create contract: " + (err.response?.data?.message || err.message));
    }
  };

  const deleteContract = async (id) => {
    if (!window.confirm("Delete this contract?")) return;
    try {
      await axios.delete(`${API}/api/contract/${id}`);
      fetchContracts();
    } catch (err) { alert("Failed to delete"); }
  };

  const resetContractForm = () => {
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
    setSelectedClient("");
    setShowOtherClient(false);
  };

  const openQuotation = (contract) => {
    navigate(`/dashboard/proposal?contract_id=${contract.id}&client=${encodeURIComponent(contract.client_company)}`);
  };

  // Prefill contract form from Leads pages
  useEffect(() => {
    const prefillData = sessionStorage.getItem("contract_prefill");
    if (prefillData) {
      try {
        const data = JSON.parse(prefillData);
        setContractForm(prev => ({
          ...prev,
          client_company: data.customer_name || "",
          mobile_number: data.mobile_number || "",
          email: data.email || "",
          location_city: data.location_city || "",
          service_type: "AMC"
        }));
        sessionStorage.removeItem("contract_prefill");
        setContractModalOpen(true);
      } catch (e) {
        console.error("Error parsing prefill data:", e);
      }
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchContracts();
  }, [fetchServices, fetchContracts]);

  useEffect(() => {
    const handleDataChanged = () => {
      fetchServices();
      fetchContracts();
    };
    socket.on("data_changed", handleDataChanged);
    return () => socket.off("data_changed", handleDataChanged);
  }, [fetchServices, fetchContracts]);

  const handleServiceTypeChange = (value) => {
    setForm(prev => ({ ...prev, service_type: value }));
    setContractSearch("");
    setSelectedContract(null);
    setContractUsage(null);
    setContractList([]);
  };

  const filteredContracts = contracts.filter(c => {
    if (form.service_type === "None") return false;
    return c.contract_type === form.service_type;
  });

  const searchContract = (value) => {
    setContractSearch(value);
    if (!value || form.service_type === "None") {
      setContractList(filteredContracts);
      setShowContractDropdown(false);
      return;
    }
    const filtered = filteredContracts.filter(c =>
      c.contract_title?.toLowerCase().includes(value.toLowerCase()) ||
      c.client_company?.toLowerCase().includes(value.toLowerCase())
    );
    setContractList(filtered);
    setShowContractDropdown(true);
  };

  const fetchContractUsage = async (contractId) => {
    try {
      const res = await axios.get(`${API}/api/contract/usage/${contractId}`);
      setContractUsage(res.data);
    } catch (err) {
      console.error("Fetch contract usage error:", err);
      setContractUsage(null);
    }
  };

  const selectContract = (contract) => {
    setContractSearch(contract.contract_title || contract.client_company || "");
    setSelectedContract(contract);
    setForm(prev => ({
      ...prev,
      contract_id: contract.id,
      contract_title: contract.contract_title || "",
      customer_name: contract.client_company || "",
      mobile_number: contract.mobile_number || "",
      location_city: contract.location_city || "",
    }));
    setContractList([]);
    setShowContractDropdown(false);
    fetchContractUsage(contract.id);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  useEffect(() => {
    const petrol = parseFloat(form.petrol_charges) || 0;
    const spare = parseFloat(form.spare_parts_price) || 0;
    const labour = parseFloat(form.labour_charges) || 0;
    const total = petrol + spare + labour;
    setForm(prev => ({ ...prev, total_expenses: total.toString() }));
  }, [form.petrol_charges, form.spare_parts_price, form.labour_charges]);

  const saveService = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        petrol_charges: parseFloat(form.petrol_charges) || 0,
        spare_parts_price: parseFloat(form.spare_parts_price) || 0,
        labour_charges: parseFloat(form.labour_charges) || 0,
        total_expenses: parseFloat(form.total_expenses) || 0
      };

      if (isEdit && selectedServiceId) {
        await axios.put(`${API}/api/amc/amc-alc/${selectedServiceId}`, payload);
      } else {
        await axios.post(`${API}/api/amc/amc-alc`, payload);
      }

      setOpen(false);
      resetForm();
      fetchServices();
    } catch (err) {
      alert("Failed to save service: " + (err.response?.data?.error || err.message));
    }
  };

  const openEdit = (service) => {
    setForm({
      contract_id: service.contract_id || "",
      contract_title: service.contract_title || "",
      service_type: service.service_type || "AMC",
      customer_name: service.customer_name || "",
      mobile_number: service.mobile_number || "",
      email: service.email || "",
      location_city: service.location_city || "",
      service_date: service.service_date?.split("T")[0] || "",
      start_time: service.start_time || "",
      end_time: service.end_time || "",
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
      status: service.status || "Completed",
      next_service_date: service.next_service_date?.split("T")[0] || ""
    });
    setSelectedServiceId(service.id);
    setIsEdit(true);
    setOpen(true);
    if (service.contract_id) {
      fetchContractUsage(service.contract_id);
      setContractSearch(service.contract_title || "");
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Delete this service record?")) return;
    try {
      await axios.delete(`${API}/api/amc/amc-alc/${id}`);
      fetchServices();
    } catch (err) {
      alert("Failed to delete service");
    }
  };

  const resetForm = () => {
    setForm({
      contract_id: "",
      contract_title: "",
      service_type: "None",
      customer_name: "",
      mobile_number: "",
      email: "",
      location_city: "",
      service_date: new Date().toISOString().slice(0, 10),
      start_time: "",
      end_time: "",
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
      status: "Completed",
      next_service_date: ""
    });
    setContractSearch("");
    setSelectedContract(null);
    setContractUsage(null);
    setIsEdit(false);
    setSelectedServiceId(null);
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = 
      s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contract_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.service_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesContract = !serviceFilterContract || s.contract_id?.toString() === serviceFilterContract;
    return matchesSearch && matchesContract;
  });

  const totalPetrol = filteredServices.reduce((sum, s) => sum + (parseFloat(s.petrol_charges) || 0), 0);
  const totalSpareParts = filteredServices.reduce((sum, s) => sum + (parseFloat(s.spare_parts_price) || 0), 0);
  const totalLabour = filteredServices.reduce((sum, s) => sum + (parseFloat(s.labour_charges) || 0), 0);
  const totalExpenses = filteredServices.reduce((sum, s) => sum + (parseFloat(s.total_expenses) || 0), 0);

  return (
    <div className="w-full p-2 md:p-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1694CE]">Contract</h1>
          <a className="text-xs md:text-sm text-gray-500" href="/dashboard">Dashboard &gt; Contract</a>
        </div>
        <button onClick={() => navigate("/dashboard/call-report")} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
          <LinkIcon size={16} /> Service Updates
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow mb-4 overflow-hidden">
        <div className="flex border-b">
          <button onClick={() => setActiveTab("contracts")} className={`px-4 md:px-6 py-3 font-medium text-sm ${activeTab === "contracts" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
            <FileText size={16} className="inline mr-2" /> Contracts
          </button>
          <button onClick={() => setActiveTab("services")} className={`px-4 md:px-6 py-3 font-medium text-sm ${activeTab === "services" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}>
            <Wrench size={16} className="inline mr-2" /> Services
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
          {activeTab === "contracts" && (
            <button onClick={() => { setContractForm({ contract_title: "", client_company: "", mobile_number: "", email: "", location_city: "", service_type: "None", amount_value: "", start_date: new Date().toISOString().slice(0, 10), end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10) }); setContractModalOpen(true); }} className="bg-[#FF3355] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#e62848]">
              <Plus size={18} /> New Contract
            </button>
          )}
          {activeTab === "services" && (
            <button onClick={() => { resetForm(); setOpen(true); }} className="bg-[#FF3355] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#e62848]">
              <Plus size={18} /> Add Service
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {activeTab === "services" && (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Wrench className="text-blue-600" size={20} />
            <div>
              <p className="text-xs md:text-sm text-blue-600 font-medium">Total Services</p>
              <p className="text-xl md:text-2xl font-bold text-blue-700">{filteredServices.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <DollarSign className="text-green-600" size={20} />
            <div>
              <p className="text-xs md:text-sm text-green-600 font-medium">Total Expenses</p>
              <p className="text-xl md:text-2xl font-bold text-green-700">₹{totalExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <TrendingUp className="text-orange-600" size={20} />
            <div>
              <p className="text-xs md:text-sm text-orange-600 font-medium">Petrol</p>
              <p className="text-xl md:text-2xl font-bold text-orange-700">₹{totalPetrol.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <FileText className="text-purple-600" size={20} />
            <div>
              <p className="text-xs md:text-sm text-purple-600 font-medium">Spare Parts</p>
              <p className="text-xl md:text-2xl font-bold text-purple-700">₹{totalSpareParts.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Wrench className="text-pink-600" size={20} />
            <div>
              <p className="text-xs md:text-sm text-pink-600 font-medium">Labour</p>
              <p className="text-xl md:text-2xl font-bold text-pink-700">₹{totalLabour.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* CONTRACTS TABLE */}
      {activeTab === "contracts" && (
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
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
              {contracts.filter(c => c.client_company?.toLowerCase().includes(searchTerm.toLowerCase()) || c.contract_title?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                <tr><td colSpan="8" className="py-10 text-gray-400 text-center">No contracts found</td></tr>
              ) : (
                contracts.filter(c => c.client_company?.toLowerCase().includes(searchTerm.toLowerCase()) || c.contract_title?.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
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
              <th className="p-2 md:p-3 text-left hidden sm:table-cell">Contract</th>
              <th className="p-2 md:p-3 text-left">Customer</th>
              <th className="p-2 md:p-3 text-center hidden md:table-cell">Type</th>
              <th className="p-2 md:p-3 text-left hidden lg:table-cell">Person</th>
              <th className="p-2 md:p-3 text-right hidden sm:table-cell">Petrol</th>
              <th className="p-2 md:p-3 text-right hidden sm:table-cell">Spare</th>
              <th className="p-2 md:p-3 text-right hidden sm:table-cell">Labour</th>
              <th className="p-2 md:p-3 text-right">Total</th>
              <th className="p-2 md:p-3 text-center hidden sm:table-cell">Status</th>
              <th className="p-2 md:p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-10 text-gray-400 text-center">
                  No AMC/ALC services found
                </td>
              </tr>
            ) : (
              filteredServices.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 md:p-3 text-xs">{new Date(s.service_date).toLocaleDateString()}</td>
                  <td className="p-2 md:p-3 font-medium hidden sm:table-cell">
                    {s.contract_id ? (
                      <button 
                        onClick={() => {
                          const contract = contracts.find(c => c.id === s.contract_id);
                          if (contract) {
                            setSelectedContract(contract);
                            setContractUsage(contract);
                          }
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        {s.contract_title}
                      </button>
                    ) : (
                      s.contract_title || "---"
                    )}
                  </td>
                  <td className="p-2 md:p-3">{s.customer_name}</td>
                  <td className="p-2 md:p-3 text-center hidden md:table-cell">
                    <span className={`px-1 md:px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.service_type === "AMC" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>
                      {s.service_type}
                    </span>
                  </td>
                  <td className="p-2 md:p-3 hidden lg:table-cell">{s.service_person || "---"}</td>
                  <td className="p-2 md:p-3 text-right hidden sm:table-cell">₹{(parseFloat(s.petrol_charges) || 0).toLocaleString()}</td>
                  <td className="p-2 md:p-3 text-right hidden sm:table-cell">₹{(parseFloat(s.spare_parts_price) || 0).toLocaleString()}</td>
                  <td className="p-2 md:p-3 text-right hidden sm:table-cell">₹{(parseFloat(s.labour_charges) || 0).toLocaleString()}</td>
                  <td className="p-2 md:p-3 text-right font-bold">₹{(parseFloat(s.total_expenses) || 0).toLocaleString()}</td>
                  <td className="p-2 md:p-3 text-center hidden sm:table-cell">
                    <span className={`px-1 md:px-2 py-0.5 rounded-full text-xs ${
                      s.status === "Completed" ? "bg-green-100 text-green-700" :
                      s.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-2 md:p-3 text-center">
                    <div className="flex gap-1 md:gap-2 justify-center">
                      <button 
                        onClick={() => navigate(`/dashboard/proposal?client=${encodeURIComponent(s.customer_name || "")}&service_id=${s.id}`)} 
                        className="text-purple-600 hover:underline text-xs md:text-sm"
                        title="Create Quotation"
                      >
                        Quote
                      </button>
                      <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs md:text-sm">Edit</button>
                      <button onClick={() => deleteService(s.id)} className="text-red-600 hover:underline text-xs md:text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold">{isEdit ? "Edit Service" : "Add Service"}</h2>
              <X className="cursor-pointer hover:text-red-500" onClick={() => setOpen(false)} />
            </div>

            <form onSubmit={saveService} className="space-y-3 md:space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Service Type <span className="text-red-500">*</span></label>
                <select
                  value={form.service_type}
                  onChange={(e) => handleServiceTypeChange(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1 text-sm"
                  required
                >
                  <option value="None">None</option>
                  <option value="AMC">AMC (Annual Maintenance Contract)</option>
                  <option value="ALC">ALC (Annual Labour Contract)</option>
                </select>
              </div>

              {form.service_type !== "None" && (
                <div className="relative">
                  <label className="text-sm font-medium text-gray-600">
                    Select {form.service_type} Contract <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractSearch}
                    onChange={(e) => searchContract(e.target.value)}
                    onFocus={() => contractSearch && setShowContractDropdown(true)}
                    className="w-full border rounded-lg p-2 mt-1 text-sm"
                    placeholder={`Search ${form.service_type} contract or company...`}
                    required
                  />
                  {showContractDropdown && contractList.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {contractList.map(c => (
                        <div
                          key={c.id}
                          onClick={() => selectContract(c)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b"
                        >
                          <div className="font-medium">{c.contract_title || c.client_company}</div>
                          <div className="text-xs text-gray-500">
                            {c.client_company} - ₹{parseFloat(c.amount_value).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {contractUsage && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                      <RefreshCw size={14} /> Contract Summary
                    </h3>
                    <button 
                      onClick={() => {
                        setServiceFilterContract(contractUsage?.id?.toString() || "");
                        setActiveTab("services");
                      }}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      View Services
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Contract Value</p>
                      <p className="text-lg font-bold text-blue-700">₹{parseFloat(contractUsage.amount_value).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Used So Far</p>
                      <p className="text-lg font-bold text-orange-600">₹{parseFloat(contractUsage.used_total).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Services Done</p>
                      <p className="text-lg font-bold text-purple-700">{contractUsage.service_count}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className={`text-lg font-bold ${parseFloat(contractUsage.remaining) > 0 ? "text-green-600" : "text-red-600"}`}>
                        ₹{Math.max(0, parseFloat(contractUsage.remaining)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {parseFloat(contractUsage.remaining) <= 0 && (
                    <p className="text-xs text-red-600 font-medium text-center">
                      Contract value fully utilized! Additional costs will exceed contract amount.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm">
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Date <span className="text-red-500">*</span></label>
                  <input type="date" name="service_date" value={form.service_date} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Customer Name</label>
                  <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Mobile Number</label>
                  <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Location/City</label>
                  <input type="text" name="location_city" value={form.location_city} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Person</label>
                  <input type="text" name="service_person" value={form.service_person} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="Who performed the service?" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Time</label>
                  <input type="time" name="start_time" value={form.start_time} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">End Time</label>
                  <input type="time" name="end_time" value={form.end_time} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">KM</label>
                  <input type="number" name="km" value={form.km} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Technician</label>
                  <input type="text" name="technician" value={form.technician} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="Technician name" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Sales Person</label>
                  <input type="text" name="sales_person" value={form.sales_person} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="Sales person name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Remarks</label>
                  <input type="text" name="remarks" value={form.remarks} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="Additional remarks" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Service Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" rows={2} placeholder="Describe the service performed..." />
              </div>

              <div className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Cost Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Petrol (₹)</label>
                    <input type="number" name="petrol_charges" value={form.petrol_charges} onChange={handleChange}
                      className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="0.00" step="0.01" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Spare Parts (₹)</label>
                    <input type="number" name="spare_parts_price" value={form.spare_parts_price} onChange={handleChange}
                      className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="0.00" step="0.01" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Labour (₹)</label>
                    <input type="number" name="labour_charges" value={form.labour_charges} onChange={handleChange}
                      className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="0.00" step="0.01" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total (₹)</label>
                    <input type="number" name="total_expenses" value={form.total_expenses} readOnly
                      className="w-full border rounded-lg p-2 mt-1 text-sm bg-white font-bold text-blue-700" />
                  </div>
                </div>
                {contractUsage && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Contract Value:</span>
                      <span className="font-semibold">₹{parseFloat(contractUsage.amount_value).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Previously Used:</span>
                      <span className="font-semibold text-orange-600">₹{parseFloat(contractUsage.used_total).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">This Service:</span>
                      <span className="font-semibold text-blue-600">₹{(parseFloat(form.total_expenses) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-1 mt-1">
                      <span>Total After This:</span>
                      <span className={parseFloat(contractUsage.used_total) + (parseFloat(form.total_expenses) || 0) > parseFloat(contractUsage.amount_value) ? "text-red-600" : "text-green-600"}>
                        ₹{(parseFloat(contractUsage.used_total) + (parseFloat(form.total_expenses) || 0)).toLocaleString()} 
                        / ₹{parseFloat(contractUsage.amount_value).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Next Service Date</label>
                  <input type="date" name="next_service_date" value={form.next_service_date} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="client@email.com" />
                </div>
              </div>

              <div className="flex gap-2 pt-2 md:pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base">
                  {isEdit ? "Update" : "Save Service"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400 text-sm md:text-base">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTRACT CREATION MODAL */}
      {contractModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold">Create New Contract</h2>
              <X className="cursor-pointer hover:text-red-500" onClick={() => { setContractModalOpen(false); resetContractForm(); }} />
            </div>
            <form onSubmit={saveContract} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Contract Title <span className="text-red-500">*</span></label>
                  <input type="text" name="contract_title" value={contractForm.contract_title} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" placeholder="e.g. AMC Contract 2024" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Client Company <span className="text-red-500">*</span></label>
                  <select 
                    value={selectedClient} 
                    onChange={handleClientSelect}
                    className="w-full border rounded-lg p-2 mt-1 bg-white"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.phone ? `(${client.phone})` : ""}
                      </option>
                    ))}
                    <option value="other">+ Other (Type manually)</option>
                  </select>
                  {(showOtherClient || (!selectedClient && contractForm.client_company)) && (
                    <input 
                      type="text" 
                      name="client_company" 
                      value={contractForm.client_company} 
                      onChange={handleContractChange} 
                      className="w-full border rounded-lg p-2 mt-2" 
                      placeholder="Enter client name manually"
                      required 
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Mobile Number</label>
                  <input type="text" name="mobile_number" value={contractForm.mobile_number} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" placeholder="Phone number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <input type="email" name="email" value={contractForm.email} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" placeholder="email@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Location/City</label>
                  <input type="text" name="location_city" value={contractForm.location_city} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" placeholder="City" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Type <span className="text-red-500">*</span></label>
                  <select name="service_type" value={contractForm.service_type} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" required>
                    <option value="None">None</option>
                    <option value="AMC">AMC (Annual Maintenance Contract)</option>
                    <option value="ALC">ALC (Annual Labour Contract)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Contract Value (₹) <span className="text-red-500">*</span></label>
                  <input type="number" name="amount_value" value={contractForm.amount_value} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" placeholder="50000" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Date</label>
                  <input type="date" name="start_date" value={contractForm.start_date} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">End Date</label>
                  <input type="date" name="end_date" value={contractForm.end_date} onChange={handleContractChange} className="w-full border rounded-lg p-2 mt-1" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Save Contract</button>
                <button 
                  type="button" 
                  onClick={() => {
                    sessionStorage.setItem("quotation_prefill", JSON.stringify({
                      customer_name: contractForm.client_company,
                      mobile_number: contractForm.mobile_number,
                      email: contractForm.email,
                      location_city: contractForm.location_city,
                      contract_title: contractForm.contract_title,
                      contract_value: contractForm.amount_value,
                      service_type: contractForm.service_type,
                      start_date: contractForm.start_date,
                      end_date: contractForm.end_date,
                      from_contract: true
                    }));
                    navigate("/dashboard/proposal");
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Create Quotation
                </button>
                <button type="button" onClick={() => { setContractModalOpen(false); resetContractForm(); }} className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AMCService;