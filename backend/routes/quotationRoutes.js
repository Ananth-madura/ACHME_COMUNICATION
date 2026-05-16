const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

let ioInstance = null;
const getNotificationIO = () => {
  if (!ioInstance) {
    try {
      const { getIO } = require("../sockets/notificationHandler");
      ioInstance = getIO();
    } catch (e) {
      console.error("Failed to load notification IO:", e.message);
    }
  }
  return ioInstance;
};

// FROM ADDRESSES (shared table)
router.get("/from-addresses", verifyToken, (req, res) => {
  db.query("SELECT * FROM pi_from_addresses ORDER BY id ASC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});
router.post("/from-addresses", verifyToken, (req, res) => {
  const { label, address } = req.body;
  if (!label || !address) return res.status(400).json({ message: "Label and address required" });
  db.query("INSERT INTO pi_from_addresses (label, address) VALUES (?,?)", [label, address], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ id: result.insertId, label, address });
  });
});
router.delete("/from-addresses/:id", verifyToken, isAdmin, (req, res) => {
  db.query("DELETE FROM pi_from_addresses WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
});

router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  let sql = `
    SELECT q.id, q.quotation_date AS invoice_date, q.grand_total, q.reference_no,
           q.version, q.is_latest, q.parent_id,
           c.customer_name, c.mobile_number, c.email,
           COALESCE(c.location_city, q.client_city) AS location_city,
           MIN(qi.description) AS description
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
    WHERE q.is_latest = 1`;

  const params = [];
  if (role === "employee") {
    sql += " AND q.created_by = ?";
    params.push(user_id);
  }

  sql += " GROUP BY q.id ORDER BY q.id DESC";
  db.query(sql, params, (err, rows) => {
    if (err) { console.error(err); return res.status(500).json(err); }
    res.json(rows);
  });
});

// GET all OLD versions of a quotation (history — excludes the current latest)
router.get("/customer-history/:id", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  let sql = `
    SELECT q.id, q.quotation_date AS invoice_date, q.grand_total, q.reference_no,
           q.version, q.is_latest, q.parent_id,
           c.customer_name, c.mobile_number, c.email,
           COALESCE(q.client_city, c.location_city) AS location_city
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.is_latest = 0
      AND (
        q.parent_id = ?
        OR q.id = (SELECT parent_id FROM quotations WHERE id = ?)
        OR q.parent_id = (SELECT parent_id FROM quotations WHERE id = ? AND parent_id IS NOT NULL)
      )`;

  const params = [req.params.id, req.params.id, req.params.id];
  if (role === "employee") {
    sql += " AND q.created_by = ?";
    params.push(user_id);
  }

  sql += " ORDER BY q.version DESC, q.id DESC";
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    const seen = new Set();
    const unique = rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    res.json(unique);
  });
});



/* GET INVOICE */
router.get("/:id", verifyToken, (req, res) => {
  const id = req.params.id;
  const { id: user_id, role } = req.user;
  let sql = `
    SELECT 
      q.id AS quotation_id,
      q.quotation_date AS invoice_date,
      q.subtotal, q.total_tax, q.total_cgst, q.total_sgst, q.total_igst, q.total_discount, q.grand_total,
      q.reference_no, q.from_address_id, q.from_address_custom,
      COALESCE(q.from_address_custom, fa.address) AS resolved_from_address,
      q.client_company, q.client_address1, q.client_address2, q.client_city,
      q.client_state, q.client_pincode, q.client_country,
      q.tax_type, q.custom_tax, q.exec_name, q.exec_phone, q.exec_email,
      q.terms_general, q.terms_tax, q.terms_project_period, q.terms_validity,
      q.terms_separate_orders, q.terms_payment, q.terms_payment_custom, q.terms_warranty,
      q.hsn_sac_code, q.supplier_branch,
      q.bank_details_id, q.bank_company, q.bank_name, q.bank_account, q.bank_ifsc, q.bank_branch, q.custom_terms,
      c.customer_name, c.mobile_number, c.email, c.gst_number, c.location_city,
      qi.product_number, qi.description, qi.brand_model, qi.uom,
      qi.price, qi.quantity, qi.tax, qi.discount, qi.subtotal AS item_subtotal,
      qi.hsn_sac
    FROM quotations q
    JOIN customers c ON c.id = q.customer_id
    JOIN quotation_items qi ON qi.quotation_id = q.id
    LEFT JOIN pi_from_addresses fa ON fa.id = q.from_address_id
    WHERE q.id = ?
  `;

  if (role === "employee") {
    sql += " AND q.created_by = ?";
  }

  const params = role === "employee" ? [id, user_id] : [id];

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json([]);
    res.json(rows);
  });
});

/* ================= CREATE QUOTATION ================= */

const validateQuotation = (body) => {
  if (!body || typeof body !== "object") return "Invalid request body";
  const { customer, quotation, invoice, items } = body;
  const q = quotation || invoice; // support both field names
  const c = customer || {};

  if (!c.customer_name) return "Customer name is required";
  if (!c.mobile_number) return "Mobile number is required";
  if (!q || !q.quotation_date && !q.invoice_date) return "Date is required";
  if (!items || items.length === 0) return "At least one item is required";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.description) return `Item ${i + 1}: Description is required`;
    if (item.price === "" || item.price === null || item.price === undefined) return `Item ${i + 1}: Price is required`;
    if (!item.quantity || item.quantity <= 0) return `Item ${i + 1}: Quantity must be greater than 0`;
  }
  return null;
};


router.post("/create", verifyToken, (req, res) => {
  const error = validateQuotation(req.body);
  if (error) return res.status(400).json({ message: error });

  const { customer, quotation, invoice, items, extra } = req.body;
  const q = quotation || invoice; // unified form sends "invoice"
  const ex = extra || {};
  const refNo = `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const quotationDate = (q && (q.quotation_date || q.invoice_date)) || new Date().toISOString().slice(0, 10);

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Transaction error" });

    // Save to customers table
    db.query(
      `INSERT INTO customers (customer_name, mobile_number, email, gst_number, location_city) VALUES (?,?,?,?,?)`,
      [customer.customer_name, customer.mobile_number, customer.email, customer.gst_number || null, customer.location_city],
      (err, customerResult) => {
        if (err) return db.rollback(() => res.status(500).json(err));
        const customerId = customerResult.insertId;

        // Also save to clients table for cross-module reuse
        db.query(
          "SELECT id FROM clients WHERE phone = ?",
          [customer.mobile_number],
          (err, clientRows) => {
            if (!err && clientRows.length === 0) {
              db.query(
                `INSERT INTO clients (name, company_name, email, phone, gst_number, address, state, pincode) VALUES (?,?,?,?,?,?,?,?)`,
                [
                  customer.customer_name,
                  ex.client_company || customer.customer_name,
                  customer.email,
                  customer.mobile_number,
                  customer.gst_number || null,
                  ex.client_address1 || null,
                  ex.client_state || null,
                  ex.client_pincode || null
                ]
              );
            } else if (!err && clientRows.length > 0) {
              // Update existing client with latest details from proposal
              db.query(
                `UPDATE clients SET name=?, company_name=?, email=?, gst_number=?, address=?, state=?, pincode=? WHERE id=?`,
                [
                  customer.customer_name,
                  ex.client_company || customer.customer_name,
                  customer.email,
                  customer.gst_number || null,
                  ex.client_address1 || null,
                  ex.client_state || null,
                  ex.client_pincode || null,
                  clientRows[0].id
                ]
              );
            }
          }
        );

        db.query(
          `INSERT INTO quotations
           (customer_id, quotation_date, total_cgst, total_sgst, total_igst, subtotal, total_tax, total_discount, grand_total,
            reference_no, from_address_id, from_address_custom,
            client_company, client_address1, client_address2, client_city, client_state, client_pincode, client_country,
            tax_type, custom_tax, exec_name, exec_phone, exec_email,
            terms_general, terms_tax, terms_project_period, terms_validity, terms_separate_orders,
            terms_payment, terms_payment_custom, terms_warranty, hsn_sac_code, supplier_branch,
            bank_details_id, bank_company, bank_name, bank_account, bank_ifsc, bank_branch, custom_terms, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            customerId, quotationDate,
            q.total_cgst || 0, q.total_sgst || 0, q.total_igst || 0, q.subtotal || 0,
            (q.total_cgst || 0) + (q.total_sgst || 0) + (q.total_igst || 0), q.total_discount || 0, q.grand_total || 0,
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
            req.user.id
          ],
          (err, quotationResult) => {
            if (err) return db.rollback(() => res.status(500).json(err));
            const quotationId = quotationResult.insertId;
            const values = items.map((item, index) => [
              quotationId, index + 1, item.description, item.brand_model || null, item.hsn_sac || null, item.uom || "Nos",
              item.price, item.quantity, item.tax, item.discount, item.subtotal,
            ]);
            db.query(
              `INSERT INTO quotation_items (quotation_id, product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal) VALUES ?`,
              [values],
              err => {
                if (err) return db.rollback(() => res.status(500).json(err));
                db.commit(err => {
                  if (err) return db.rollback(() => res.status(500).json(err));

                  // DISABLED: Old notification system
                  /*
                  const notificationIO = getNotificationIO();
                  if (notificationIO) {
                    const time = new Date().toLocaleString();
                    notificationIO.emitNotification("proposal_created", {
                      id: quotationId,
                      referenceNo: refNo,
                      customerName: customer.customer_name,
                      clientCompany: ex.client_company || customer.customer_name,
                      grandTotal: q.grand_total || 0,
                      createdBy: ex.exec_name || "Employee",
                      createdAt: time,
                      type: "proposal"
                    }, null, true);
                  }
                  */

                  res.status(201).json({ message: "Quotation Created Successfully", quotationId, reference_no: refNo });
                });
              }
            );
          }
        );
      }
    );
  });
});

// Update — creates a NEW version instead of overwriting, preserving history
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const error = validateQuotation(req.body);
  if (error) return res.status(400).json({ message: error });

  const { id } = req.params;
  const { customer, quotation, invoice, items, extra } = req.body;
  const q = quotation || invoice;
  const ex = extra || {};
  const quotationDate = (q && (q.quotation_date || q.invoice_date)) || new Date().toISOString().slice(0, 10);

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    // 1. Update customer details
    db.query(
      `UPDATE customers SET customer_name=?, mobile_number=?, email=?, gst_number=?, location_city=?
       WHERE id = (SELECT customer_id FROM quotations WHERE id=?)`,
      [customer.customer_name, customer.mobile_number, customer.email, customer.gst_number || null, customer.location_city, id],
      err => {
        if (err) return db.rollback(() => res.status(500).json(err));

        // 2. Get current quotation to find parent_id and version
        db.query(`SELECT customer_id, parent_id, version, reference_no FROM quotations WHERE id=?`, [id], (err, rows) => {
          if (err) return db.rollback(() => res.status(500).json(err));
          if (!rows.length) return db.rollback(() => res.status(404).json({ message: "Quotation not found" }));

          const current = rows[0];
          // The root id is either parent_id (if already a revision) or id itself
          const rootId = current.parent_id || id;
          const newVersion = (current.version || 1) + 1;
          const refNo = current.reference_no || `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

          // 3. Mark all previous versions as not latest
          db.query(
            `UPDATE quotations SET is_latest=0 WHERE id=? OR parent_id=?`,
            [rootId, rootId],
            err => {
              if (err) return db.rollback(() => res.status(500).json(err));

              // 4. Insert new version row
              db.query(
                `INSERT INTO quotations
                 (customer_id, quotation_date, total_cgst, total_sgst, total_igst, subtotal, total_tax, total_discount, grand_total,
                  reference_no, from_address_id, from_address_custom,
                  client_company, client_address1, client_address2, client_city, client_state, client_pincode, client_country,
                  tax_type, custom_tax, exec_name, exec_phone, exec_email,
                  terms_general, terms_tax, terms_project_period, terms_validity, terms_separate_orders,
                  terms_payment, terms_payment_custom, terms_warranty,
                  hsn_sac_code, supplier_branch,
                  bank_details_id, bank_company, bank_name, bank_account, bank_ifsc, bank_branch, custom_terms,
                  parent_id, version, is_latest, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                  current.customer_id, quotationDate,
                  q.total_cgst || 0, q.total_sgst || 0, q.total_igst || 0, q.subtotal || 0,
                  (q.total_cgst || 0) + (q.total_sgst || 0) + (q.total_igst || 0), q.total_discount || 0, q.grand_total || 0,
                  refNo, ex.from_address_id || null, ex.from_address_custom || null,
                  ex.client_company || null, ex.client_address1 || null, ex.client_address2 || null,
                  ex.client_city || null, ex.client_state || null, ex.client_pincode || null, ex.client_country || "India",
                  ex.tax_type || "GST18", ex.custom_tax || null,
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

                  // 5. Insert items for new version
                  const values = items.map((item, index) => [
                    newId, index + 1, item.description, item.brand_model || null, item.hsn_sac || null, item.uom || "Nos",
                    item.price, item.quantity, item.tax, item.discount, item.subtotal,
                  ]);
                  db.query(
                    `INSERT INTO quotation_items (quotation_id, product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal) VALUES ?`,
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
            }
          );
        });
      }
    );
  });
});



/// DELETE QUOTATION (SAFE)
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;

  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Transaction failed" });
    }

    // Check ownership
    db.query("SELECT created_by FROM quotations WHERE id = ?", [id], (err, results) => {
      if (err) return db.rollback(() => res.status(500).json(err));
      if (results.length === 0) return db.rollback(() => res.status(404).json({ message: "Not found" }));

      if (req.user.role !== 'admin' && results[0].created_by !== req.user.id) {
        return db.rollback(() => res.status(403).json({ message: "Access denied" }));
      }

      // delete items first
      db.query(
        "DELETE FROM quotation_items WHERE quotation_id = ?",
        [id],
        err => {
          if (err) {
            console.error(err);
            return db.rollback(() =>
              res.status(500).json({ error: "Item delete failed" })
            );
          }

          // delete quotation
          db.query(
            "DELETE FROM quotations WHERE id = ?",
            [id],
            err => {
              if (err) {
                console.error(err);
                return db.rollback(() =>
                  res.status(500).json({ error: "Quotation delete failed" })
                );
              }

              db.commit(err => {
                if (err) {
                  console.error(err);
                  return db.rollback(() =>
                    res.status(500).json({ error: "Commit failed" })
                  );
                }

                res.json({ message: "Quotation deleted successfully" });
              });
            }
          );
        }
      );
    });
  });
});



const nodemailer = require("nodemailer");
const { generateInvoicePdf } = require("../backendutil/generateInvoicePdf");

// Download PDF directly
router.get("/download-pdf/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const headerSql = `SELECT q.*, c.email, c.customer_name, c.mobile_number, c.location_city, c.gst_number,
    q.quotation_date AS invoice_date, COALESCE(q.from_address_custom, fa.address) AS resolved_from_address
    FROM quotations q JOIN customers c ON q.customer_id = c.id
    LEFT JOIN pi_from_addresses fa ON fa.id = q.from_address_id WHERE q.id = ?`;
  const itemsSql = `SELECT product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal FROM quotation_items WHERE quotation_id = ? ORDER BY product_number`;
  db.query(headerSql, [id], (err, headerRows) => {
    if (err) { console.error("PDF header query error:", err); return res.status(500).json({ message: "Database error: " + err.message }); }
    if (!headerRows.length) return res.status(404).json({ message: "Quotation not found" });
    db.query(itemsSql, [id], async (err, items) => {
      if (err) { console.error("PDF items query error:", err); return res.status(500).json({ message: "Database error: " + err.message }); }
      try {
        const pdfBuffer = await generateInvoicePdf({ invoice: headerRows[0], items, type: "quotation" });
        const year = new Date(headerRows[0].invoice_date).getFullYear();
        const filename = `Quotation_QT-${year}-${String(headerRows[0].id).padStart(3, "0")}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      } catch (e) { console.error("PDF generation error:", e); res.status(500).json({ message: "PDF generation failed: " + e.message }); }
    });
  });
});

router.post("/send-email/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { to, subject, cc } = req.body;

  const headerSql = `
    SELECT q.*, c.email, c.customer_name, c.mobile_number, c.location_city,
           q.quotation_date AS invoice_date,
           COALESCE(q.from_address_custom, fa.address) AS resolved_from_address
    FROM quotations q
    JOIN customers c ON q.customer_id = c.id
    LEFT JOIN pi_from_addresses fa ON fa.id = q.from_address_id
    WHERE q.id = ?`;

  const itemsSql = `
    SELECT product_number, description, brand_model, hsn_sac, uom, price, quantity, tax, discount, subtotal
    FROM quotation_items WHERE quotation_id = ? ORDER BY product_number`;

  db.query(headerSql, [id], (err, headerRows) => {
    if (err) return res.status(500).json(err);
    if (!headerRows.length) return res.status(404).json({ message: "Quotation not found" });

    const quotation = headerRows[0];
    // invoice_date already aliased in SQL

    const recipientEmail = to || quotation.email;
    if (!recipientEmail) return res.status(400).json({ message: "No email address provided" });

    db.query(itemsSql, [id], async (err, items) => {
      if (err) return res.status(500).json(err);

      const year = new Date(quotation.quotation_date).getFullYear();
      const qtNumber = `QT-${year}-${String(quotation.id).padStart(3, "0")}`;

      try {
        // Generate PDF with exact same design as the app
        const pdfBuffer = await generateInvoicePdf({ invoice: quotation, items, type: "quotation" });

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        await transporter.sendMail({
          from: `"Achme Communication" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          cc: cc || undefined,
          subject: subject || `Quotation ${qtNumber}`,
          html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;">
            <p style="font-size:16px;color:#1e293b;">Dear Customer,</p>
            <p style="font-size:14px;color:#374151;margin-top:12px;">Please find your <strong>Quotation ${qtNumber}</strong> attached to this email.</p>
            <p style="font-size:14px;color:#374151;margin-top:8px;">Thank you for your business.</p>
            <p style="font-size:14px;color:#374151;margin-top:16px;">Regards,<br/><strong>Achme Communication</strong></p>
          </div>`,
          attachments: [
            {
              filename: `Quotation_${qtNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        res.json({ message: "Email sent successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to send email", error: err.message });
      }
    });
  });
});

module.exports = router;
