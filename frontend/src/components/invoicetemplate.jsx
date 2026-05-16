import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config/api";
import backheadImg from "../images/backhead.png";
import logoImg from "../images/logo.png";

// ─── DESIGN SYSTEM ─────────────────────────────────────────
const PALETTE = {
  primary: "#0144B1",    
  accent: "#1694CE",     
  lightBg: "#F0F7FB",    
  border: "#DDE4EE",     
  text: "#333333",
  muted: "#666666",
  white: "#FFFFFF",
  grandTotal: "#EBEBEB", 
};

const COMPANY = {
  name: "Achme Communication",
  gstin: "33AABCA1234D1Z5",
  email: "info@achmecommunication.com",
  website: "www.achmecommunication.com",
  phone: "0422-2569966, 4376555",
  address: "436H Avinashi Road Opp to SMS Hotel, Peelamedu, Coimbatore - 641004"
};

// ─── DESIGN SYSTEM ─────────────────────────────────────────

const TotalsBlock = ({ h, taxRate, fmt }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
    <table style={{ minWidth: "320px", borderCollapse: "collapse", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>
      <tbody>
        {[
          { label: "Subtotal", value: fmt(h.subtotal || 0) },
          Number(h.total_discount || 0) > 0 && { label: "Discount", value: fmt(h.total_discount) },
          Number(h.total_cgst || 0) > 0 && { label: "CGST", value: fmt(h.total_cgst) },
          Number(h.total_sgst || 0) > 0 && { label: "SGST", value: fmt(h.total_sgst) },
          Number(h.total_igst || 0) > 0 && { label: "IGST", value: fmt(h.total_igst) },
        ].filter(Boolean).map((row, i) => (
          <tr key={i}>
            <td style={{ padding: "8px 20px", color: PALETTE.muted, fontWeight: "500", textAlign: "left", width: "160px" }}>{row.label}</td>
            <td style={{ padding: "8px 20px", color: PALETTE.text, fontWeight: "700", textAlign: "right" }}>₹{row.value}</td>
          </tr>
        ))}
        {/* Grand Total */}
        <tr style={{ background: PALETTE.grandTotal }}>
          <td style={{ padding: "12px 20px", color: "#1a1a1a", fontWeight: "900", borderTop: `1px solid ${PALETTE.border}` }}>GRAND TOTAL</td>
          <td style={{ padding: "12px 20px", color: "#1a1a1a", fontWeight: "900", textAlign: "right", fontSize: "18px", borderTop: `1px solid ${PALETTE.border}` }}>₹{fmt(h.grand_total || 0)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

/* ─── WAVE BACKGROUND: Clear and visible wave design ─── */
const HeaderWaves = () => (
  <svg
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    viewBox="0 0 1000 120"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
  >
    {/* Left side - large white wave overlay */}
    <ellipse cx="150" cy="120" rx="280" ry="70" fill="rgba(255, 255, 255, 0.45)" />
    <ellipse cx="200" cy="125" rx="320" ry="80" fill="rgba(255, 255, 255, 0.35)" />
    <ellipse cx="250" cy="130" rx="360" ry="90" fill="rgba(255, 255, 255, 0.25)" />
    
    {/* Right side - clear diagonal flowing lines */}
    {[...Array(25)].map((_, i) => {
      const startX = 550 + i * 18;
      const opacity = 0.18 + (i % 4) * 0.08;
      const strokeWidth = 1.2 + (i % 3) * 0.4;
      return (
        <line
          key={i}
          x1={startX}
          y1="120"
          x2={startX + 250}
          y2="0"
          stroke="#98C0DC"
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      );
    })}
  </svg>
);

const Header = ({ config, docNumber, docDate, formatDate }) => {
  return (
    <div style={{
      backgroundImage: `url(${backheadImg})`,
      backgroundSize: "cover",
      backgroundPosition: "left 35%",
      backgroundRepeat: "no-repeat",
      padding: "40px 40px 10px 40px",
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      position: "relative",
      overflow: "visible",
      height: "148px",
      width: "100%",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
      breakInside: "avoid"
    }}>
      {/* RIGHT - Document Title and Info - Dynamic content only */}
      <div style={{ 
        textAlign: "right", 
        zIndex: 1, 
        display: "flex", 
        flexDirection: "column", 
        gap: "10px", 
        alignItems: "flex-end",
        marginTop: "-10px",
        marginRight: "-10px"
      }}>
        {/* Document Title - Dynamic with responsive font size and wrapping */}
        <div style={{
          fontSize: config.label.split(" / ")[0].length > 12 ? "28px" : "38px",
          fontWeight: "700",
          color: "#0052CC",
          fontStyle: "italic",
          lineHeight: config.label.split(" / ")[0].length > 12 ? "1.15" : "1",
          letterSpacing: "0.5px",
          fontFamily: "'Arial', 'Helvetica', sans-serif",
          maxWidth: config.label.split(" / ")[0].length > 12 ? "280px" : "450px",
          wordWrap: "break-word",
          whiteSpace: config.label.split(" / ")[0].length > 12 ? "normal" : "nowrap"
        }}>
          {config.label.split(" / ")[0]}
        </div>

        {/* Info box - Doc No and Date - Dynamic */}
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.98)",
          padding: "9px 18px",
          borderRadius: "5px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,82,204,0.12)",
          fontSize: "11.5px",
          color: "#000",
          gap: "12px",
          whiteSpace: "nowrap"
        }}>
          <span style={{ fontWeight: "700", color: "#000" }}>Doc No: <span style={{ fontWeight: "400", color: "#333" }}>{docNumber}</span></span>
          <div style={{ height: "14px", width: "1px", background: "#B0C0D0" }} />
          <span style={{ fontWeight: "700", color: "#000" }}>Date: <span style={{ fontWeight: "400", color: "#333" }}>{formatDate(docDate)}</span></span>
        </div>
      </div>
    </div>
  );
};

const AddressRow = ({ h }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "30px",
      padding: "20px 45px",
      fontFamily: "'Inter', sans-serif",
      borderBottom: `1.5px solid ${PALETTE.border}`
    }}
  >
    {/* FROM SECTION */}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "12px", fontWeight: "900", color: PALETTE.primary, marginBottom: "10px", borderBottom: `1px solid ${PALETTE.border}`, paddingBottom: "3px" }}>FROM</div>
      <div style={{ fontWeight: "700", fontSize: "17px", color: "#2c2c2c", marginBottom: "2px", letterSpacing: "0.2px" }}>{COMPANY.name}</div>
      <div style={{ fontWeight: "700", fontSize: "12px", color: "#444", marginBottom: "6px" }}>GSTIN: {COMPANY.gstin}</div>
      <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.5", marginBottom: "6px" }}>{COMPANY.address}</div>
      <div style={{ height: "1px", background: PALETTE.border, margin: "8px 0", borderStyle: "dotted" }} />
      
      <div style={{ fontSize: "12.5px", display: "grid", gap: "4px" }}>
        <div style={{ display: "flex" }}><span style={{ fontWeight: "900", color: "#1a1a1a", minWidth: "50px" }}>Ph:</span><span>{COMPANY.phone}</span></div>
        <div style={{ display: "flex" }}><span style={{ fontWeight: "900", color: "#1a1a1a", minWidth: "50px" }}>Email:</span><span>{COMPANY.email}</span></div>
        <div style={{ display: "flex" }}><span style={{ fontWeight: "900", color: "#1a1a1a", minWidth: "50px" }}>Web:</span><span>{COMPANY.website}</span></div>
      </div>


    </div>

    {/* BILLED TO SECTION */}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "12px", fontWeight: "900", color: PALETTE.primary, marginBottom: "10px", borderBottom: `1px solid ${PALETTE.border}`, paddingBottom: "3px" }}>BILLED TO</div>
      <div style={{ fontWeight: "700", fontSize: "17px", color: "#2c2c2c", marginBottom: "2px", letterSpacing: "0.2px", wordBreak: "break-word" }}>{h.customer_name}</div>
      {h.client_company && <div style={{ fontWeight: "700", fontSize: "12px", color: "#444", marginBottom: "6px", wordBreak: "break-word" }}>{h.client_company}</div>}
      <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.6", marginBottom: "6px", wordBreak: "break-word", overflowWrap: "break-word" }}>
        {[h.client_address1, h.client_address2, [h.client_city, h.client_state].filter(Boolean).join(", ")].filter(Boolean).join(", ")}
        {h.client_pincode && <span>, Pin: {h.client_pincode}</span>}
      </div>
      {h.mobile_number && (
        <div style={{ fontSize: "12.5px", display: "flex", marginBottom: "6px" }}>
          <span style={{ fontWeight: "900", color: "#1a1a1a", minWidth: "50px" }}>Ph:</span>
          <span>{h.mobile_number}</span>
        </div>
      )}
      <div style={{ height: "1px", background: PALETTE.border, margin: "8px 0", borderStyle: "dotted" }} />
      <div style={{ fontSize: "12.5px", display: "grid", gap: "4px" }}>
        {h.gst_number && (
          <div style={{ display: "flex" }}>
            <span style={{ fontWeight: "900", color: "#1a1a1a", minWidth: "50px" }}>GSTIN:</span>
            <span>{h.gst_number}</span>
          </div>
        )}
        {h.email && (
          <div style={{ display: "flex" }}>
            <span style={{ fontWeight: "900", color: "#1a1a1a", minWidth: "50px" }}>Email:</span>
            <span>{h.email}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── TABLE ────────────────────────────────────────────────
const ItemsTable = ({ rows, h, fmt }) => {
  // Get tax rate from custom_tax if available, otherwise parse from tax_type
  let taxRate = 18; // default
  if (h.custom_tax) {
    taxRate = Number(h.custom_tax);
  } else if (h.tax_type === "GST5") {
    taxRate = 5;
  } else if (h.tax_type === "GST18") {
    taxRate = 18;
  }

  return (
    <div style={{ padding: "0 45px 15px" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <thead>
          <tr style={{ background: "#F1F5F9", borderTop: `1px solid ${PALETTE.border}`, borderBottom: `1px solid ${PALETTE.border}` }}>
            {["S.NO", "DESCRIPTION", "BRAND / MODEL", rows.some(r => r.hsn_sac) && "HSN/SAC", "QTY", "UOM", "GST%", "PRICE", "TOTAL"].filter(Boolean).map((header) => (
              <th
                key={header}
                style={{
                  padding: "10px 8px",
                  textAlign: header === "PRICE" || header === "TOTAL" || header === "GST%" ? "right" : "left",
                  fontWeight: "900",
                  fontSize: "12px",
                  color: PALETTE.primary,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={{
                borderBottom: `1px solid ${PALETTE.border}44`,
                pageBreakInside: "avoid",
                breakInside: "avoid"
              }}
            >
              <td style={{ padding: "8px 8px", color: "#666" }}>{i + 1}</td>
              <td style={{ padding: "8px 8px", color: "#1a1a1a", verticalAlign: "top" }}>
                {r.description.includes(',') ? (
                  <>
                    <div style={{ fontWeight: "800", fontSize: "13px", marginBottom: "3px" }}>{r.description.split(',')[0].trim()}</div>
                    <div style={{ fontSize: "11px", color: "#555", lineHeight: "1.4" }}>{r.description.split(',').slice(1).join(',').trim()}</div>
                  </>
                ) : (
                  <div style={{ fontWeight: "800" }}>{r.description}</div>
                )}
              </td>
              <td style={{ padding: "8px 8px", color: "#444" }}>{r.brand_model || "---"}</td>
              {rows.some(row => row.hsn_sac) && <td style={{ padding: "8px 8px", color: "#444" }}>{r.hsn_sac || "---"}</td>}
              <td style={{ padding: "8px 8px", textAlign: "center" }}>{r.quantity}</td>
              <td style={{ padding: "8px 8px" }}>{r.uom || "Units"}</td>
              <td style={{ padding: "8px 8px", textAlign: "right", color: "#444" }}>{r.tax}%</td>
              <td style={{ padding: "8px 8px", textAlign: "right", color: "#444" }}>₹{fmt(r.price)}</td>
              <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: "900", color: "#1a1a1a" }}>₹{fmt(r.item_subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <TotalsBlock h={h} taxRate={taxRate} fmt={fmt} />

      {(h.terms_general || h.terms_tax || h.terms_project_period || h.terms_validity_days || h.terms_separate_orders || h.terms_payment || h.terms_payment_custom || h.terms_warranty) && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "900", color: PALETTE.primary, marginBottom: "6px", textTransform: "uppercase" }}>TERMS & CONDITIONS</div>
          <ul style={{ margin: "5px 0", paddingLeft: "15px", fontSize: "12.5px", color: "#333", lineHeight: "1.5", fontWeight: "500" }}>
            {h.terms_general === 1 && <li style={{ listStyleType: "disc" }}>General Terms & Conditions apply.</li>}
            {h.terms_tax === 1 && <li style={{ listStyleType: "disc" }}>Prices quoted are inclusive of Sales and Service Tax (SEZ – NIL Tax applicable).</li>}
            {h.terms_project_period && <li style={{ listStyleType: "disc" }}>Project Period: {h.terms_project_period}</li>}
            {h.terms_validity && <li style={{ listStyleType: "disc" }}>Quote valid for {h.terms_validity} from the date of quotation.</li>}
            {(() => {
              try {
                const so = typeof h.terms_separate_orders === 'string' ? JSON.parse(h.terms_separate_orders) : h.terms_separate_orders;
                return (
                  <>
                    {so?.material && <li style={{ listStyleType: "disc" }}>A. Material Supply (As per actuals)</li>}
                    {so?.installation && <li style={{ listStyleType: "disc" }}>B. Installation / Services</li>}
                    {so?.usd && <li style={{ listStyleType: "disc" }}>C. Price may vary based on USD rates</li>}
                    {so?.boq && <li style={{ listStyleType: "disc" }}>D. Factory BOQ may vary</li>}
                  </>
                );
              } catch (e) { return null; }
            })()}
            {h.terms_payment && <li style={{ listStyleType: "disc" }}>Payment Terms: {h.terms_payment}</li>}
            {h.terms_payment_custom && <li style={{ listStyleType: "disc" }}>Payment Terms: {h.terms_payment_custom}</li>}
            {h.terms_warranty && <li style={{ listStyleType: "disc" }}>Warranty: {h.terms_warranty}</li>}
            {h.custom_terms && <li style={{ listStyleType: "disc" }}>{h.custom_terms}</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

const Footer = ({ h }) => {
  const bank = {
    company: h.bank_company || "Achme Communication",
    bank: h.bank_name || "KOTAK MAHINDRA BANK",
    account: h.bank_account || "12345667",
    ifsc: h.bank_ifsc || "34DJFHJDH",
    branch: h.bank_branch || "Test, Coimbatore"
  };
  
  return (
  <div style={{ padding: "0 40px 20px", position: "relative", background: PALETTE.white, fontFamily: "'Inter', sans-serif" }}>
    {/* Grid for Important Notes and Bank Details */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
      {/* Important Notes */}
      <div style={{ border: `1px solid ${PALETTE.border}`, borderRadius: "8px", padding: "12px" }}>
        <div style={{ fontSize: "13px", fontWeight: "900", color: PALETTE.primary, marginBottom: "8px", textTransform: "uppercase" }}>IMPORTANT NOTES</div>
        <div style={{ fontSize: "12.5px", color: PALETTE.text, lineHeight: "1.5" }}>
          <p style={{ margin: "0 0 6px" }}><b>Materials:</b> BOQ based on discussion. Extra materials required at execution charged extra. CABLE & ACCESSORIES AS PER ACTUALS.</p>
          <p style={{ margin: "0 0 6px" }}><b>Delay:</b> Delays due to external dependencies at site — Achme Communication will not be responsible.</p>
          <p style={{ margin: "0" }}><b>NOTE:</b> Civil, Electrical & Interior Works not included.</p>
        </div>
      </div>

      {/* Bank Details */}
      <div style={{ border: `1px solid ${PALETTE.border}`, borderRadius: "8px", padding: "12px" }}>
        <div style={{ fontSize: "13px", fontWeight: "900", color: PALETTE.primary, marginBottom: "8px", textTransform: "uppercase" }}>BANK DETAILS</div>
        <div style={{ fontSize: "12.5px", color: PALETTE.text, display: "grid", gap: "4px" }}>
          <div style={{ display: "flex" }}><span style={{ width: "80px", fontWeight: "800" }}>Company</span> <span style={{ marginRight: "10px" }}>:</span> <span style={{ fontWeight: "900" }}>{bank.company}</span></div>
          <div style={{ display: "flex" }}><span style={{ width: "80px", fontWeight: "800" }}>Bank</span> <span style={{ marginRight: "10px" }}>:</span> <span style={{ fontWeight: "900" }}>{bank.bank}</span></div>
          <div style={{ display: "flex" }}><span style={{ width: "80px", fontWeight: "800" }}>Account</span> <span style={{ marginRight: "10px" }}>:</span> <span style={{ fontWeight: "900" }}>{bank.account}</span></div>
          <div style={{ display: "flex" }}><span style={{ width: "80px", fontWeight: "800" }}>IFSC</span> <span style={{ marginRight: "10px" }}>:</span> <span style={{ fontWeight: "900" }}>{bank.ifsc}</span></div>
          <div style={{ display: "flex" }}><span style={{ width: "80px", fontWeight: "800" }}>Branch</span> <span style={{ marginRight: "10px" }}>:</span> <span style={{ fontWeight: "900" }}>{bank.branch}</span></div>
        </div>
      </div>
    </div>

    {/* Branches + Signature — kept together, breaks to next page if needed */}
    <div style={{ pageBreakInside: "avoid", breakInside: "avoid", marginTop: "10px", borderTop: `1px solid ${PALETTE.border}`, paddingTop: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: "900", color: PALETTE.primary, marginBottom: "4px", textTransform: "uppercase" }}>OUR BRANCHES</div>
      <div style={{ fontSize: "12.5px", color: PALETTE.text, display: "flex", flexDirection: "column", gap: "4px", fontWeight: "500" }}>
        <span><b>Bangalore:</b> 14th Main Road, GK Layout, Electronic City Post, Bangalore – 560100 | <b>GSTIN:</b> 2635GHHJG</span>
        <span><b>Chennai:</b> 5th Floor, SCD PM Towers, Dreams Road, Thousand Lights, Chennai – 600006 | <b>GSTIN:</b> 423523GSDH</span>
      </div>
      <div style={{ marginTop: "8px", textAlign: "right", borderTop: `1px solid ${PALETTE.border}`, paddingTop: "6px" }}>
        <div style={{ fontSize: "11px", fontStyle: "italic", color: PALETTE.muted, marginBottom: "3px" }}>For Achme Communication</div>
        <div style={{ fontSize: "14px", fontWeight: "900", color: "#1a1a1a", textTransform: "uppercase" }}>
          {h.exec_name || "KRISHNA KUMAR M"} 
          <span style={{ fontSize: "12px", fontWeight: "700", marginLeft: "5px", color: PALETTE.muted }}>
            ( {h.exec_phone || "9842235515"} )
          </span>
        </div>
        {h.exec_email && <div style={{ fontSize: "10px", color: PALETTE.muted, fontWeight: "600" }}>{h.exec_email}</div>}
      </div>
    </div>

    {/* Subtle Decorative Footer Line */}
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "5px",
      background: `linear-gradient(90deg, ${PALETTE.primary}, ${PALETTE.accent}, #98C0DC)`
    }} />
  </div>
);
};

// ─── MAIN COMPONENT ────────────────────────────────────────
const Invoice = ({ quotationId, type = "quotation", pdfMode = false }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ROUTE_MAP = {
      quotation: "quotations",
      proforma: "performainvoice",
      estimation: "estimate-invoice",
      service: "service-estimation"
    };
    const route = ROUTE_MAP[type] || "quotations";
    const endpoint = `${API}/api/${route}/${quotationId}`;
    const token = localStorage.getItem("token");
    
    axios
      .get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setRows(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load ${type}`);
        setLoading(false);
      });
  }, [quotationId, type]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) : "---";

  const fmt = (val) => 
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px", background: PALETTE.lightBg }}>
        <div style={{ fontSize: "20px", fontWeight: "600", color: PALETTE.primary }}>Loading Premium Template...</div>
      </div>
    );
  }

  if (error || !rows.length) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px", color: "#e74c3c" }}>
        {error || "No document data found"}
      </div>
    );
  }

  const h = rows[0];
  const TYPE_MAP = {
    quotation: { label: "QUOTATION", prefix: "QT" },
    proforma: { label: "PROFORMA INVOICE", prefix: "PI" },
    estimation: { label: "ESTIMATION", prefix: "EI" },
    service: { label: "SERVICE ESTIMATION", prefix: "SE" },
  };
  
  const config = TYPE_MAP[type] || TYPE_MAP.quotation;
  const docId = h.invoice_id || h.quotation_id || h.id;
  const docDate = h.invoice_date || h.quotation_date || h.estimate_date;
  const docNumber = `${config.prefix}-2026-${String(docId).padStart(3, "0")}`;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: pdfMode ? "0" : "20px",
        background: pdfMode ? "#fff" : PALETTE.lightBg,
        minHeight: pdfMode ? "unset" : "100vh",
      }}
    >
      <div
        className="invoice-pdf-root"
        style={{
          width: "210mm",
          background: PALETTE.white,
          boxShadow: pdfMode ? "none" : "0 10px 40px rgba(0,0,0,0.1)",
          borderRadius: "0px",
          position: "relative",
          border: pdfMode ? "none" : `1px solid ${PALETTE.border}`,
        }}
      >
        {/* WATERMARK — fixed per page via CSS */}
        <style>{`
          @page { size: A4; margin: 0; }
          @media print {
            body { margin: 0; }
            .wm { position: fixed !important; top: 50% !important; left: 50% !important;
              transform: translate(-50%,-50%) !important; z-index: 0 !important; }
            .invoice-pdf-root { box-shadow: none !important; border: none !important; }
          }
          .wm {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%,-50%);
            z-index: 0; opacity: 0.07; pointer-events: none;
            width: 520px;
          }
        `}</style>
        <div className="wm">
          <img src={logoImg} alt="" style={{ width: "100%", objectFit: "contain" }} />
        </div>

        {/* Use table layout so header/footer repeat on every printed page */}
        <table style={{ width: "100%", borderCollapse: "collapse", position: "relative", zIndex: 1 }}>
          <thead style={{ display: "table-header-group" }}>
            <tr><td style={{ padding: 0, border: "none" }}>
              <Header config={config} docNumber={docNumber} docDate={docDate} formatDate={formatDate} />
            </td></tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: 0, border: "none" }}>
              <AddressRow h={h} />
              <ItemsTable rows={rows} h={h} fmt={fmt} />
              <Footer h={h} />
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoice;