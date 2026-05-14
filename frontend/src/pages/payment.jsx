import React, { useState,useEffect } from "react";
import { Search, Plus, X,ChevronDown,Edit,Trash2 } from "lucide-react";
import "../Styles/tailwind.css";
import axios from "axios";

import { API } from "../config";

const Payments = () =>{
  const getAuthConfig = () => { const token = localStorage.getItem("token"); return { headers: { Authorization: `Bearer ${token}` } }; };
     const [open, setOpen] = useState(false);
       const tabopen = () => {
          resetForm();
         setOpen(true);
       };
      
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});

  const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN");

  const [form, setForm] = useState({
    invoice_id: "",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "",
    Transaction_ID: "",
    invoice_email: false,
  });

  // Fetch Payments
 const fetchPayment = async () => {
    try {
      const res = await axios.get(`${API}/api/payments`, getAuthConfig());
      console.log("PAYMENTS:", res.data);
      setPayment(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };
useEffect(() => {
  fetchPayment();
}, []);


 

  //  handle Change
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  //  Save Payment
  const savePayment = async (e) => {
  e.preventDefault();

  // Frontend validation
  const newErrors = {};
  const invoiceIdNum = Number(form.invoice_id);
  if (!form.invoice_id || isNaN(invoiceIdNum) || invoiceIdNum <= 0 || !Number.isInteger(invoiceIdNum)) {
    newErrors.invoice_id = "Invoice ID must be a valid positive number (e.g. 1, 2, 3)";
  }
  if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
    newErrors.amount = "Amount must be a positive number";
  }
  if (!form.payment_method) {
    newErrors.payment_method = "Please select a payment method";
  }
  if (form.Transaction_ID && !/^\d+$/.test(form.Transaction_ID)) {
    newErrors.Transaction_ID = "Transaction ID must contain numbers only (e.g. 123456)";
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  setErrors({});

  const payload = {
    invoice_id: invoiceIdNum,
    amount: Number(form.amount),
    payment_date: form.payment_date,
    payment_method: form.payment_method,
    Transaction_ID: form.Transaction_ID ? Number(form.Transaction_ID) : null,
    invoice_email: form.invoice_email ? 1 : 0,
  };

  try {
    if (isEdit) {
      await axios.put(`${API}/api/payments/${selectedPaymentId}`, payload, getAuthConfig());
      alert("Edited Successfully");
    } else {
      await axios.post(`${API}/api/payments/new`, payload, getAuthConfig());
      alert("Payments Created Successfully");
    }
    fetchPayment();
    resetForm(); 
  } catch (err) {
    console.error("SAVE ERROR:", err.response?.data || err);
    alert(err.response?.data?.message || "Payment save failed");
  }
};



  // EDIT
const openEditModal = (p) => {
  setForm({
    invoice_id: p.invoice_id ?? "",
    amount: p.amount ?? "",
    payment_date: p.payment_date?.split("T")[0] ?? "",
    payment_method: p.payment_method ?? "",
    Transaction_ID: p.Transaction_ID ?? "",
    invoice_email: Boolean(p.invoice_email),
  });

  setSelectedPaymentId(p.id);
  setIsEdit(true);
  setOpen(true);
};


const resetForm = () => {
  setForm({
    invoice_id: "",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "",
    Transaction_ID: "",
    invoice_email: false,
  });
  setErrors({});
  setIsEdit(false);
  setSelectedPaymentId(null);
  setOpen(false);
};



  // Delete Template
const deletePayment = async (id) => {
  if (!window.confirm("Are you sure you want to delete this payment?")) return;

  try {
    await axios.delete(`${API}/api/payments/${id}`, getAuthConfig());
    fetchPayment();
  } catch (err) {
    console.error("DELETE ERROR:", err);
    alert("Delete failed");
  }
};


      

    return(
    <center>

        <div className="payment-heading-tab flex gap-4 justify-between item-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1694CE] ml-[-75px]">PAYMENTS</h2>
          <a className="text-sm text-gray-500 " href="vii">
            APP &gt; PAYMENTS &gt; INVOICES
          </a>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-gray px-2 py-1 rounded-lg  border w-50 h-9 mt-3">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search by Invoice ID..."
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
       
       {/*  */}
         

       {/* Form */}
         <div className="overflow-y-auto ">
          <div className={`${open ? "fixed" : "hidden"} inset-0 bg-black/40 flex items-center justify-center z-50`}>
          {/* <div className={`overlay ${open ? "show" : ""}  overflow-y-auto`}> */}
              {/* <div className={`task-application bg-white shadow ml-[18%] w-[70%]  mb-[50px] overflow-y auto  p-5 rounded-lg  ${ */}
              {/* open ? "show" : ""}`}> */}
              <div className="bg-white shadow w-[90%] md:w-[70%] max-h-[90vh] overflow-y-auto p-5 rounded-lg">
                          <div className="mt-7 flex justify-between items-center">
                               <h2 className="text-2xl font-semibold mb-8 text-gray-700 mt-[-20px]">
                                 Add A New Payment
                               </h2>
                               <span className="mt-[-20px] x-icon" onClick={resetForm}>
                                 <X />
                               </span>
                             </div>

                             {/*Forms  */}
                         <div >
                            <form onSubmit={savePayment} className=" payment-form p-2 space-y-6 relative">

                         {/* Invoice ID */}
                         <div className="grid grid-cols-[180px_1fr] items-center gap-8">
                          <label className="text-sm text-gray-600 text-left">
                             Invoice ID <span className="text-red-500">*</span></label>

                           <div className="flex flex-col w-full gap-1">
                         <div className="flex w-full">
                         {/* PREFIX */}
                         <div className=" inv flex items-center w-[60px] px-2 bg-[#F5F5F5] border border-r-0 rounded-l-md  text-[#AAB1B5]">
                          <span>INV-</span>
                          </div>
                      {/* INPUT */}
                         <input
                          type="text"
                          value={form.invoice_id}
                          onChange={e => { if (/^\d*$/.test(e.target.value)) { setForm({...form, invoice_id: e.target.value}); setErrors({...errors, invoice_id: ""}); } }}
                          name="invoice_id"
                          placeholder="e.g. 1"
                          inputMode="numeric"
                         className={`border border-l-0 rounded-r-md px-3 py-2 outline-none w-full ${errors.invoice_id ? "border-red-400" : ""}`} />
                      </div>
                      {errors.invoice_id && <p className="text-red-500 text-xs mt-1">{errors.invoice_id}</p>}
                  </div>
                  </div>


                {/* Amount */}
                 <div className="grid grid-cols-[180px_1fr] items-center gap-8">
                 <label className="text-sm text-gray-600 text-left">
                   Amount <span className="text-red-500">*</span>
                </label>
                
                 <div className="flex w-full">
                  {/* PREFIX */}
                 <div className=" inv flex items-center w-[60px] px-2 bg-[#F5F5F5] border border-r-0 rounded-l-md  text-[#AAB1B5]">
                 <span className="ml-[10px]">₹</span>
                 </div>

                {/* INPUT */}
                  <input
                 type="number"
                 value={form.amount}
                 onChange={handleChange}
                 name="amount"
                 className="border border-l-0 rounded-r-md px-3 py-2 outline-none w-full" />
                 </div>
               </div>

  {/* Date */}
                <div className="grid grid-cols-[180px_1fr] items-center gap-8">
                 <label className="text-sm text-gray-600 text-left">
                 Date <span className="text-red-500">*</span></label>
                <input value={form.payment_date} onChange={handleChange} type="date" name="payment_date" className="border rounded-md px-3 py-2 outline-none w-full"/>
              </div>

  {/* Payment Method */}
               <div className=" paymentmethod grid grid-cols-[180px_1fr] items-center gap-8">
               <label className="text-sm text-gray-600 text-left">
                Payment Method <span className="text-red-500">*</span></label>

                {/*Select Method  */}
                 <div className="select-method-tab relative w-full">
  {/* Input */}
                  <input
                   type="text"
                   readOnly
                   onChange={handleChange}
                   name="payment_method"
                  value={form.payment_method}
                  placeholder="Select Method"
                  onClick={() => setPaymentOpen(!paymentOpen)}
                  className="border rounded-md px-3 py-2 outline-none w-full cursor-pointer font-['Times_New_Roman']"/>
                   <ChevronDown size={18} className={`chev-down absolute top-4 right-4 transition-transform duration-300
                   ${paymentOpen ? "rotate-180": ""  }`}   onClick={() => setPaymentOpen(!paymentOpen)}/>
  {/* Dropdown */}
               {paymentOpen && (
                <div className=" option-tab absolute left-0 right-0 bg-gray-100 border rounded-md mt-1 shadow z-10">
              {["Paypal", "Cash", "Bank"].map((method) => (
              <h4
              key={method}
              onClick={() => {
              setForm({ ...form, payment_method: method });
              setPaymentOpen(false);
          }}
          className="px-3 py-2 cursor-pointer hover:bg-blue-600 hover:text-white text-left font-['Times_New_Roman']">
          {method}
        </h4>
      ))}
    </div>
  )}
</div>                
</div>

  {/* Transaction ID */}
             <div className="grid grid-cols-[180px_1fr] items-center gap-8">
            <label className="text-sm text-gray-600 text-left">Transaction ID</label>
            <div className="flex flex-col gap-1 w-full">
              <input
                type="text"
                onChange={e => { if (/^\d*$/.test(e.target.value)) { setForm({...form, Transaction_ID: e.target.value}); setErrors({...errors, Transaction_ID: ""}); } }}
                value={form.Transaction_ID}
                name="Transaction_ID"
                placeholder="Numbers only, e.g. 123456"
                inputMode="numeric"
                className={`border rounded-md px-3 py-2 outline-none w-full ${errors.Transaction_ID ? "border-red-400" : ""}`} />
              {errors.Transaction_ID && <p className="text-red-500 text-xs">{errors.Transaction_ID}</p>}
            </div>
            </div>

            {/* Send the email */}

              {/* <div className="Email flex items-start gap-2 text-left w-[50%] ml-[-54%]">
             <input
              type="checkbox"
              name="invoice_email"
              value={form.invoice_email}
               onChange={(e) =>
               setForm({ ...form, invoice_email: e.target.checked }) }
              className="mt-1 shrink-0 w-[40px]"/>
              <label className="text-sm  text-gray-600 leading-5 w-[68%]">
              Send the client a payment received email</label>
             </div> */}


              {/* submit / close */}
               
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
          </div>
         </div>
         {/*  */}
          <div className="mt-[60px]">
             <table className="w-full border-collapse bg-white text-center font-[Times-New-Roman]">
               <thead className="border-b">
               <tr className="text-sm text-[#1694CE]">
                <th className="p-4">Invoice Id</th>
                  <th className="p-4"> Date</th>
                 <th className="p-4">Amount</th>
                 <th className="p-4">Payment Method</th>
                  <th className="p-4">Transaction Id</th>
                   <th className="p-4 ">Action</th>
               </tr>
               </thead>
                 {/*  */}

                <tbody>
  {payment.length === 0 ? (
    <tr>
      <td colSpan="6" className="text-center py-6 text-gray-400">
        No payments found
      </td>
    </tr>
  ) : (
    payment.filter(p => {
      if (!searchTerm) return true;
      const formatted = `INV-${String(p.invoice_id).padStart(6, "0")}`;
      return formatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
             String(p.invoice_id).includes(searchTerm);
    }).map((p) => (
      <tr key={p.id} className="border-b text-sm hover:bg-gray-50">
        <td className="p-4 text-[#1694CE]">
          INV-{String(p.invoice_id).padStart(6, "0")}
        </td>

        <td className="p-4">
          {formatDate(p.payment_date)}
        </td>

        <td className="p-4">
          ₹{Number(p.amount).toFixed(2)}
        </td>

        <td className="p-4">
          {p.payment_method}
        </td>

        <td className="p-4">
          {p.Transaction_ID || "---"}
        </td>

        <td className="p-4 text-center">
          <button
            onClick={() => deletePayment(p.id)}
            className="text-red-500 mr-2"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => openEditModal(p)}
            className="text-green-600"
          >
            <Edit size={16} />
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>



             </table>
          </div>


     </center>
 )
}
export default Payments;
