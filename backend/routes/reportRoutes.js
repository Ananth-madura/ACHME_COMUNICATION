const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken } = require("../middleware/authMiddleware");

// Helper to handle date ranges
const getDateRange = (filter, from, to) => {
  let startDate, endDate;
  const now = new Date();
  
  if (from && to) {
    startDate = from;
    endDate = to;
  } else {
    endDate = now.toISOString().split('T')[0];
    const d = new Date();
    if (filter === "day") {
      startDate = endDate;
    } else if (filter === "week") {
      // Last 7 days
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split('T')[0];
    } else if (filter === "month") {
      d.setDate(1);
      startDate = d.toISOString().split('T')[0];
    } else if (filter === "year") {
      d.setMonth(0);
      d.setDate(1);
      startDate = d.toISOString().split('T')[0];
    } else {
      // Default to month
      d.setDate(1);
      startDate = d.toISOString().split('T')[0];
    }
  }
  return { startDate, endDate };
};

/* GET OVERVIEW METRICS */
router.get("/overview", verifyToken, async (req, res) => {
  const { filter, from, to } = req.query;
  const { startDate, endDate } = getDateRange(filter, from, to);
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const userFilter = isAdmin ? "" : ` AND created_by = ${userId}`;
  const userFilterLeads = isAdmin ? "" : ` AND (created_by = ${userId} OR assigned_to = ${userId})`;

  const { customer } = req.query;
  const customerFilter = customer ? ` AND customer_name LIKE '%${customer}%'` : "";

  try {
    const queries = {
      sales: `SELECT SUM(grand_total) as total FROM performainvoices WHERE invoice_date BETWEEN ? AND ? ${userFilter} ${customer ? ` AND client_company LIKE '%${customer}%'` : ""}`,
      leads: `
        SELECT 
          (SELECT COUNT(*) FROM Telecalls WHERE call_date BETWEEN ? AND ? ${userFilterLeads} ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}) as telecalls,
          (SELECT COUNT(*) FROM Walkins WHERE walkin_date BETWEEN ? AND ? ${userFilterLeads} ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}) as walkins,
          (SELECT COUNT(*) FROM fields WHERE visit_date BETWEEN ? AND ? ${userFilterLeads} ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}) as fields,
          (SELECT COUNT(*) FROM Telecalls WHERE call_date BETWEEN ? AND ? ${userFilterLeads} AND call_outcome = 'Converted' ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}) as tc_conv,
          (SELECT COUNT(*) FROM Walkins WHERE walkin_date BETWEEN ? AND ? ${userFilterLeads} AND walkin_status = 'Converted' ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}) as wk_conv,
          (SELECT COUNT(*) FROM fields WHERE visit_date BETWEEN ? AND ? ${userFilterLeads} AND field_outcome = 'Converted' ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}) as fld_conv
      `,
      services: `SELECT COUNT(*) as count, SUM(total_expenses) as revenue FROM amc_alc WHERE service_date BETWEEN ? AND ? ${isAdmin ? "" : " AND (service_person_id = " + userId + " OR created_by = " + userId + ")"} ${customer ? ` AND customer_name LIKE '%${customer}%'` : ""}`
    };

    const [salesResult] = await db.promise().query(queries.sales, [startDate, endDate]);
    const [leadsResult] = await db.promise().query(queries.leads, [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]);
    const [servicesResult] = await db.promise().query(queries.services, [startDate, endDate]);

    const leads = leadsResult[0];
    const totalLeads = leads.telecalls + leads.walkins + leads.fields;
    const convertedLeads = leads.tc_conv + leads.wk_conv + leads.fld_conv;

    res.json({
      totalSales: salesResult[0].total || 0,
      totalLeads,
      totalCalls: leads.telecalls,
      totalWalkins: leads.walkins,
      totalFields: leads.fields,
      convertedLeads,
      totalServices: servicesResult[0].count || 0,
      totalRevenue: servicesResult[0].revenue || 0,
      startDate,
      endDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET EMPLOYEE COMPARISON */
router.get("/employee-comparison", verifyToken, async (req, res) => {
  const { filter, from, to } = req.query;
  const { startDate, endDate } = getDateRange(filter, from, to);

  try {
    const [employees] = await db.promise().query("SELECT id, first_name, last_name, job_title, emp_email FROM teammember");
    
    const reportData = await Promise.all(employees.map(async (emp) => {
      const empName = `${emp.first_name} ${emp.last_name || ""}`.trim();
      const empId = emp.id;

      const [leads] = await db.promise().query(`
        SELECT 
          (SELECT COUNT(*) FROM Telecalls WHERE (created_by = ? OR staff_name LIKE ? OR assigned_to = ?) AND call_date BETWEEN ? AND ?) as telecalls,
          (SELECT COUNT(*) FROM Walkins WHERE (created_by = ? OR staff_name LIKE ? OR assigned_to = ?) AND walkin_date BETWEEN ? AND ?) as walkins,
          (SELECT COUNT(*) FROM fields WHERE (created_by = ? OR staff_name LIKE ? OR assigned_to = ?) AND visit_date BETWEEN ? AND ?) as fields,
          (SELECT COUNT(*) FROM Telecalls WHERE (created_by = ? OR staff_name LIKE ? OR assigned_to = ?) AND call_date BETWEEN ? AND ? AND call_outcome = 'Converted') as tc_conv,
          (SELECT COUNT(*) FROM Walkins WHERE (created_by = ? OR staff_name LIKE ? OR assigned_to = ?) AND walkin_date BETWEEN ? AND ? AND walkin_status = 'Converted') as wk_conv,
          (SELECT COUNT(*) FROM fields WHERE (created_by = ? OR staff_name LIKE ? OR assigned_to = ?) AND visit_date BETWEEN ? AND ? AND field_outcome = 'Converted') as fld_conv
      `, [empId, `%${empName}%`, empId, startDate, endDate, empId, `%${empName}%`, empId, startDate, endDate, empId, `%${empName}%`, empId, startDate, endDate, empId, `%${empName}%`, empId, startDate, endDate, empId, `%${empName}%`, empId, startDate, endDate, empId, `%${empName}%`, empId, startDate, endDate]);

      const [services] = await db.promise().query(`SELECT COUNT(*) as count, SUM(total_expenses) as revenue FROM amc_alc WHERE (service_person_id = ? OR service_person LIKE ?) AND service_date BETWEEN ? AND ?`, [empId, `%${empName}%`, startDate, endDate]);

      const [tasks] = await db.promise().query(`SELECT COUNT(*) as total, SUM(CASE WHEN project_status = 'Completed' THEN 1 ELSE 0 END) as completed FROM tasks WHERE (assigned_to = ? OR staff_name LIKE ?) AND created_date BETWEEN ? AND ?`, [empId, `%${empName}%`, startDate, endDate]);

      const l = leads[0];
      const totalLeads = l.telecalls + l.walkins + l.fields;
      const leadsConverted = l.tc_conv + l.wk_conv + l.fld_conv;

      return {
        id: empId,
        name: empName,
        position: emp.job_title || "Staff",
        telecalls: l.telecalls,
        walkins: l.walkins,
        fields: l.fields,
        totalLeads,
        leadsConverted,
        conversionRate: totalLeads > 0 ? Math.round((leadsConverted / totalLeads) * 100) : 0,
        services: services[0].count || 0,
        serviceRevenue: services[0].revenue || 0,
        tasksAssigned: tasks[0].total || 0,
        tasksCompleted: tasks[0].completed || 0
      };
    }));

    res.json(reportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET TRENDS */
router.get("/trends", verifyToken, async (req, res) => {
  const { type } = req.query; // 'monthly' or 'daily'
  const isAdmin = req.user.role === 'admin';
  const userId = req.user.id;
  const userFilter = isAdmin ? "" : ` AND created_by = ${userId}`;

  try {
    if (type === 'daily') {
      const [rows] = await db.promise().query(`
        SELECT 
          DATE_FORMAT(date_series.date, '%m-%d') as date,
          COALESCE(SUM(p.grand_total), 0) as Sales,
          (SELECT COUNT(*) FROM Telecalls t WHERE DATE(t.call_date) = date_series.date ${isAdmin ? "" : " AND t.created_by = " + userId}) +
          (SELECT COUNT(*) FROM Walkins w WHERE DATE(w.walkin_date) = date_series.date ${isAdmin ? "" : " AND w.created_by = " + userId}) +
          (SELECT COUNT(*) FROM fields f WHERE DATE(f.visit_date) = date_series.date ${isAdmin ? "" : " AND f.created_by = " + userId}) as Leads,
          COALESCE(COUNT(s.id), 0) as Services
        FROM (
          SELECT CURDATE() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as date
          FROM (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as a
          CROSS JOIN (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as b
          CROSS JOIN (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as c
        ) as date_series
        LEFT JOIN performainvoices p ON DATE(p.invoice_date) = date_series.date ${userFilter}
        LEFT JOIN amc_alc s ON DATE(s.service_date) = date_series.date ${isAdmin ? "" : " AND s.service_person_id = " + userId}
        WHERE date_series.date BETWEEN DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND CURDATE()
        GROUP BY date_series.date
        ORDER BY date_series.date ASC
      `);
      res.json(rows);
    } else {
      // Monthly trend for current year
      const [rows] = await db.promise().query(`
        SELECT 
          m.month_name as name,
          COALESCE(SUM(p.grand_total), 0) as Sales,
          (SELECT COUNT(*) FROM Telecalls t WHERE MONTH(t.call_date) = m.month_num AND YEAR(t.call_date) = YEAR(CURDATE()) ${isAdmin ? "" : " AND t.created_by = " + userId}) +
          (SELECT COUNT(*) FROM Walkins w WHERE MONTH(w.walkin_date) = m.month_num AND YEAR(w.walkin_date) = YEAR(CURDATE()) ${isAdmin ? "" : " AND w.created_by = " + userId}) +
          (SELECT COUNT(*) FROM fields f WHERE MONTH(f.visit_date) = m.month_num AND YEAR(f.visit_date) = YEAR(CURDATE()) ${isAdmin ? "" : " AND f.created_by = " + userId}) as Leads,
          COALESCE(COUNT(s.id), 0) as Services,
          COALESCE(SUM(s.total_expenses), 0) as Revenue
        FROM (
          SELECT 1 as month_num, 'Jan' as month_name UNION SELECT 2, 'Feb' UNION SELECT 3, 'Mar' UNION SELECT 4, 'Apr' UNION SELECT 5, 'May' UNION SELECT 6, 'Jun' 
          UNION SELECT 7, 'Jul' UNION SELECT 8, 'Aug' UNION SELECT 9, 'Sep' UNION SELECT 10, 'Oct' UNION SELECT 11, 'Nov' UNION SELECT 12, 'Dec'
        ) as m
        LEFT JOIN performainvoices p ON MONTH(p.invoice_date) = m.month_num AND YEAR(p.invoice_date) = YEAR(CURDATE()) ${userFilter}
        LEFT JOIN amc_alc s ON MONTH(s.service_date) = m.month_num AND YEAR(s.service_date) = YEAR(CURDATE()) ${isAdmin ? "" : " AND s.service_person_id = " + userId}
        GROUP BY m.month_num, m.month_name
        ORDER BY m.month_num ASC
      `);
      res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
