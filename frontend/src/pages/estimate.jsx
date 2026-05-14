import React, { useState,useEffect} from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X,Trash2,Edit } from "lucide-react";
import axios from "axios";
import { API } from "../config";

const getAuthConfig = () => { const token = localStorage.getItem("token"); return { headers: { Authorization: `Bearer ${token}` } }; };


const Estimate = () => {
  const [open, setOpen] = useState(false);

  const tabopen = () => {
    resetForm();
    setOpen(true);
  };


  const [clientSearch, setClientSearch] = useState("");
  const [clientList, setClientList] = useState([]);
  const [clientType, setClientType] = useState("existing");

  const [EstimateCompany, setCompanyName] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");

  const [estimateCompany, setProjectname] = useState("");
  const [EstimateDate, setInvoiceDate] = useState("");
  const [ExpiryDate, setInvoiceDueDate] = useState("");
  const [category, setCategory] = useState("Default");

  const [Estimate, setEstimate] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isEdit, setIsEdit] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState(null);




  // Fetch 

  const Fetchestimate = async () =>{
     try{
  const response = await axios.get(`${API}/api/estimate`, getAuthConfig());
  console.log("INVOICES:", response.data); 
    setEstimate(response.data);
  } catch (err) {
    console.log("Fetch Error:", err);
  }
};
useEffect(() => {
  Fetchestimate();
}, []);

  
  // Search client
  const searchClient = async (value) => {
    setClientSearch(value);
    if (!value) return setClientList([]);

    try {
      const res = await axios.get(
        `${API}/api/estimate-client/search?name=${value}`, getAuthConfig()
      );
      setClientList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const selectClient = (client) => {
    setClientSearch(client.company_name);
    setClientList([]);
    setClientType("existing");
  };

  // restet from
  const resetForm = () => {
  setClientSearch("");
  setClientList([]);
  setClientType("existing");

  setCompanyName("");
  setFirstname("");
  setLastname("");
  setEmail("");

  setProjectname("");
  setInvoiceDate("");
  setInvoiceDueDate("");
  setCategory("Default");

  setIsEdit(false);
  setSelectedEstimateId(null);
  setOpen(false);
};


  // Save Client + Invoice
 const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    let companyName = clientSearch;

    //  New Client Flow
   if (clientType === "new") {
      if (!EstimateCompany || !firstname || !lastname || !email) {
        alert("All client fields required");
        return;
      }

      await axios.post(`${API}/api/estimate-client/new`, {
        company_name: EstimateCompany,
        client_firstname: firstname,
        client_lastname: lastname,
        client_email: email,
      }, getAuthConfig());
      alert("Client created successfully");
      resetForm();
      return;
    }

    // common validation
    if (!companyName || !EstimateDate || !ExpiryDate) {
      alert("All estimate fields required");
      return;
    }

    const payload = {
      client_company: companyName,
      project_names: estimateCompany,
      Estimate_date: EstimateDate,
      Expiry_date: ExpiryDate,
      category,
    };

    // Edit Mode
    if (isEdit && selectedEstimateId) {
      await axios.put(
        `${API}/api/estimate/${selectedEstimateId}`,
        payload, getAuthConfig()
      );
      alert("Estimate updated successfully");
    }
    // Create Mode
    else {
      await axios.post(
        `${API}/api/estimate/new`,
        payload, getAuthConfig()
      );
      alert("Estimate created successfully");
    }

    // RESET & REFRESH
    resetForm();
    Fetchestimate();

  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    alert(err.response?.data?.message || "Submit failed");
  }
};

  //  EDIT 
  const openEditModal = (est) => {
    setClientSearch(est.estimate_company);
    setProjectname(est.project_estimate);
    setInvoiceDate(est.Estimate_date.split("T")[0]);
    setInvoiceDueDate(est.Expiry_date.split("T")[0]);
    setCategory(est.category);

    setSelectedEstimateId(est.id);
    setIsEdit(true);
    setOpen(true);
  };

  //  DELETE
  const deleteEstimate = async (id) => {
    if (!window.confirm("Delete this estimate?")) return;

    try {
      await axios.delete(`${API}/api/estimate/${id}`, getAuthConfig());
      alert("Estimate deleted");
      Fetchestimate();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };


  return (
    <div className="invoices-main-tab">
      <div className="invoice-heading-tab flex gap-4 justify-between item-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE]">Estimates</h2>
          <a className="text-sm text-gray-500" href="vii">
            APP &gt; SALES
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
        <div className={`${open ? "fixed" : "hidden"} inset-0 bg-black/40 flex items-center justify-center z-50`}>
        {/* <div className={`overlay ${open ? "show" : ""} overflow-y-auto  `}> */}
          {/* <div
            className={`task-application bg-white shadow ml-[18%] w-[70%] mt-[40%]  mb-[50px] overflow-y-auto p-5 rounded-lg  ${
              open ? "show" : ""
            }`}
          > */}
          <div className="bg-white shadow w-[90%] md:w-[70%] max-h-[90vh] overflow-y-auto p-5 rounded-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold mb-8 text-gray-700 mt-[-20px]">
                Create A New Estimate
              </h2>
              <span className="mt-[-20px] x-icon" onClick={resetForm}>
                <X />
              </span>
            </div>

            <form className="invoice-form p-6 space-y-6 relative " onSubmit={handleSubmit}>
              <div>
                <div className="grid grid-cols-4 items-center gap-6">
                  <label className="text-sm text-gray-600">
                    Client<span className="text-red-500">*</span>
                  </label>

                    {clientType === "existing" && (
                    <input
                     type="text"
                      name="client_company"
                      value={clientSearch}
                   onChange={(e) => searchClient(e.target.value)}
                className="col-span-3 border rounded-md px-3 py-2 outline-none bg-white w-[100%]"
               placeholder="Search Client Company" />
                )}  
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

                <div className="grid grid-cols-4 items-center gap-6 mt-[15px]">
                  <label className="text-sm text-gray-600">Project</label>
                 <input
                  type="text"
                  name="project_names"
                  value={estimateCompany}
                  onChange={(e) => setProjectname(e.target.value)}
                  className={`col-span-3 border rounded-md px-3 py-2 outline-none w-[100%] ${
                  clientType === "new" ? "bg-gray-200 cursor-not-allowed" : "bg-white"}`}
                  disabled={clientType === "new"}/>
                </div>
              </div>

              {clientType === "new" && (
                <div className="bg-gray-100 p-6 rounded-lg space-y-4 new-clienttab transition-all">
                  <div className="grid grid-cols-4 items-center gap-6">
                    <label>
                      Company Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      name="company_name" 
                      value={EstimateCompany}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="col-span-3 border rounded-md px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-6">
                    <label>
                      First Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      name="client_firstname"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      className="col-span-3 border rounded-md px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-6">
                    <label>
                      Last Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      name="client_lastname"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      className="col-span-3 border rounded-md px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-6">
                    <label>
                      Email<span className="text-red-500">*</span>
                    </label>
                    <input
                      name="client_email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="col-span-3 border rounded-md px-3 py-2 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="col-span-3 text-sm text-gray-500 text-right mt-[20px]">
                <span
                  onClick={() => setClientType("new")}
                  className="cursor-pointer "
                >
                  New Client
                </span>{" "}
                |{" "}
                <span
                  onClick={() => setClientType("existing")}
                  className=" cursor-pointer bg-gray-300 text-white px-2 py-1 rounded"
                >
                  Existing Client
                </span>
              </div>

              <div className="grid grid-cols-4 items-center gap-6 ">
                <label className="text-sm text-gray-600">
                  Invoice Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="Estimate_date"
                  value={EstimateDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="col-span-3 border rounded-md px-3 py-2 outline-none w-[100%]"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-6 ">
                <label className="text-sm text-gray-600">
                  Due Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="Expiry_date"
                  value={ExpiryDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="col-span-3 border rounded-md px-3 py-2 outline-none"
                />
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
                  <option value="Default">Default</option>
                </select>
              </div>

            

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>

                <button
                  onClick={resetForm}
                  type="button"
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-red-500"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
          
        </div>
        {/* table */}
       <div className="mt-[60px] ">
    <table className="w-full border-collapse bg-white font-[Times-New-Roman] text-center">
  <thead className="border-b">
    <tr className="text-sm text-[#1694CE]">
      <th className="p-3">ID </th>
      <th className="p-3">Company Name </th>
      <th className="p-3">Project Title </th>
      <th className="p-3">Estimate Date</th>
       <th className="p-3">Expiry Date</th>
      <th className="p-3">Action</th>
    </tr>
  </thead>

  <tbody>
  {Estimate.length === 0 ? (
    <tr>
      <td colSpan="9" className="text-center py-10 text-gray-400">
        No invoices found
      </td>
    </tr>
  ) : (
    Estimate.filter(E => E.client_company?.toLowerCase().includes(searchTerm.toLowerCase())).map((E) => (
      <tr key={E.id} className="border-b hover:bg-gray-50 text-sm">

          <td className="p-4">
            {E.id}
          </td>
        {/* client name */}
        <td className="p-4 text-[#1694CE]">
          {E.client_company}
        </td>
        {/* project title */}
        <td className="p-4">
          {E.project_names || "---"}
        </td>
       {/* Estimate date */}
        <td className="p-4">
          {new Date(E.Estimate_date).toLocaleDateString()}
        </td>
       {/* expiry */}
        <td className="p-4">
          {new Date(E.Expiry_date).toLocaleDateString()}
        </td>

        <td className="p-4 flex gap-3 ">
         <div className="flex gap-3 ml-[20px] ml-[60px]">
                     <button
                      type="button"
                       onClick={() => deleteEstimate(E.id)}
                       className="text-red-500 hover:text-red-700">
                       <Trash2 size={18} />
                       </button>

                        <button
                         type="button"
                          onClick={() => openEditModal(E)}
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

export default Estimate;
