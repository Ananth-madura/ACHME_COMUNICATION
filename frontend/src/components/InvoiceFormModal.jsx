import { PlusCircle, MinusCircle, Plus, X, MapPin } from "lucide-react";
import { calculateItemTotal, calculateTotals } from "../utils/invoicecal";
import axios from "axios";

const UOM_OPTIONS = ["Nos", "Units", "Pieces", "Boxes", "Sets", "Meters", "Kg", "Liters"];
const TAX_OPTIONS = [{ value: "GST18", label: "GST 18%" }, { value: "GST5", label: "GST 5%" }, { value: "CUSTOM", label: "Custom GST" }];
const PAYMENT_OPTIONS = ["100% Advance", "Payment Against Delivery", "15 Days", "30 Days", "45 Days", "Custom"];
const WARRANTY_OPTIONS = ["No Warranty", "Testing Warranty", "1 Month", "3 Months", "6 Months", "12 Months", "24 Months", "36 Months", "OEM Warranty", "Supplier Warranty", "OEM Hardware Warranty", "No Software Warranty"];

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5">
      <div className="h-1 w-5 bg-blue-500 rounded" />
      <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">{children}</h3>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  );
}

export default function InvoiceFormModal({
  open, editId, title, prefix, dateLabel,
  fromAddresses, showAddAddress, newAddrLabel, newAddrText,
  setNewAddrLabel, setNewAddrText, setShowAddAddress,
  handleAddAddress, handleDeleteAddress,
  extra, setExtra,
  clients, clientSearch, clientDropdown,
  handleClientSearch, handleSelectClient,
  customer, setCustomer,
  invoiceDate, setInvoiceDate,
  items, updateItem, addItem, removeItem,
  proposals, showProposalFill,
  handleSubmit, resetForm,
}) {
  const taxRate = extra.tax_type === "GST5" ? 5 : extra.tax_type === "CUSTOM" ? (Number(extra.custom_tax) || 0) : 18;
  const totals = calculateTotals(items.map(i => ({ ...i, tax: taxRate })));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-center items-start overflow-y-auto pt-6 pb-10">
      <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl p-7 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{editId ? `Edit ${title}` : `Create ${title}`}</h2>
          <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { resetForm(); }} />
        </div>

        {showProposalFill && proposals.length > 0 && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center gap-3 border border-blue-100">
            <span className="text-sm font-semibold text-blue-800">Quick Fill from Quotation:</span>
            <select onChange={async e => {
              if (!e.target.value) return;
              const res = await axios.get(`http://localhost:3000/api/quotations/${e.target.value}`);
              const rows = res.data; const h = rows[0];
              setCustomer({ customer_name: h.customer_name, mobile_number: h.mobile_number, email: h.email, location_city: h.location_city });
            }} className="bg-white border text-sm rounded-md px-3 py-1.5 outline-none flex-1 max-w-xs">
              <option value="">Select a Quotation</option>
              {proposals.map(q => <option key={q.id} value={q.id}>{q.customer_name} (#{q.id})</option>)}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <SectionTitle>From Address</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Select Office Address</label>
              <select value={extra.from_address_id} onChange={e => setExtra(ex => ({ ...ex, from_address_id: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none bg-white text-sm">
                <option value="">-- Select Address --</option>
                {fromAddresses.map(a => <option key={a.id} value={a.id}>{a.label} — {a.address.substring(0, 40)}...</option>)}
              </select>
              {extra.from_address_id && fromAddresses.filter(a => String(a.id) === String(extra.from_address_id)).map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 mt-1">
                  <MapPin size={11} /><span className="flex-1">{a.address}</span>
                  <button type="button" onClick={() => handleDeleteAddress(a.id)} className="text-red-400 hover:text-red-600"><X size={11} /></button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Custom Address</label>
              <textarea value={extra.from_address_custom} onChange={e => setExtra(ex => ({ ...ex, from_address_custom: e.target.value }))} placeholder="Enter custom address..." className="border rounded-lg px-3 py-2 outline-none text-sm min-h-[60px]" />
            </div>
          </div>
          <button type="button" onClick={() => setShowAddAddress(p => !p)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={11} /> Add New Address to List</button>
          {showAddAddress && (
            <div className="bg-gray-50 border rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={newAddrLabel} onChange={e => setNewAddrLabel(e.target.value)} placeholder="Label (e.g. Coimbatore)" className="border rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={newAddrText} onChange={e => setNewAddrText(e.target.value)} placeholder="Full address..." className="border rounded-lg px-3 py-2 text-sm outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={handleAddAddress} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Save</button>
                <button type="button" onClick={() => setShowAddAddress(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          <SectionTitle>Client Details</SectionTitle>
          <div className="relative mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Select Existing Client</label>
            <div className="flex gap-2 mt-1">
              <input type="text" value={clientSearch} onChange={e => handleClientSearch(e.target.value)} placeholder="Search by name or company..." className="border rounded-lg px-3 py-2 outline-none text-sm flex-1" />
              {clientSearch && <button type="button" onClick={() => handleClientSearch("")} className="text-gray-400 hover:text-red-500"><X size={16} /></button>}
            </div>
            {clientDropdown.length > 0 && (
              <div className="absolute z-20 bg-white border shadow-lg rounded-lg mt-1 w-full max-h-48 overflow-y-auto">
                {clientDropdown.map(c => (
                  <div key={c.id} onClick={() => handleSelectClient(c)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0">
                    <span className="font-semibold">{c.company_name || c.name}</span>
                    {c.phone && <span className="text-black ml-2 text-xs font-semibold">Ph: {c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Reference No</label><input type="text" value="Auto-generated" readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-gray-400 text-sm cursor-not-allowed" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Company Name</label><input type="text" value={extra.client_company} onChange={e => setExtra(ex => ({ ...ex, client_company: e.target.value }))} placeholder="e.g. ABC Technologies" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label><input type="text" value={customer.customer_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setCustomer({ ...customer, customer_name: e.target.value }); }} placeholder="e.g. Ravi Kumar" className="border rounded-lg px-3 py-2 outline-none text-sm" required /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Mobile *</label><input type="text" value={customer.mobile_number} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setCustomer({ ...customer, mobile_number: e.target.value }); }} maxLength={13} inputMode="numeric" className="border rounded-lg px-3 py-2 outline-none text-sm" required /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Address Line 1</label><input type="text" value={extra.client_address1} onChange={e => setExtra(ex => ({ ...ex, client_address1: e.target.value }))} placeholder="Street / Building" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Address Line 2</label><input type="text" value={extra.client_address2} onChange={e => setExtra(ex => ({ ...ex, client_address2: e.target.value }))} placeholder="Area / Landmark" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">City</label><input type="text" value={extra.client_city} onChange={e => setExtra(ex => ({ ...ex, client_city: e.target.value }))} placeholder="e.g. Chennai" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">State</label><input type="text" value={extra.client_state} onChange={e => setExtra(ex => ({ ...ex, client_state: e.target.value }))} placeholder="e.g. Tamil Nadu" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">PIN Code</label><input type="text" value={extra.client_pincode} onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setExtra(ex => ({ ...ex, client_pincode: e.target.value })); }} maxLength={6} inputMode="numeric" placeholder="e.g. 600001" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Country</label><input type="text" value={extra.client_country} readOnly className="border rounded-lg px-3 py-2 outline-none bg-gray-50 text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">{dateLabel} *</label><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="border rounded-lg px-3 py-2 outline-none text-sm" required /></div>
          </div>

          <SectionTitle>Tax Configuration</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TAX_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition ${extra.tax_type === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                <input type="radio" name={`tax_type_${prefix}`} value={opt.value} checked={extra.tax_type === opt.value} onChange={e => setExtra(ex => ({ ...ex, tax_type: e.target.value }))} className="accent-blue-600" />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          {extra.tax_type === "CUSTOM" && (
            <div className="flex flex-col gap-1 max-w-xs"><label className="text-xs font-bold text-gray-500 uppercase">Custom GST %</label><input type="number" value={extra.custom_tax} onChange={e => setExtra(ex => ({ ...ex, custom_tax: e.target.value }))} placeholder="e.g. 12" min="0" max="100" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
          )}

          <SectionTitle>Quote Items</SectionTitle>
          <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-center text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr className="text-gray-600 font-bold uppercase text-[10px]">
                  <th className="px-3 py-2">S.No</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Brand &amp; Model</th>
                  <th className="px-3 py-2">UOM</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 text-gray-400">Tax %</th><th className="px-3 py-2">Disc</th><th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-2 py-2"><input type="text" value={item.name} onChange={e => updateItem(i, "name", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Description" /></td>
                    <td className="px-2 py-2"><input type="text" value={item.brand_model} onChange={e => updateItem(i, "brand_model", e.target.value)} className="w-full outline-none bg-transparent text-sm" placeholder="Brand/Model" /></td>
                    <td className="px-2 py-2">
                      <select value={UOM_OPTIONS.includes(item.uom) ? item.uom : "custom"} onChange={e => updateItem(i, "uom", e.target.value)} className="border rounded px-2 py-1 text-xs outline-none bg-white">
                        {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        <option value="custom">Custom</option>
                      </select>
                      {!UOM_OPTIONS.includes(item.uom) && <input type="text" value={item.uom} onChange={e => updateItem(i, "uom", e.target.value)} placeholder="Enter UOM" className="mt-1 border rounded px-2 py-1 text-xs w-full outline-none" />}
                    </td>
                    <td className="px-2 py-2"><input type="number" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="w-20 text-center outline-none bg-transparent text-sm" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.qty} onChange={e => updateItem(i, "qty", Number(e.target.value))} className="w-12 text-center outline-none bg-transparent text-sm" /></td>
                    <td className="px-2 py-2"><input type="number" value={taxRate} readOnly className="w-12 text-center text-gray-400 bg-transparent outline-none cursor-not-allowed text-sm" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.discount} onChange={e => updateItem(i, "discount", Number(e.target.value))} className="w-16 text-center outline-none bg-transparent text-sm" /></td>
                    <td className="px-2 py-2 text-right font-bold text-sm">&#8377;{calculateItemTotal({ ...item, tax: taxRate }).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-gray-50 p-3 flex gap-4">
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:underline"><PlusCircle size={13} /> Add Line</button>
              <button type="button" onClick={removeItem} className="flex items-center gap-1 text-red-500 font-bold text-xs hover:underline"><MinusCircle size={13} /> Remove Line</button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>&#8377;{totals.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span>-&#8377;{totals.total_discount.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>CGST ({taxRate/2}%)</span><span>&#8377;{totals.total_cgst.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>SGST ({taxRate/2}%)</span><span>&#8377;{totals.total_sgst.toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold text-blue-700"><span>Grand Total</span><span>&#8377;{totals.grand_total.toLocaleString()}</span></div>
            </div>
          </div>

          <SectionTitle>Executive Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Executive Name</label><input type="text" value={extra.exec_name} onChange={e => { if (!/[0-9]/.test(e.nativeEvent.data)) setExtra(ex => ({ ...ex, exec_name: e.target.value })); }} placeholder="e.g. Anbu Selvan" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label><input type="text" value={extra.exec_phone} onChange={e => { if (/^\d{0,13}$/.test(e.target.value)) setExtra(ex => ({ ...ex, exec_phone: e.target.value })); }} maxLength={13} inputMode="numeric" placeholder="e.g. 9876543210" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Email ID</label><input type="email" value={extra.exec_email} onChange={e => setExtra(ex => ({ ...ex, exec_email: e.target.value }))} placeholder="exec@company.com" className="border rounded-lg px-3 py-2 outline-none text-sm" /></div>
          </div>

          <SectionTitle>Terms &amp; Conditions</SectionTitle>
          <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={extra.terms_general} onChange={e => setExtra(ex => ({ ...ex, terms_general: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" /><div><p className="text-sm font-semibold text-gray-700">General Terms &amp; Conditions</p><p className="text-xs text-gray-500">Standard terms apply to this quotation</p></div></label>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={extra.terms_tax} onChange={e => setExtra(ex => ({ ...ex, terms_tax: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" /><div><p className="text-sm font-semibold text-gray-700">Tax</p><p className="text-xs text-gray-500">Prices quoted are exclusive of Sales and Service Tax (SEZ – NIL Tax applicable)</p></div></label>
            <div className="flex flex-col gap-1"><label className="text-xs font-bold text-gray-500 uppercase">Project Period</label><input type="text" value={extra.terms_project_period} onChange={e => setExtra(ex => ({ ...ex, terms_project_period: e.target.value }))} className="border rounded-lg px-3 py-2 outline-none text-sm bg-white" /></div>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={extra.terms_validity} onChange={e => setExtra(ex => ({ ...ex, terms_validity: e.target.checked }))} className="mt-1 accent-blue-600 w-4 h-4" /><div><p className="text-sm font-semibold text-gray-700">Validity</p><p className="text-xs text-gray-500">Quote valid for 15 days from the date of quotation</p></div></label>
            <div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Separate Orders</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[{ key: "material", label: "A. Material Supply (As per actuals)" }, { key: "installation", label: "B. Installation / Services" }, { key: "usd", label: "C. Price may vary based on USD rates" }, { key: "boq", label: "D. Factory BOQ may vary" }].map(({ key, label: lbl }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={extra.terms_separate_orders?.[key] || false} onChange={e => setExtra(ex => ({ ...ex, terms_separate_orders: { ...ex.terms_separate_orders, [key]: e.target.checked } }))} className="accent-blue-600 w-4 h-4" /><span className="text-sm text-gray-700">{lbl}</span></label>
                ))}
              </div>
            </div>
            <div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Terms</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition ${extra.terms_payment === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200"}`}>
                    <input type="radio" name={`payment_${prefix}`} value={opt} checked={extra.terms_payment === opt} onChange={e => setExtra(ex => ({ ...ex, terms_payment: e.target.value }))} className="accent-blue-600" />{opt}
                  </label>
                ))}
              </div>
              {extra.terms_payment === "Custom" && <input type="text" value={extra.terms_payment_custom} onChange={e => setExtra(ex => ({ ...ex, terms_payment_custom: e.target.value }))} placeholder="Enter custom payment terms..." className="mt-2 border rounded-lg px-3 py-2 outline-none text-sm w-full bg-white" />}
            </div>
            <div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Warranty</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {WARRANTY_OPTIONS.map(opt => (
                  <label key={opt} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs transition ${extra.terms_warranty === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200"}`}>
                    <input type="radio" name={`warranty_${prefix}`} value={opt} checked={extra.terms_warranty === opt} onChange={e => setExtra(ex => ({ ...ex, terms_warranty: e.target.value }))} className="accent-blue-600" />{opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="bg-blue-600 text-white px-10 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition">Save</button>
            <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-600 px-10 py-2.5 rounded-lg hover:bg-gray-300 font-bold transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
