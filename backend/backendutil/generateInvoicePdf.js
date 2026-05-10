"use strict";

const path = require("path");
const fs   = require("fs");

let BACKHEAD_B64 = "";
try { BACKHEAD_B64 = fs.readFileSync(path.resolve(__dirname, "../../frontend/src/images/backhead.png")).toString("base64"); } catch (_) {}
const BACKHEAD_SRC = BACKHEAD_B64 ? `data:image/png;base64,${BACKHEAD_B64}` : "";

let LOGO_B64 = "";
for (const p of [
  path.resolve(__dirname, "../../frontend/src/images/logo.png"),
  path.resolve(__dirname, "../../frontend/src/images/logo.jpeg"),
]) { try { LOGO_B64 = fs.readFileSync(p).toString("base64"); break; } catch (_) {} }
const LOGO_SRC = LOGO_B64 ? `data:image/png;base64,${LOGO_B64}` : "";

function esc(v) {
  if (v == null) return "";
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function generateInvoicePdf({ invoice, items, type, label, prefix }) {
  const puppeteer = require("puppeteer");

  const TYPE_MAP = {
    quotation : { label: "QUOTATION",          prefix: "QT" },
    proforma  : { label: "PROFORMA INVOICE",   prefix: "PI" },
    estimation: { label: "ESTIMATION",         prefix: "EI" },
    service   : { label: "SERVICE ESTIMATION", prefix: "SE" },
  };
  const def      = TYPE_MAP[type] || TYPE_MAP.quotation;
  const docLabel = (label || def.label).toUpperCase();
  const docPfx   = prefix || def.prefix;
  const h        = invoice;
  const isLong   = docLabel.length > 12;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" }) : "---";
  const fmtNum  = (n) => Number(n||0).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });

  const invoiceDate = h.invoice_date || h.quotation_date || h.estimate_date || new Date().toISOString();
  const docId       = h.invoice_id || h.quotation_id || h.id;
  const docNumber   = `${docPfx}-${new Date(invoiceDate).getFullYear()}-${String(docId).padStart(3,"0")}`;

  let taxRate = 18;
  if (h.custom_tax) taxRate = Number(h.custom_tax);
  else if (h.tax_type === "GST5") taxRate = 5;

  // Terms
  const terms = [];
  if (h.terms_general)        terms.push("General Terms &amp; Conditions apply.");
  if (h.terms_tax)            terms.push("Prices quoted are exclusive of Sales and Service Tax.");
  if (h.terms_project_period) terms.push(`Project Period: ${esc(h.terms_project_period)}`);
  if (h.terms_validity)       terms.push(`Quote valid for ${esc(h.terms_validity)} from date of quotation.`);
  try {
    const so = typeof h.terms_separate_orders === "string" ? JSON.parse(h.terms_separate_orders) : (h.terms_separate_orders||{});
    if (so.material)     terms.push("A. Material Supply (As per actuals)");
    if (so.installation) terms.push("B. Installation / Services");
    if (so.usd)          terms.push("C. Price may vary based on USD rates");
    if (so.boq)          terms.push("D. Factory BOQ may vary");
  } catch (_) {}
  if (h.terms_payment) { const pt = h.terms_payment === "Custom" ? h.terms_payment_custom : h.terms_payment; if (pt) terms.push(`Payment Terms: ${esc(pt)}`); }
  if (h.terms_warranty) terms.push(`Warranty: ${esc(h.terms_warranty)}`);
  if (h.custom_terms)   terms.push(esc(h.custom_terms));

  // Items
  const hasHsn = (items||[]).some(i => i.hsn_sac);
  const itemRows = (items||[]).map((item, i) => {
    const desc = item.description || "";
    const commaIdx = desc.indexOf(",");
    const productName = commaIdx > -1 ? desc.slice(0, commaIdx).trim() : desc;
    const specDetails = commaIdx > -1 ? desc.slice(commaIdx + 1).trim() : "";
    return `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:7px 6px;text-align:center;color:#555;vertical-align:top;">${i+1}</td>
      <td style="padding:7px 6px;vertical-align:top;">
        <div style="font-weight:800;color:#1a1a1a;font-size:11.5px;">${esc(productName)}</div>
        ${specDetails ? `<div style="font-size:10px;color:#555;line-height:1.4;margin-top:2px;">${esc(specDetails)}</div>` : ""}
      </td>
      <td style="padding:7px 6px;color:#444;vertical-align:top;">${esc(item.brand_model||"---")}</td>
      ${hasHsn ? `<td style="padding:7px 6px;color:#444;vertical-align:top;">${esc(item.hsn_sac||"---")}</td>` : ""}
      <td style="padding:7px 6px;text-align:center;vertical-align:top;">${esc(String(item.quantity))}</td>
      <td style="padding:7px 6px;vertical-align:top;">${esc(item.uom||"Nos")}</td>
      <td style="padding:7px 6px;text-align:right;color:#444;vertical-align:top;">${item.tax||0}%</td>
      <td style="padding:7px 6px;text-align:right;color:#444;vertical-align:top;">&#8377;${fmtNum(item.price)}</td>
      <td style="padding:7px 6px;text-align:right;font-weight:800;color:#1a1a1a;vertical-align:top;">&#8377;${fmtNum(item.subtotal||item.item_subtotal)}</td>
    </tr>`;
  }).join("");

  const clientAddr = [h.client_address1, h.client_address2, [h.client_city, h.client_state].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  const clientPin  = h.client_pincode ? `, Pin: ${h.client_pincode}` : "";

  const discRow = Number(h.total_discount||0) > 0 ? `<tr><td style="padding:5px 14px;color:#666;">Discount</td><td style="padding:5px 14px;text-align:right;font-weight:700;">&#8377;${fmtNum(h.total_discount)}</td></tr>` : "";
  const cgstRow = Number(h.total_cgst||0) > 0 ? `<tr><td style="padding:5px 14px;color:#666;">CGST (${taxRate/2}%)</td><td style="padding:5px 14px;text-align:right;font-weight:700;">&#8377;${fmtNum(h.total_cgst)}</td></tr>` : "";
  const sgstRow = Number(h.total_sgst||0) > 0 ? `<tr><td style="padding:5px 14px;color:#666;">SGST (${taxRate/2}%)</td><td style="padding:5px 14px;text-align:right;font-weight:700;">&#8377;${fmtNum(h.total_sgst)}</td></tr>` : "";
  const igstRow = Number(h.total_igst||0) > 0 ? `<tr><td style="padding:5px 14px;color:#666;">IGST (${taxRate}%)</td><td style="padding:5px 14px;text-align:right;font-weight:700;">&#8377;${fmtNum(h.total_igst)}</td></tr>` : "";

  const termsHtml = terms.length > 0 ? `
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid #DDE4EE;">
      <div style="font-size:11px;font-weight:900;color:#0144B1;margin-bottom:5px;text-transform:uppercase;">TERMS &amp; CONDITIONS</div>
      <ul style="margin:3px 0;padding-left:14px;font-size:10px;color:#333;line-height:1.5;">
        ${terms.map(t => `<li style="margin-bottom:2px;">${t}</li>`).join("")}
      </ul>
    </div>` : "";

  const bank = {
    company: h.bank_company || "Achme Communication",
    bank:    h.bank_name    || "KOTAK MAHINDRA BANK",
    account: h.bank_account || "12345667",
    ifsc:    h.bank_ifsc    || "34DJFHJDH",
    branch:  h.bank_branch  || "Test, Coimbatore",
  };
  const sigName  = esc(h.exec_name  || "KRISHNA KUMAR M");
  const sigPhone = esc(h.exec_phone || "9842235515");
  const sigEmail = h.exec_email ? `<div style="font-size:9px;color:#666;">${esc(h.exec_email)}</div>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; width: 210mm; }

  /* ── HEADER: fixed, repeats every page ── */
  #hdr {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 148px;
    z-index: 999;
  }
  #hdr img.bg {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover; object-position: left 35%;
  }
  #hdr .title-box {
    position: absolute; top: 0; right: 0; bottom: 0;
    display: flex; flex-direction: column;
    justify-content: center; align-items: flex-end;
    padding: 10px 40px; gap: 10px;
  }

  /* ── FOOTER: fixed, repeats every page ── */
  #ftr {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: #fff;
    z-index: 999;
    padding: 0 40px 10px;
    border-top: 3px solid #0144B1;
  }

  /* ── WATERMARK ── */
  #wm {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 480px; opacity: 0.06;
    z-index: 0; pointer-events: none;
  }

  /* ── BODY: padded to clear header + footer ── */
  #body {
    padding-top: 158px;
    padding-bottom: 230px;
    position: relative;
    z-index: 1;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div id="hdr">
  ${BACKHEAD_SRC ? `<img class="bg" src="${BACKHEAD_SRC}" />` : `<div style="background:#0144B1;width:100%;height:100%;"></div>`}
  <div class="title-box">
    <div style="font-size:${isLong?"22px":"34px"};font-weight:700;color:#0052CC;font-style:italic;
      line-height:${isLong?"1.15":"1"};letter-spacing:0.5px;
      max-width:${isLong?"280px":"450px"};word-wrap:break-word;white-space:${isLong?"normal":"nowrap"};">${docLabel}</div>
    <div style="display:flex;align-items:center;background:rgba(255,255,255,0.98);padding:8px 16px;
      border-radius:5px;border:1px solid rgba(0,82,204,0.15);font-size:11px;color:#000;gap:12px;white-space:nowrap;">
      <span style="font-weight:700;">Doc No: <span style="font-weight:400;color:#333;">${docNumber}</span></span>
      <div style="height:14px;width:1px;background:#B0C0D0;"></div>
      <span style="font-weight:700;">Date: <span style="font-weight:400;color:#333;">${fmtDate(invoiceDate)}</span></span>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div id="ftr">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding-top:8px;margin-bottom:6px;">
    <div style="border:1px solid #DDE4EE;border-radius:6px;padding:8px;">
      <div style="font-size:10px;font-weight:900;color:#0144B1;margin-bottom:4px;text-transform:uppercase;">IMPORTANT NOTES</div>
      <div style="font-size:9px;color:#333;line-height:1.4;">
        <p style="margin:0 0 2px;"><b>Materials:</b> BOQ based on discussion. Extra materials required at execution charged extra. CABLE &amp; ACCESSORIES AS PER ACTUALS.</p>
        <p style="margin:0 0 2px;"><b>Delay:</b> Delays due to external dependencies at site - Achme Communication will not be responsible.</p>
        <p style="margin:0;"><b>NOTE:</b> Civil, Electrical &amp; Interior Works not included.</p>
      </div>
    </div>
    <div style="border:1px solid #DDE4EE;border-radius:6px;padding:8px;">
      <div style="font-size:10px;font-weight:900;color:#0144B1;margin-bottom:4px;text-transform:uppercase;">BANK DETAILS</div>
      <div style="font-size:9px;color:#333;display:grid;gap:1px;">
        <div style="display:flex;"><span style="width:58px;font-weight:800;">Company</span><span style="margin-right:4px;">:</span><span style="font-weight:900;">${esc(bank.company)}</span></div>
        <div style="display:flex;"><span style="width:58px;font-weight:800;">Bank</span><span style="margin-right:4px;">:</span><span style="font-weight:900;">${esc(bank.bank)}</span></div>
        <div style="display:flex;"><span style="width:58px;font-weight:800;">Account</span><span style="margin-right:4px;">:</span><span style="font-weight:900;">${esc(bank.account)}</span></div>
        <div style="display:flex;"><span style="width:58px;font-weight:800;">IFSC</span><span style="margin-right:4px;">:</span><span style="font-weight:900;">${esc(bank.ifsc)}</span></div>
        <div style="display:flex;"><span style="width:58px;font-weight:800;">Branch</span><span style="margin-right:4px;">:</span><span style="font-weight:900;">${esc(bank.branch)}</span></div>
      </div>
    </div>
  </div>
  <div style="border-top:1px solid #DDE4EE;padding-top:5px;">
    <div style="font-size:10px;font-weight:900;color:#0144B1;margin-bottom:2px;text-transform:uppercase;">OUR BRANCHES</div>
    <div style="font-size:9px;color:#333;display:flex;flex-direction:column;gap:1px;font-weight:500;">
      <span><b>Bangalore:</b> 14th Main Road, GK Layout, Electronic City Post, Bangalore - 560100 | <b>GSTIN:</b> 2635GHHJG</span>
      <span><b>Chennai:</b> 5th Floor, SCD PM Towers, Dreams Road, Thousand Lights, Chennai - 600006 | <b>GSTIN:</b> 423523GSDH</span>
    </div>
    <div style="margin-top:4px;text-align:right;border-top:1px solid #DDE4EE;padding-top:3px;">
      <div style="font-size:8px;font-style:italic;color:#666;margin-bottom:1px;">For Achme Communication</div>
      <div style="font-size:11px;font-weight:900;color:#1a1a1a;text-transform:uppercase;">${sigName} <span style="font-size:9px;font-weight:700;color:#666;">( ${sigPhone} )</span></div>
      ${sigEmail}
    </div>
  </div>
</div>

<!-- WATERMARK -->
${LOGO_SRC ? `<div id="wm"><img src="${LOGO_SRC}" style="width:100%;" /></div>` : ""}

<!-- BODY CONTENT -->
<div id="body">

  <!-- ADDRESS -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:25px;padding:12px 40px;border-bottom:1.5px solid #DDE4EE;">
    <div style="min-width:0;">
      <div style="font-size:11px;font-weight:900;color:#0144B1;margin-bottom:8px;border-bottom:1px solid #DDE4EE;padding-bottom:3px;">FROM</div>
      <div style="font-weight:700;font-size:15px;color:#2c2c2c;margin-bottom:2px;">Achme Communication</div>
      <div style="font-weight:700;font-size:11px;color:#444;margin-bottom:5px;">GSTIN: 33AABCA1234D1Z5</div>
      <div style="font-size:11px;color:#333;line-height:1.5;margin-bottom:5px;">${esc(h.resolved_from_address||h.from_address_custom||"436H Avinashi Road Opp to SMS Hotel, Peelamedu, Coimbatore - 641004")}</div>
      <div style="height:1px;border-top:1px dotted #DDE4EE;margin:5px 0;"></div>
      <div style="font-size:11px;display:grid;gap:2px;">
        <div style="display:flex;"><span style="font-weight:900;color:#1a1a1a;min-width:46px;">Ph:</span><span>0422-2569966, 4376555</span></div>
        <div style="display:flex;"><span style="font-weight:900;color:#1a1a1a;min-width:46px;">Email:</span><span>info@achmecommunication.com</span></div>
        <div style="display:flex;"><span style="font-weight:900;color:#1a1a1a;min-width:46px;">Web:</span><span>www.achmecommunication.com</span></div>
      </div>
    </div>
    <div style="min-width:0;">
      <div style="font-size:11px;font-weight:900;color:#0144B1;margin-bottom:8px;border-bottom:1px solid #DDE4EE;padding-bottom:3px;">BILLED TO</div>
      <div style="font-weight:700;font-size:15px;color:#2c2c2c;margin-bottom:2px;word-break:break-word;">${esc(h.customer_name)}</div>
      ${h.client_company ? `<div style="font-weight:700;font-size:11px;color:#444;margin-bottom:5px;word-break:break-word;">${esc(h.client_company)}</div>` : ""}
      <div style="font-size:11px;color:#333;line-height:1.5;margin-bottom:5px;word-break:break-word;">${esc(clientAddr)}${esc(clientPin)}</div>
      ${h.mobile_number ? `<div style="font-size:11px;display:flex;margin-bottom:4px;"><span style="font-weight:900;color:#1a1a1a;min-width:46px;">Ph:</span><span>${esc(h.mobile_number)}</span></div>` : ""}
      <div style="height:1px;border-top:1px dotted #DDE4EE;margin:5px 0;"></div>
      ${h.gst_number ? `<div style="font-size:11px;display:flex;"><span style="font-weight:900;color:#1a1a1a;min-width:46px;">GSTIN:</span><span>${esc(h.gst_number)}</span></div>` : ""}
      ${h.email ? `<div style="font-size:11px;display:flex;"><span style="font-weight:900;color:#1a1a1a;min-width:46px;">Email:</span><span>${esc(h.email)}</span></div>` : ""}
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div style="padding:0 40px 10px;">
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
      <thead>
        <tr style="background:#F1F5F9;border-top:1px solid #DDE4EE;border-bottom:1px solid #DDE4EE;">
          <th style="padding:8px 6px;text-align:center;font-weight:900;font-size:10px;color:#0144B1;width:30px;">S.NO</th>
          <th style="padding:8px 6px;text-align:left;font-weight:900;font-size:10px;color:#0144B1;">DESCRIPTION</th>
          <th style="padding:8px 6px;text-align:left;font-weight:900;font-size:10px;color:#0144B1;">BRAND/MODEL</th>
          ${hasHsn ? `<th style="padding:8px 6px;text-align:left;font-weight:900;font-size:10px;color:#0144B1;">HSN/SAC</th>` : ""}
          <th style="padding:8px 6px;text-align:center;font-weight:900;font-size:10px;color:#0144B1;">QTY</th>
          <th style="padding:8px 6px;font-weight:900;font-size:10px;color:#0144B1;">UOM</th>
          <th style="padding:8px 6px;text-align:right;font-weight:900;font-size:10px;color:#0144B1;">GST%</th>
          <th style="padding:8px 6px;text-align:right;font-weight:900;font-size:10px;color:#0144B1;">PRICE</th>
          <th style="padding:8px 6px;text-align:right;font-weight:900;font-size:10px;color:#0144B1;">TOTAL</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:8px;">
      <table style="min-width:260px;border-collapse:collapse;font-size:12px;">
        <tbody>
          <tr><td style="padding:5px 14px;color:#666;">Subtotal</td><td style="padding:5px 14px;text-align:right;font-weight:700;">&#8377;${fmtNum(h.subtotal)}</td></tr>
          ${discRow}${cgstRow}${sgstRow}${igstRow}
          <tr style="background:#EBEBEB;">
            <td style="padding:10px 14px;color:#1a1a1a;font-weight:900;border-top:1px solid #DDE4EE;font-size:13px;">GRAND TOTAL</td>
            <td style="padding:10px 14px;text-align:right;font-weight:900;font-size:16px;border-top:1px solid #DDE4EE;">&#8377;${fmtNum(h.grand_total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${termsHtml}
  </div>

</div><!-- /body -->
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(i =>
        i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener("load", r); i.addEventListener("error", r); })
      ));
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateInvoicePdf };
