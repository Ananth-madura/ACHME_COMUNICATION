const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

/* CREATE CONTRACT - Full form with all fields */
router.post("/new", verifyToken, (req, res) => {
  const {
    client_company,
    contract_title,
    start_date,
    end_date,
    amount_value,
    service_type,
    mobile_number,
    location_city,
    email,
    quotation_id
  } = req.body;

  if (!client_company || !contract_title || !amount_value || !service_type) {
    return res.status(400).json({ message: "Client company, contract title, amount, and service type are required" });
  }

  const sql = `
    INSERT INTO contracts
    (client_company, contract_title, start_date, end_date, amount_value, contract_type, mobile_number, location_city, quotation_id, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `;

  db.query(
    sql,
    [
      client_company,
      contract_title,
      start_date || new Date().toISOString().slice(0, 10),
      end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      amount_value,
      service_type,
      mobile_number || null,
      location_city || null,
      quotation_id || null,
      req.user.id
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Insert failed: " + err.message });
      }

      // DISABLED: Old notification system
      /*
      const notificationIO = getNotificationIO();
      if (notificationIO) {
        const time = new Date().toLocaleString();
        notificationIO.emitNotification("contract_created", {
          id: result.insertId,
          clientName: client_company,
          contractTitle: contract_title,
          amountValue: amount_value,
          serviceType: service_type,
          createdAt: time,
          type: "contract"
        }, null, true);
      }
      */

      res.json({ success: true, id: result.insertId });
    }
  );
});

/* GET CONTRACTS BY SERVICE TYPE */
router.get("/by-type/:type", verifyToken, (req, res) => {
  const { type } = req.params;
  const { id: user_id, role } = req.user;
  let sql = "SELECT * FROM contracts WHERE 1=1";
  const params = [];

  if (type && type !== "None") {
    sql += " AND contract_type = ?";
    params.push(type);
  }

  if (role === "employee") {
    sql += " AND created_by = ?";
    params.push(user_id);
  }

  sql += " ORDER BY id DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* FETCH */
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  let sql = "SELECT * FROM contracts";
  const params = [];

  if (role === "employee") {
    sql += " WHERE created_by = ?";
    params.push(user_id);
  }

  sql += " ORDER BY id ASC";
  
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* UPDATE */
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const {
    client_company,
    template_names,
    contract_title,
    start_date,
    end_date,
    amount_value,
    category,
    contract_type,
    quotation_id,
  } = req.body;

  db.query(
    `UPDATE contracts SET
      client_company=?,
      template_names=?,
      contract_title=?,
      start_date=?,
      end_date=?,
      amount_value=?,
      category=?,
      contract_type=?,
      quotation_id=?
     WHERE id=? AND (created_by=? OR 'admin'=?)`,
    [client_company, template_names, contract_title, start_date, end_date, amount_value, category, contract_type || "Service", quotation_id, id, req.user.id, req.user.role],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Updated" });
    }
  );
});

/* DELETE */
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  db.query("DELETE FROM contracts WHERE id=? AND (created_by=? OR 'admin'=?)", [req.params.id, req.user.id, req.user.role], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
});

/* GET ALL CONTRACTS WITH USAGE SUMMARY */
router.get("/with-usage", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  let sql = `
    SELECT
      c.*,
      COALESCE(SUM(s.total_expenses), 0) as used_total,
      COUNT(s.id) as service_count
    FROM contracts c
    LEFT JOIN amc_alc_services s ON c.id = s.contract_id`;
  
  const params = [];
  if (role === "employee") {
    sql += " WHERE c.created_by = ?";
    params.push(user_id);
  }

  sql += ` GROUP BY c.id ORDER BY c.id DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const contracts = rows.map(c => ({
      ...c,
      remaining: parseFloat(c.amount_value) - parseFloat(c.used_total || 0)
    }));
    res.json(contracts);
  });
});

/* GET CONTRACT WITH USAGE SUMMARY */
router.get("/usage/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { id: user_id, role } = req.user;

  let sql = `
    SELECT
      c.*,
      COALESCE(SUM(s.petrol_charges), 0) as used_petrol,
      COALESCE(SUM(s.spare_parts_price), 0) as used_spare_parts,
      COALESCE(SUM(s.labour_charges), 0) as used_labour,
      COALESCE(SUM(s.total_expenses), 0) as used_total,
      COUNT(s.id) as service_count
    FROM contracts c
    LEFT JOIN amc_alc_services s ON c.id = s.contract_id
    WHERE c.id = ?`;
  
  const params = [id];
  if (role === "employee") {
    sql += " AND c.created_by = ?";
    params.push(user_id);
  }

  sql += " GROUP BY c.id";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Contract not found" });
    const contract = rows[0];
    contract.remaining = parseFloat(contract.amount_value) - parseFloat(contract.used_total);
    res.json(contract);
  });
});

module.exports = router;
