import React, { useState,useEffect} from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X,Trash2,Edit, FileText } from "lucide-react";
import axios from "axios";

const Contracts = () => {
  const [open, setOpen] = useState(false);

  const tabopen = () => {
    setOpen(true);
  };

  //
    const [clientSearch, setClientSearch] = useState("");
  const [clientList, setClientList] = useState([]);

  const [projectNames, setProjectname] = useState("");
  const [contractName, setContracts] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [category, setCategory] = useState("Default");
  const [Amount,Setamount] = useState("");
   const [isEdit, setIsEdit] = useState(false);
      const [selectedContaractId, setSelectedContractId] = useState(null);
  const [contractType, setContractType] = useState("Service"); // Service, AMC, ALC
  const [quotationId, setQuotationId] = useState(""); // For converting quotation to contract
  

  const [contracts, setcontracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [quotations, setQuotations] = useState([]);

  const formatInvoiceId = (id) => `CO-${String(id).padStart(6, "0")}`;

  const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN");


  // Fetch 
  

    const fetchContracts = async () => {
  try {
    const response = await axios.get(
      "http://localhost:3000/api/contract"
    );
    console.log("Contracts:", response.data); 
    setcontracts(response.data);
  } catch (err) {
    console.log("Fetch Error:", err);
  }
};
useEffect(() => {
    fetchContracts();
    fetchQuotations();
    
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
  }, []);

const fetchQuotations = async () => {
  try {
    const response = await axios.get("http://localhost:3000/api/quotations");
    setQuotations(response.data);
  } catch (err) {
    console.log("Fetch quotations error:", err);
  }
};



  // Search client
  const searchClient = async (value) => {
    setClientSearch(value);
    if (!value) return setClientList([]);

    try {
      const res = await axios.get(
        `http://localhost:3000/api/client/search?name=${value}`
      );
      setClientList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const selectClient = (client) => {
    setClientSearch(client.company_name);
    setClientList([]);
  };

  // Save contarcts

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
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
        `http://localhost:3000/api/contract/${selectedContaractId}`,
        payload
      );
      alert("Contract Updated Successfully");
    } else {
      await axios.post(
        "http://localhost:3000/api/contract/new",
        payload
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
    setInvoiceDueDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)); // 1 year from now
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



  // Delete Template
const deletePayment = async (id) => {
  if (!window.confirm("Are you sure you want to delete this payment?")) return;

  try {
    await axios.delete(`http://localhost:3000/api/contract/${id}`);
    fetchContracts();
  } catch (err) {
    console.error("DELETE ERROR:", err);
    alert("Delete failed");
  }
};

// Convert contract to quotation
const convertToQuotation = (contract) => {
  sessionStorage.setItem("qt_prefill", JSON.stringify({
    customer_name: contract.client_company || "",
    mobile_number: contract.mobile_number || "",
    email: contract.email || "",
    location_city: contract.location_city || "",
    lead_id: contract.id || null,
    lead_type: "contract",
    prefill_contract: {
      contract_id: contract.id,
      contract_title: contract.contract_title,
      template_names: contract.template_names,
      amount_value: contract.amount_value,
      contract_type: contract.contract_type
    }
  }));
  window.location.href = "/dashboard/proposal";
};



  return (
    <div className="invoices-main-tab">
      <div className="invoice-heading-tab flex gap-4 justify-between item-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">CONTRACTS</h2>
          <a className="text-sm text-gray-500" href="vii">
            APP &gt; CONTRACTS
          </a>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-gray px-2 py-1 rounded-lg  border w-50 h-9 mt-3">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search by company name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="Search outline-none text-sm w-full bg-gray-100"
            />
          </div>

          <div className="mt-2">
            <button
              onClick={() => tabopen(true)}
              className="bg-[#FF3355] text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg hover:bg-[#e62848] "
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto ">
        <div className={`overlay ${open ? "show" : ""} overflow-y-auto  `}>
          <div
            className={`task-application bg-white shadow ml-[18%] w-[70%]  mb-[50px] overflow-y-auto p-5 rounded-lg  ${
              open ? "show" : ""
            }`}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold mb-8 text-gray-700 mt-[-20px]">
                Create A New Contract
              </h2>
              <span className="mt-[-20px] x-icon" onClick={() => setOpen(false)}>
                <X />
              </span>
            </div>

            <form className="invoice-form p-6 space-y-6 relative " onSubmit ={handleSubmit}>
              <div>
                <div className="grid grid-cols-4 items-center gap-6">
                  <label className="text-sm text-gray-600">
                    Client<span className="text-red-500">*</span>
                  </label>

                    <input
                     type="text"
                      name="client_company"
                      value={clientSearch}
                  onChange={(e) => searchClient(e.target.value)}
                className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"
               placeholder="Search Client Company" />
                
                {/*  */}
                </div>

                {clientList.length > 0 && (
                  <div className="absolute bg-white top-[-15px] ml-[190px] border shadow-md col-span-3 mt-[90px] w-[300px] z-10">
                    {clientList.map((c, index) => (
                      <p
                        key={index}
                        onClick={() => selectClient(c)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {c.company_name}
                      </p>
                    ))}
                  </div>
                )}
              </div>

{/*  */}

                 <div className="grid grid-cols-4 items-center gap-6 mt-[15px]">
                  <label className="text-sm text-gray-600">Contract Title</label>
                 <input
                  type="text"
                  name="contract_title"
                  value={contractName}
                  onChange={(e) => setContracts(e.target.value)}
                  className={`col-span-3 border rounded-md px-3 py-2 outline-none w-[100%]` }/>
                </div>

              <div className="grid grid-cols-4 items-center gap-6 ">
                <label className="text-sm text-gray-600">
                  Start Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="col-span-3 border rounded-md px-3 py-2 outline-none w-[100%]"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-6 ">
                <label className="text-sm text-gray-600">
                  End Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="col-span-3 border rounded-md px-3 py-2 outline-none"
                />
              </div>

              {/* Value */}
               
               <div className="grid grid-cols-4 items-center gap-6 mt-[15px]">
                  <label className="text-sm text-gray-600">Project</label>
                 <input
                  type="number"
                  name="amount_value"
                  value={Amount}
                  onChange={(e) => Setamount(e.target.value)}
                  className={`col-span-3 border rounded-md px-3 py-2 outline-none w-[100%]` } />
                </div>

              {/* Contract Type */}
              <div className="grid grid-cols-4 items-center gap-6 ">
                <label className="text-sm text-gray-600">
                  Contract Type<span className="text-red-500">*</span>
                </label>
                <select
                  name="contract_type"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white"
                >
                  <option value="Service">Service Contract</option>
                  <option value="AMC">AMC (Annual Maintenance Charge)</option>
                  <option value="ALC">ALC (Annual Labour Charge)</option>
                </select>
              </div>

             

              <div className="grid grid-cols-4 items-center gap-6 ">
                <label className="text-sm text-gray-600">
                  Category<span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white"
                >
                  <option value="Default">NEW</option>
                  <option value="AMC">Converted</option>
                  <option value="ALC">Disqualified</option>
                  
                </select>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <span className="">Additional Information</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-4 after:w-4 after:rounded-full after:transition peer-checked:after:translate-x-5"></div>
                </label>
              </div>

              <p className="text-xs text-gray-500">* Required</p>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>

                <button
                  onClick={() => setOpen(false)}
                  type="button"
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-red-500"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
          
        </div>

        {/* Table */}

        <div className="bg-white shadow rounded-xl overflow-x-auto mt-5 ">
        <table className="w-full text-sm border border-gray-300 table-fixed w-[130%]">
       <thead className="bg-[#f8faf9]">
        <tr className="text-black font-[Times-New-Roman] uppercase text-xs ">
         <th className="border px-4 py-3 text-center">ID</th>
         <th className="border px-4 py-3">Date</th>
         <th className="border px-4 py-3">Client</th>
         <th className="border px-4 py-3 ">Contract Title</th>
         <th className="border px-4 py-3">Type</th>
         <th className="border px-4 py-3">Value</th>
         <th className="border px-4 py-3">Status</th>
         <th className="border px-4 py-3  text-center">Actions</th>
       </tr>
    </thead>

    <tbody className="text-sm font-[Times-New-Roman] text-center">
  {contracts.length === 0 ? (
    <tr>
      <td colSpan="8" className="py-6 text-gray-400">
        No invoices found
      </td>
    </tr>
  ) : (
    contracts.filter(inv => inv.client_company?.toLowerCase().includes(searchTerm.toLowerCase())).map((inv) => (
      <tr key={inv.id} className="hover:bg-gray-100 transition">
        <td className="border px-3 py-3 ">
          {formatInvoiceId(inv.id)}
        </td>

        <td className="border px-4 py-2">
          {formatDate(inv.start_date)}
        </td>

        <td className="border px-4 py-2">
          {inv.client_company}
        </td>

        <td className="border px-4 py-2">
          {inv.template_names}
        </td>

        <td className="border px-4 py-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
            inv.contract_type === 'AMC' ? 'bg-blue-100 text-blue-700' :
            inv.contract_type === 'ALC' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {inv.contract_type || 'Service'}
          </span>
        </td>

        <td className="border px-4 py-2">
          ₹{Number(inv.amount_value || 0).toFixed(2)}
        </td>

        <td className="border px-4 py-2">
          <span
            className={`px-3 py-1 rounded text-xs ${
              inv.amount_value > 0
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {inv.amount_value > 0 ? "Partial" : "Draft"}
          </span>
        </td>

        <td className="border px-4 py-2 text-center">
          <div className="flex gap-3 ml-[20px] ">
            <button
              type="button"
              onClick={() => convertToQuotation(inv)}
              title="Convert to Quotation"
              className="text-blue-600 hover:text-blue-800">
              <FileText size={18} />
            </button>

            <button
             type="button"
              onClick={() => deletePayment(inv.id)}
              className="text-red-500 hover:text-red-700">
              <Trash2 size={18} />
             </button>

              <button
               type="button"
                onClick={() => openEditModal(inv)}
                className="text-green-600 hover:text-green-800">
                <Edit size={18} />
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
    </div>
  );
};

export default Contracts;
