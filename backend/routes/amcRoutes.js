const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middleware/authMiddleware");

/* ================= AMC/ALC SERVICE MANAGEMENT ================= */

/* CREATE AMC/ALC SERVICE */
router.post("/amc-alc", verifyToken, (req, res) => {
  const {
    contract_id,
    service_type, // 'AMC' or 'ALC'
    customer_name,
    mobile_number,
    location_city,
    service_date,
    service_person,
    description,
    petrol_charges,
    spare_parts_price,
    total_expenses,
    status
  } = req.body;

  if (!contract_id || !service_type || !service_date) {
    return res.status(400).json({ error: "Contract ID, service type, and date are required" });
  }

  const {
    labour_charges
  } = req.body;

  const { start_time, end_time, km, technician, sales_person, remarks } = req.body;

  const sql = `
    INSERT INTO amc_alc_services
    (contract_id, service_type, customer_name, mobile_number, location_city, service_date, start_time, end_time, km, technician, sales_person, service_person, description, remarks, petrol_charges, spare_parts_price, labour_charges, total_expenses, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [contract_id, service_type, customer_name, mobile_number, location_city, service_date, start_time || null, end_time || null, km || null, technician || null, sales_person || null, service_person, description, remarks || null, petrol_charges || 0, spare_parts_price || 0, labour_charges || 0, total_expenses || 0, status || "Completed"],
    (err, result) => {
      if (err) {
        console.error("AMC/ALC service insert error:", err);
        return res.status(500).json({ error: "Failed to create service record" });
      }

      // Log activity
      db.query(
        "INSERT INTO service_activity (service_id, activity_type, description) VALUES (?, ?, ?)",
        [result.insertId, "Service Created", `${service_type} service completed for ${customer_name}`]
      );

      res.json({ success: true, id: result.insertId });
    }
  );
});

/* GET AMC/ALC SERVICES FOR CONTRACT */
router.get("/amc-alc/:contract_id", verifyToken, (req, res) => {
  const { contract_id } = req.params;

  db.query(
    "SELECT * FROM amc_alc_services WHERE contract_id = ? ORDER BY service_date DESC",
    [contract_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* GET ALL AMC/ALC SERVICES */
router.get("/amc-alc", verifyToken, (req, res) => {
  const { service_type, status } = req.query;

  let sql = "SELECT s.*, c.contract_title, c.client_company FROM amc_alc_services s JOIN contracts c ON s.contract_id = c.id";
  const params = [];

  if (service_type) {
    sql += " WHERE s.service_type = ?";
    params.push(service_type);
  }

  if (status) {
    sql += service_type ? " AND s.status = ?" : " WHERE s.status = ?";
    params.push(status);
  }

  sql += " ORDER BY s.service_date DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* UPDATE AMC/ALC SERVICE */
router.put("/amc-alc/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const {
    service_type,
    customer_name,
    mobile_number,
    location_city,
    service_date,
    start_time,
    end_time,
    km,
    technician,
    sales_person,
    service_person,
    description,
    remarks,
    petrol_charges,
    spare_parts_price,
    labour_charges,
    total_expenses,
    status
  } = req.body;

  db.query(
    `UPDATE amc_alc_services SET
      service_type = ?,
      customer_name = ?,
      mobile_number = ?,
      location_city = ?,
      service_date = ?,
      start_time = ?,
      end_time = ?,
      km = ?,
      technician = ?,
      sales_person = ?,
      service_person = ?,
      description = ?,
      remarks = ?,
      petrol_charges = ?,
      spare_parts_price = ?,
      labour_charges = ?,
      total_expenses = ?,
      status = ?
     WHERE id = ?`,
    [service_type, customer_name, mobile_number, location_city, service_date, start_time || null, end_time || null, km || null, technician || null, sales_person || null, service_person, description, remarks || null, petrol_charges || 0, spare_parts_price || 0, labour_charges || 0, total_expenses || 0, status, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Log activity
      db.query(
        "INSERT INTO service_activity (service_id, activity_type, description) VALUES (?, ?, ?)",
        [id, "Service Updated", `Service updated: ${description}`]
      );

      res.json({ message: "Service updated" });
    }
  );
});

/* DELETE AMC/ALC SERVICE */
router.delete("/amc-alc/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM amc_alc_services WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Service deleted" });
  });
});

/* ================= SERVICE EXPENSES REPORT ================= */

/* GET EXPENSES REPORT */
router.get("/expenses", verifyToken, (req, res) => {
  const { start_date, end_date, service_type } = req.query;

  let sql = `
    SELECT
      service_date,
      service_type,
      service_person,
      SUM(petrol_charges) as total_petrol,
      SUM(spare_parts_price) as total_spare_parts,
      SUM(labour_charges) as total_labour,
      SUM(total_expenses) as total_expenses,
      COUNT(*) as total_services
    FROM amc_alc_services
    WHERE 1=1
  `;
  const params = [];

  if (start_date) {
    sql += " AND service_date >= ?";
    params.push(start_date);
  }

  if (end_date) {
    sql += " AND service_date <= ?";
    params.push(end_date);
  }

  if (service_type) {
    sql += " AND service_type = ?";
    params.push(service_type);
  }

  sql += " GROUP BY service_date, service_type, service_person ORDER BY service_date DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* GET SERVICE PERSON PERFORMANCE */
router.get("/person-performance", verifyToken, (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      service_person,
      COUNT(*) as total_services,
      SUM(petrol_charges) as total_petrol,
      SUM(spare_parts_price) as total_spare_parts,
      SUM(labour_charges) as total_labour,
      SUM(total_expenses) as total_expenses,
      AVG(total_expenses) as avg_expenses_per_service
    FROM amc_alc_services
    WHERE service_person IS NOT NULL AND service_person != ''
  `;
  const params = [];

  if (start_date) {
    sql += " AND service_date >= ?";
    params.push(start_date);
  }

  if (end_date) {
    sql += " AND service_date <= ?";
    params.push(end_date);
  }

  sql += " GROUP BY service_person ORDER BY total_services DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ================= SERVICE ACTIVITY LOG ================= */
router.get("/activity", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM service_activity ORDER BY created_at DESC LIMIT 50",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;