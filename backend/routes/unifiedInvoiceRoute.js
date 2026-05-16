/**
 * Unified Invoice Route Factory
 * Used by: Estimate Invoice (EI), Service Estimation (SE), Quotation (QT)
 * Config: { table, itemsTable, prefix, dateField }
 */
const express = require("express");
const db = require("../config/database");
const nodemailer = require("nodemailer");
const { generateInvoicePdf } = require("../backendutil/generateInvoicePdf");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

function createUnifiedRouter({ table, itemsTable, prefix, dateField, label }) {
  const router = express.Router();

  // ── FROM ADDRESSES (shared via pi_from_addresses) ──────────────────────────
  router.get("/from-addresses", verifyToken, (req, res) => {
    db.query("SELECT * FROM pi_from_addresses ORDER BY id ASC", (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });
  router.post("/from-addresses", verifyToken, (req, res) => {
    const { label: lbl, address } = req.body;
    if (!lbl || !address) return res.status(400).json({ message: "Label and address required" });
    db.query("INSERT INTO pi_from_addresses (label, address) VALUES (?,?)", [lbl, address], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, label: lbl, address });
    });
  });
  router.delete("/from-addresses/:id", verifyToken, isAdmin, (req, res) => {
    db.query("DELETE FROM pi_from_addresses WHERE id=?", [req.params.id], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Deleted" });
    });
  });

  // ── GET ALL ────────────────────────────────────────────────────────────────
  router.get("/", verifyToken, (req, res) => {
    const { id: user_id, role } = req.user;
    const sql = `
      SELECT t.id, t.${dateField}, t.grand_total, t.reference_no,
             c.customer_name, c.mobile_number, c.email,
             COALESCE(t.client_city, c.location_city) AS location_city,
             t.version, t.parent_id,
             MIN(i.description) AS description
      FROM ${table} t
      JOIN customers c ON c.id = t.customer_id
      LEFT JOIN ${itemsTable} i ON i.invoice_id = t.id
      WHERE t.is_latest = 1
      ${role === 'employee' ? 'AND t.created_by = ?' : ''}
      GROUP BY t.id ORDER BY t.id DESC`;
    const params = role === 'employee' ? [user_id] : [];
    db.query(sql, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────
  router.get("/:id", verifyToken, (req, res) => {
    const sql = `
      SELECT t.id AS invoice_id, t.${dateField} AS invoice_date,
             t.subtotal, t.total_tax, t.total_cgst, t.total_sgst, t.total_igst, t.total_discount, t.grand_total,
             t.reference_no, t.from_address_id, t.from_address_custom,
             COALESCE(t.from_address_custom, fa.address) AS resolved_from_address,
             t.client_company, t.client_address1, t.client_address2, t.client_city,
             t.client_state, t.client_pincode, t.client_country,
             t.tax_type, t.custom_tax,
             t.exec_name, t.exec_phone, t.exec_email,
             t.terms_general, t.terms_tax, t.terms_project_period, t.terms_validity,
             t.terms_separate_orders, t.terms_payment, t.terms_payment_custom, t.terms_warranty,
             t.hsn_sac_code, t.supplier_branch,
             t.bank_details_id, t.bank_company, t.bank_name, t.bank_account, t.bank_ifsc, t.bank_branch, t.custom_terms,
             c.customer_name, c.mobile_number, c.email, c.gst_number, c.location_city,
             i.product_number, i.description, i.brand_model, i.uom,
             i.price, i.quantity, i.tax, i.discount, i.subtotal AS item_subtotal,
             i.hsn_sac
      FROM ${table} t
      JOIN customers c ON c.id = t.customer_id
      JOIN ${itemsTable} i ON i.invoice_id = t.id
      LEFT JOIN pi_from_addresses fa ON fa.id = t.from_address_id
      WHERE t.id = ?`;
    db.query(sql, [req.params.id], (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows.length) return res.status(404).json([]);
      res.json(rows);
    });
  });

  // ── CREATE ─────────────────────────────────────────────────────────────────
  router.post("/create", verifyToken, (req, res) => {
    const { customer, invoice, items, extra } = req.body;
    if (!customer?.customer_name) return res.status(400).json({ message: "Customer name required" });
    if (!invoice?.invoice_date) return res.status(400).json({ message: "Date required" });
    if (!items?.length) return res.status(400).json({ message: "At least one item required" });

    const refNo = `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(1000+Math.random()*9000)}`;
    const ex = extra || {};

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ message: "Transaction error" });

      db.query(
        `INSERT INTO customers (customer_name, mobile_number, email, gst_number, location_city) VALUES (?,?,?,?,?)`,
        [customer.customer_name, customer.mobile_number, customer.email, customer.gst_number || null, customer.location_city],
        (err, cRes) => {
          if (err) return db.rollback(() => res.status(500).json(err));
          const customerId = cRes.insertId;

          db.query(
            `INSERT INTO ${table}
             (customer_id, ${dateField}, total_cgst, total_sgst, total_igst, subtotal, total_tax, total_discount, grand_total,
              reference_no, from_address_id, from_address_custom,
              client_company, client_address1, client_address2, client_city, client_state, client_pincode, client_country,
              tax_type, custom_tax, exec_name, exec_phone, exec_email,
              terms_general, terms_tax, terms_project_period, terms_validity, terms_separate_orders,
              terms_payment, terms_payment_custom, terms_warranty, hsn_sac_code, supplier_branch,
              bank_details_id, bank_company, bank_name, bank_account, bank_ifsc, bank_branch, custom_terms, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              customerId, invoice.invoice_date,
              invoice.total_cgst || 0, invoice.total_sgst || 0, invoice.total_igst || 0, invoice.subtotal || 0,
              (invoice.total_cgst || 0) + (invoice.total_sgst || 0) + (invoice.total_igst || 0), invoice.total_discount || 0, invoice.grand_total || 0,
              refNo, (ex.from_address_id === "" || !ex.from_address_id) ? null : ex.from_address_id, ex.from_address_custom || null,
              ex.client_company || null, ex.client_address1 || null, ex.client_address2 || null,
              ex.client_city || null, ex.client_state || null, ex.client_pincode || null, ex.client_country || "India",
              ex.tax_type || "GST18", (ex.custom_tax === "" || !ex.custom_tax) ? null : ex.custom_tax,
              ex.exec_name || null, ex.exec_phone || null, ex.exec_email || null,
              ex.terms_general ? 1 : 0, ex.terms_tax ? 1 : 0, ex.terms_project_period || null,
              ex.terms_validity || ex.terms_validity_days || null, ex.terms_separate_orders ? JSON.stringify(ex.terms_separate_orders) : null,
              ex.terms_payment || null, ex.terms_payment_custom || null, ex.terms_warranty || null,
              ex.hsn_sac_code || null, ex.supplier_branch || null,
              ex.bank_details_id || null, ex.bank_company || null, ex.bank_name || null, ex.bank_account || null, ex.bank_ifsc || null, ex.bank_branch || null, ex.custom_terms || null,
              req.user.id,
            ],
            (err, iRes) => {
              if (err) return db.rollback(() => res.status(500).json(err));
              const invoiceId = iRes.insertId;
              const values = items.map((item, idx) => [
                invoiceId, idx + 1, item.description, item.brand_model || null, item.hsn_sac || null, item.uom || "Nos",
                item.price, item.quantity, item.tax, item.discount, item.subtotal
              ]);
              db.query(
                `INSERT INTO ${itemsTable} (invoice_id, product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal) VALUES ?`,
                [values],
                err => {
                  if (err) return db.rollback(() => res.status(500).json(err));
                  db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json(err));
                    res.status(201).json({ message: "Created", invoiceId, reference_no: refNo });
                  });
                }
              );
            }
          );
        }
      );
    });
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  // ── VERSION HISTORY ────────────────────────────────────────────────────────
  router.get("/version-history/:id", verifyToken, (req, res) => {
    const sql = `
      SELECT t.id, t.${dateField} AS invoice_date, t.grand_total, t.version, t.is_latest, t.parent_id,
             c.customer_name, c.mobile_number, c.email,
             COALESCE(t.client_city, c.location_city) AS location_city
      FROM ${table} t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.is_latest = 0
        AND (t.parent_id = ? OR t.id = (SELECT parent_id FROM ${table} WHERE id = ?)
             OR t.parent_id = (SELECT parent_id FROM ${table} WHERE id = ? AND parent_id IS NOT NULL))
      ORDER BY t.version DESC, t.id DESC`;
    db.query(sql, [req.params.id, req.params.id, req.params.id], (err, rows) => {
      if (err) return res.status(500).json(err);
      const seen = new Set();
      res.json(rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }));
    });
  });

  // ── UPDATE — creates new version ───────────────────────────────────────────
  router.put("/:id", verifyToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { customer, invoice, items, extra } = req.body;
    const ex = extra || {};

    db.beginTransaction(err => {
      if (err) return res.status(500).json(err);

      db.query(
        `UPDATE customers SET customer_name=?, mobile_number=?, email=?, gst_number=?, location_city=?
         WHERE id = (SELECT customer_id FROM ${table} WHERE id=?)`,
        [customer.customer_name, customer.mobile_number, customer.email, customer.gst_number || null, customer.location_city, id],
        err => {
          if (err) return db.rollback(() => res.status(500).json(err));

          db.query(`SELECT customer_id, parent_id, version, reference_no FROM ${table} WHERE id=?`, [id], (err, rows) => {
            if (err || !rows.length) return db.rollback(() => res.status(500).json(err || { message: "Not found" }));

            const current = rows[0];
            const rootId = current.parent_id || id;
            const newVersion = (current.version || 1) + 1;

            db.query(`UPDATE ${table} SET is_latest=0 WHERE id=? OR parent_id=?`, [rootId, rootId], err => {
              if (err) return db.rollback(() => res.status(500).json(err));

              db.query(
                `INSERT INTO ${table}
                 (customer_id, ${dateField}, total_cgst, total_sgst, total_igst, subtotal, total_tax, total_discount, grand_total,
                  reference_no, from_address_id, from_address_custom,
                  client_company, client_address1, client_address2, client_city, client_state, client_pincode, client_country,
                  tax_type, custom_tax, exec_name, exec_phone, exec_email,
                  terms_general, terms_tax, terms_project_period, terms_validity, terms_separate_orders,
                  terms_payment, terms_payment_custom, terms_warranty,
                  hsn_sac_code, supplier_branch, bank_details_id, bank_company, bank_name, bank_account, bank_ifsc, bank_branch, custom_terms,
                  parent_id, version, is_latest, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                  current.customer_id, invoice.invoice_date,
                  invoice.total_cgst || 0, invoice.total_sgst || 0, invoice.total_igst || 0, invoice.subtotal || 0,
                  (invoice.total_cgst || 0) + (invoice.total_sgst || 0) + (invoice.total_igst || 0),
                  invoice.total_discount || 0, invoice.grand_total || 0,
                  current.reference_no,
                  (ex.from_address_id === "" || !ex.from_address_id) ? null : ex.from_address_id, ex.from_address_custom || null,
                  ex.client_company || null, ex.client_address1 || null, ex.client_address2 || null,
                  ex.client_city || null, ex.client_state || null, ex.client_pincode || null, ex.client_country || "India",
                  ex.tax_type || "GST18", (ex.custom_tax === "" || !ex.custom_tax) ? null : ex.custom_tax,
                  ex.exec_name || null, ex.exec_phone || null, ex.exec_email || null,
                  ex.terms_general ? 1 : 0, ex.terms_tax ? 1 : 0, ex.terms_project_period || null,
                  ex.terms_validity || null, ex.terms_separate_orders ? JSON.stringify(ex.terms_separate_orders) : null,
                  ex.terms_payment || null, ex.terms_payment_custom || null, ex.terms_warranty || null,
                  ex.hsn_sac_code || null, ex.supplier_branch || null,
                  ex.bank_details_id || null, ex.bank_company || null, ex.bank_name || null, ex.bank_account || null, ex.bank_ifsc || null, ex.bank_branch || null, ex.custom_terms || null,
                  rootId, newVersion, 1, req.user.id
                ],
                (err, result) => {
                  if (err) return db.rollback(() => res.status(500).json(err));
                  const newId = result.insertId;

                  const values = items.map((item, idx) => [
                    newId, idx + 1, item.description, item.brand_model || null, item.hsn_sac || null, item.uom || "Nos",
                    item.price, item.quantity, item.tax, item.discount, item.subtotal
                  ]);
                  db.query(
                    `INSERT INTO ${itemsTable} (invoice_id, product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal) VALUES ?`,
                    [values],
                    err => {
                      if (err) return db.rollback(() => res.status(500).json(err));
                      db.commit(err => {
                        if (err) return db.rollback(() => res.status(500).json(err));
                        res.json({ message: "New version saved", newId, version: newVersion });
                      });
                    }
                  );
                }
              );
            });
          });
        }
      );
    });
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────
  router.delete("/:id", verifyToken, isAdmin, (req, res) => {
    db.beginTransaction(err => {
      if (err) return res.status(500).json(err);
      db.query(`DELETE FROM ${itemsTable} WHERE invoice_id=?`, [req.params.id], err => {
        if (err) return db.rollback(() => res.status(500).json(err));
        db.query(`DELETE FROM ${table} WHERE id=?`, [req.params.id], err => {
          if (err) return db.rollback(() => res.status(500).json(err));
          db.commit(err => {
            if (err) return db.rollback(() => res.status(500).json(err));
            res.json({ message: "Deleted" });
          });
        });
      });
    });
  });

  // ── SEND EMAIL ─────────────────────────────────────────────────────────────

  // ── DOWNLOAD PDF ───────────────────────────────────────────────────────────
  router.get("/download-pdf/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const headerSql = `SELECT t.*, c.email, c.customer_name, c.mobile_number, c.location_city, c.gst_number,
      t.${dateField} AS invoice_date, COALESCE(t.from_address_custom, fa.address) AS resolved_from_address
      FROM ${table} t JOIN customers c ON t.customer_id = c.id
      LEFT JOIN pi_from_addresses fa ON fa.id = t.from_address_id WHERE t.id = ?`;
    const itemsSql = `SELECT product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal FROM ${itemsTable} WHERE invoice_id = ? ORDER BY product_number`;
    const typeMap = { QT: "quotation", PI: "proforma", EI: "estimation", SE: "service" };
    const docType = typeMap[prefix] || "estimation";
    db.query(headerSql, [id], (err, headerRows) => {
      if (err) { console.error(`${prefix} PDF header error:`, err); return res.status(500).json({ message: "Database error: " + err.message }); }
      if (!headerRows.length) return res.status(404).json({ message: `${label} not found` });
      db.query(itemsSql, [id], async (err, items) => {
        if (err) { console.error(`${prefix} PDF items error:`, err); return res.status(500).json({ message: "Database error: " + err.message }); }
        try {
          const pdfBuffer = await generateInvoicePdf({ invoice: headerRows[0], items, type: docType });
          const year = new Date(headerRows[0].invoice_date).getFullYear();
          const filename = `${label.replace(/ /g,"_")}_${prefix}-${year}-${String(headerRows[0].id).padStart(3,"0")}.pdf`;
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
          res.send(pdfBuffer);
        } catch (e) { console.error(`${prefix} PDF generation error:`, e); res.status(500).json({ message: "PDF generation failed: " + e.message }); }
      });
    });
  });
  router.post("/send-email/:id", verifyToken, (req, res) => {
    const { id } = req.params;
    const { to, subject, cc } = req.body;
    const headerSql = `
      SELECT t.*, c.email, c.customer_name, c.mobile_number, c.location_city,
             t.${dateField} AS invoice_date,
             COALESCE(t.from_address_custom, fa.address) AS resolved_from_address
      FROM ${table} t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN pi_from_addresses fa ON fa.id = t.from_address_id
      WHERE t.id = ?`;
    const itemsSql = `SELECT product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal FROM ${itemsTable} WHERE invoice_id = ? ORDER BY product_number`;

    db.query(headerSql, [id], (err, headerRows) => {
      if (err) return res.status(500).json(err);
      if (!headerRows.length) return res.status(404).json({ message: "Not found" });
      const inv = headerRows[0];
      const recipientEmail = to || inv.email;
      if (!recipientEmail) return res.status(400).json({ message: "No email" });

      db.query(itemsSql, [id], async (err, items) => {
        if (err) return res.status(500).json(err);
        try {
          const year = new Date(inv.invoice_date).getFullYear();
          const docNumber = `${prefix}-${year}-${String(inv.id).padStart(3, "0")}`;
          // Map prefix to correct type for PDF generator
          const typeMap = { QT: "quotation", PI: "performa", EI: "estimation", SE: "service" };
          const docType = typeMap[prefix] || "performa";
          const pdfBuffer = await generateInvoicePdf({ invoice: inv, items, type: docType, label: label.toUpperCase(), prefix });
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          });
          await transporter.sendMail({
            from: `"Achme Communication" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            cc: cc || undefined,
            subject: subject || `${label} ${docNumber}`,
            html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;">
              <p>Dear Customer,</p>
              <p>Please find your <strong>${label} ${docNumber}</strong> attached.</p>
              <p>Thank you for your business.</p>
              <p>Regards,<br/><strong>Achme Communication</strong></p>
            </div>`,
            attachments: [{ filename: `${label.replace(/ /g,"_")}_${docNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
          });
          res.json({ message: "Email sent" });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: "Failed to send email", error: error.message });
        }
      });
    });
  });

  return router;
}

module.exports = createUnifiedRouter;
