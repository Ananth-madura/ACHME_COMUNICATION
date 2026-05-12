# ACHME Communication - Backend & Integration Plan

## Document Version: 1.0
## Last Updated: May 2026
## Purpose: Complete system overhaul for employee tracking, client management, task/target assignment, and notification system

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Core Issues Identified](#core-issues-identified)
4. [Database Schema Updates](#database-schema-updates)
5. [Backend API Routes](#backend-api-routes)
6. [Frontend Integration Points](#frontend-integration-points)
7. [Notification System Design](#notification-system-design)
8. [Lead Conversion Flow](#lead-conversion-flow)
9. [Task & Target Assignment Flow](#task--target-assignment-flow)
10. [Missed Reminder Tracking](#missed-reminder-tracking)
11. [Implementation Phases](#implementation-phases)
12. [Migration Scripts](#migration-scripts)
13. [Testing Checklist](#testing-checklist)

---

## 1. Executive Summary

This document outlines the comprehensive plan to fix and enhance the ACHME Communication CRM system. The primary goals are:

- **Employee Tracking**: All employees are registered in the `teammember` table and this data flows across all modules
- **Client Integration**: Leads that convert automatically create client records; all client-fetching operations pull from the unified `clients` table
- **Task & Target Assignment**: All task and target assignments use the `teammember` table for employee selection
- **Role-Based Notifications**: Admin sees all notifications; employees only see notifications assigned to them
- **Missed Reminder Alerts**: When an employee misses 3+ reminders on a lead, admin receives automatic notification
- **Task Completion Tracking**: When employee completes task, admin notified; if overdue, admin also notified

### Key Benefits

1. Single source of truth for employees (teammember table)
2. Consistent employee selection across all forms
3. Automatic lead-to-client conversion
4. Real-time notifications for task and target updates
5. Escalation system for missed reminders
6. Role-based notification visibility

---

## 2. Current System Analysis

### 2.1 Existing Route Files

| File | Path | Current Purpose | Issues |
|------|------|----------------|--------|
| team.js | backend/routes/team.js | Team member CRUD | GET / needs auth (should be public for dropdowns) |
| authRoutes.js | backend/routes/authRoutes.js | Authentication | Creates users but doesn't link to teammember properly |
| taskRoutes.js | backend/routes/taskRoutes.js | Tasks & targets | Uses user_name instead of teammember ID |
| telecallRoutes.js | backend/routes/telecallRoutes.js | Telecalling leads | staff_name is text, not linked to teammember |
| walkinRoutes.js | backend/routes/walkinRoutes.js | Walk-in leads | Same staff_name issue |
| fieldRoutes.js | backend/routes/fieldRoutes.js | Field leads | Same staff_name issue |
| newclient.js | backend/routes/newclient.js | Client CRUD | Created from conversions, manual entry needed |
| leadManagementRoutes.js | backend/routes/leadManagementRoutes.js | Lead management | Contains conversion logic but scattered |
| notification.js | backend/sockets/notifications.js | WebSocket notifications | Works but needs role-based filtering |

### 2.2 Current Database Tables

```
teammember:
├── id (PK)
├── first_name
├── last_name
├── emp_email
├── mobile / mobile_number
├── job_title
├── emp_role (Developer, BDM, Manager, Sales)
├── user_id (link to users table)
├── emp_id
├── quotation_count
├── emp_address
└── created_at

clients:
├── id (PK)
├── name
├── company_name
├── email
├── phone
├── address
├── service
├── gst_number
├── created_by (user_id)
├── lead_id (reference to converted lead)
├── lead_type (telecall/walkin/field)
├── created_at
└── updated_at

tasks:
├── id (PK)
├── project_name
├── task_title
├── client_name
├── project_status (New/Process/Completed)
├── project_priority (Low/Normal/High/Urgent)
├── staff_name (TEXT - should be FK to teammember)
├── assigned_to (user_id - should be teammember.user_id)
├── created_by (user_id)
├── created_date
├── due_date
├── updated_at
└── [needs: teammember_id FK]

task_targets:
├── id (PK)
├── user_id (should link to teammember.user_id)
├── user_name (TEXT - should be teammember name)
├── yearly_target
├── monthly_target
├── carry_forward
├── effective_target
├── created_by_admin
├── created_at
└── updated_at

task_assignments:
├── id (PK)
├── task_id (FK to tasks)
├── target_id (FK to task_targets)
├── assigned_to_user_id (user_id - should be teammember.user_id)
├── assigned_to_user_name
├── assigned_by (user_id)
├── status (Pending/Accepted/Declined/In Progress/Completed)
├── assigned_date
├── due_date
├── priority
├── notes
├── created_at
└── updated_at

notifications:
├── id (PK)
├── task_id (nullable)
├── target_id (nullable)
├── lead_id (nullable)
├── user_id (recipient - for employee notifications)
├── type
├── title
├── description
├── is_read
├── created_at
└── [needs: employee_id FK to teammember]

admin_notifications:
├── id (PK)
├── type
├── user_id (nullable - 0 for system/admin)
├── message
├── related_id
├── related_type
├── created_by
├── priority (low/medium/high/critical)
├── is_read
├── created_at
└── [needs: employee_id for escalation tracking]

lead_reminders:
├── id (PK)
├── lead_id
├── lead_type (telecall/walkin/field)
├── reminder_date
├── reminder_time
├── reminder_notes
├── status (Pending/Done/Missed)
├── missed_count
├── created_by (should be teammember.id)
├── created_at
└── [needs: employee_id FK]

lead_activity:
├── id (PK)
├── lead_id
├── lead_type
├── employee_id (FK to teammember)
├── action
├── details
├── created_at

lead_escalations:
├── id (PK)
├── lead_id
├── lead_type
├── employee_id (FK to teammember)
├── customer_name
├── mobile_number
├── staff_name
├── last_followup_date
├── missed_count
├── status (Open/Resolved)
├── escalated_at
└── resolved_at
```

---

## 3. Core Issues Identified

### Issue 1: Staff Name Stored as Text
**Problem**: `staff_name` in leads and tasks is stored as plain text, not linked to `teammember` table.
**Impact**: Cannot track which employee created/assigned what; no foreign key relationship.
**Solution**: Add `teammember_id` column to all tables that track employee assignment.

### Issue 2: Inconsistent Employee Fetching
**Problem**: Some pages fetch from `/api/teammember` with auth, some without.
**Impact**: Employees cannot use staff dropdowns if not admin.
**Solution**: Make `/api/teammember` public (no auth required) for dropdown purposes.

### Issue 3: Lead Conversion Doesn't Update All Places
**Problem**: When lead converts to client, not all forms that need client data fetch from converted leads.
**Impact**: Manual client entry required after conversion.
**Solution**: Ensure all forms (proposal, contract, invoice, AMC) fetch clients from unified table.

### Issue 4: Notification Visibility Not Role-Based
**Problem**: All notifications go to admin room; employees don't see their specific notifications.
**Impact**: Employees don't know when tasks are assigned to them.
**Solution**: Implement role-based notification rooms - admin gets all, employees get only theirs.

### Issue 5: Missed Reminder Tracking Incomplete
**Problem**: No automatic escalation when employee misses reminders.
**Impact**: Leads go cold without accountability.
**Solution**: Add `missed_count` tracking per employee per lead; escalate to admin after 3 misses.

### Issue 6: Task Assignment Doesn't Notify Employee
**Problem**: Tasks assigned but no real-time notification to assigned employee.
**Impact**: Employees check manually for new tasks.
**Solution**: Emit notification to specific employee when task assigned.

### Issue 7: Target Assignment Doesn't Notify Employee
**Problem**: Targets set but employee not notified of new target amount.
**Impact**: Employees don't know their targets.
**Solution**: Emit notification to assigned employee when target created/updated.

### Issue 8: Task/Target Completion Not Tracked for Admin
**Problem**: When employee completes task, admin not notified.
**Impact**: Admin has no visibility into task completion.
**Solution**: Emit notification to admin when employee completes task.

### Issue 9: Overdue Tasks Not Escalated
**Problem**: Overdue tasks don't trigger admin notification.
**Impact**: Overdue work goes unnoticed.
**Solution**: Add escalation notification to admin for overdue tasks.

---

## 4. Database Schema Updates

### 4.1 Migration: Add Foreign Keys to Existing Tables

Create a new migration file: `backend/migrations/enhance_employee_tracking.js`

```javascript
// Add teammember_id to leads tables
ALTER TABLE Telecalls ADD COLUMN teammember_id INT DEFAULT NULL;
ALTER TABLE Walkins ADD COLUMN teammember_id INT DEFAULT NULL;
ALTER TABLE Fields ADD COLUMN teammember_id INT DEFAULT NULL;

// Add teammember_id to tasks
ALTER TABLE tasks ADD COLUMN teammember_id INT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN assigned_teammember_id INT DEFAULT NULL;

// Add employee tracking to reminders
ALTER TABLE lead_reminders ADD COLUMN employee_id INT DEFAULT NULL;
ALTER TABLE lead_activity ADD COLUMN employee_id INT DEFAULT NULL;
ALTER TABLE lead_escalations ADD COLUMN employee_id INT DEFAULT NULL;

// Add missed threshold tracking
ALTER TABLE lead_escalations ADD COLUMN missed_threshold_reached TINYINT(1) DEFAULT 0;

// Add target employee tracking
ALTER TABLE task_targets ADD COLUMN teammember_id INT DEFAULT NULL;
ALTER TABLE task_assignments ADD COLUMN teammember_id INT DEFAULT NULL;

// Add client lead reference for tracking
ALTER TABLE clients ADD COLUMN original_lead_id INT DEFAULT NULL;
ALTER TABLE clients ADD COLUMN original_lead_type VARCHAR(20) DEFAULT NULL;
```

### 4.2 New Tables Needed

```sql
-- Track employee activities for audit
CREATE TABLE IF NOT EXISTS employee_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  action_type ENUM('login','logout','lead_created','lead_updated','task_completed','target_updated','reminder_set','reminder_missed') NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_id (employee_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
);

-- Track notification delivery status
CREATE TABLE IF NOT EXISTS notification_delivery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NOT NULL,
  recipient_employee_id INT NOT NULL,
  delivery_status ENUM('pending','delivered','read','failed') DEFAULT 'pending',
  delivered_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification_id (notification_id),
  INDEX idx_recipient (recipient_employee_id)
);

-- Escalation rules configuration
CREATE TABLE IF NOT EXISTS escalation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_type ENUM('reminder_missed','task_overdue','target_missed') NOT NULL,
  threshold_count INT NOT NULL,
  escalate_to_role VARCHAR(50) DEFAULT 'admin',
  notify_creator TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default escalation rule for missed reminders
INSERT INTO escalation_rules (rule_type, threshold_count, escalate_to_role, notify_creator, is_active)
VALUES ('reminder_missed', 3, 'admin', 1, 1);
```

### 4.3 Indexes for Performance

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_teammember_user_id ON teammember(user_id);
CREATE INDEX idx_teammember_email ON teammember(emp_email);
CREATE INDEX idx_teammember_role ON teammember(emp_role);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(project_status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE INDEX idx_leads_teammember ON Telecalls(teammember_id);
CREATE INDEX idx_walkins_teammember ON Walkins(teammember_id);
CREATE INDEX idx_fields_teammember ON Fields(teammember_id);

CREATE INDEX idx_reminders_employee ON lead_reminders(employee_id);
CREATE INDEX idx_reminders_status ON lead_reminders(status);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
```

---

## 5. Backend API Routes

### 5.1 Team Member Routes (backend/routes/team.js)

#### Current Issues:
- GET / requires admin auth (should be public for dropdowns)
- No filtering by role
- No active/inactive status

#### Updated Routes:

```javascript
// GET / - Public endpoint for dropdowns (no auth required)
// Returns: [{ id, first_name, last_name, emp_email, job_title, emp_role, user_id, emp_id, mobile }]
router.get("/", (req, res) => {
  const { role, status } = req.query;
  let sql = "SELECT id, first_name, last_name, emp_email, job_title, emp_role, user_id, emp_id, mobile FROM teammember WHERE 1=1";
  const params = [];
  
  if (role) {
    sql += " AND emp_role = ?";
    params.push(role);
  }
  
  sql += " ORDER BY first_name ASC";
  
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// GET /:id - Get single team member with user details
router.get("/:id", verifyToken, (req, res) => {
  db.query(
    `SELECT t.*, u.email, u.role as user_role, u.is_active 
     FROM teammember t 
     LEFT JOIN users u ON t.user_id = u.id 
     WHERE t.id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(404).json({ message: "Not found" });
      res.json(result[0]);
    }
  );
});

// GET /by-user/:userId - Get team member by user ID
router.get("/by-user/:userId", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM teammember WHERE user_id = ?",
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0] || null);
    }
  );
});

// POST / - Create new team member (admin only)
router.post("/", verifyToken, isAdmin, (req, res) => {
  const { first_name, last_name, emp_email, mobile, job_title, emp_role, emp_id } = req.body;
  
  if (!first_name || !emp_email) {
    return res.status(400).json({ message: "first_name and emp_email required" });
  }
  
  const sql = `
    INSERT INTO teammember (first_name, last_name, emp_email, mobile, job_title, emp_role, emp_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [first_name, last_name, emp_email, mobile, job_title, emp_role, emp_id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true, id: result.insertId });
    }
  );
});

// PUT /:id - Update team member (admin only)
router.put("/:id", verifyToken, isAdmin, (req, res) => {
  const { first_name, last_name, emp_email, mobile, job_title, emp_role, emp_id, user_id } = req.body;
  
  const sql = `
    UPDATE teammember 
    SET first_name=?, last_name=?, emp_email=?, mobile=?, job_title=?, emp_role=?, emp_id=?, user_id=?
    WHERE id=?
  `;
  
  db.query(sql, [first_name, last_name, emp_email, mobile, job_title, emp_role, emp_id, user_id, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// DELETE /:id - Soft delete or remove team member (admin only)
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  db.query("DELETE FROM teammember WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});
```

### 5.2 Client Routes (backend/routes/newclient.js)

#### Updates Needed:
- Add endpoint to fetch clients converted from leads
- Add endpoint to link clients to teammember who created them
- Add search by multiple fields

```javascript
// GET / - Fetch all clients with optional filters
router.get("/", verifyToken, (req, res) => {
  const { search, source, date_from, date_to } = req.query;
  let sql = `
    SELECT c.*, u.first_name as created_by_name, tm.first_name as assigned_staff_name
    FROM clients c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN teammember tm ON c.assigned_teammember_id = tm.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    sql += " AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company_name LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (source) {
    sql += " AND c.original_lead_type = ?";
    params.push(source);
  }
  
  if (date_from) {
    sql += " AND c.created_at >= ?";
    params.push(date_from);
  }
  
  if (date_to) {
    sql += " AND c.created_at <= ?";
    params.push(date_to);
  }
  
  sql += " ORDER BY c.created_at DESC";
  
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// GET /:id - Get single client with full details
router.get("/:id", verifyToken, (req, res) => {
  db.query(
    `SELECT c.*, u.first_name as created_by_name, tm.* as teammember_details
     FROM clients c
     LEFT JOIN users u ON c.created_by = u.id
     LEFT JOIN teammember tm ON c.assigned_teammember_id = tm.id
     WHERE c.id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(404).json({ message: "Client not found" });
      res.json(result[0]);
    }
  );
});

// POST / - Create client manually
router.post("/", verifyToken, (req, res) => {
  const { name, company_name, email, phone, address, service, gst_number, teammember_id } = req.body;
  const created_by = req.user.id;
  
  const sql = `
    INSERT INTO clients (name, company_name, email, phone, address, service, gst_number, created_by, assigned_teammember_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [name, company_name, email, phone, address, service, gst_number, created_by, teammember_id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true, id: result.insertId });
    }
  );
});

// PUT /:id - Update client
router.put("/:id", verifyToken, (req, res) => {
  const { name, company_name, email, phone, address, service, gst_number, teammember_id } = req.body;
  
  const sql = `
    UPDATE clients 
    SET name=?, company_name=?, email=?, phone=?, address=?, service=?, gst_number=?, assigned_teammember_id=?
    WHERE id=?
  `;
  
  db.query(sql, [name, company_name, email, phone, address, service, gst_number, teammember_id, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// DELETE /:id - Delete client (admin only)
router.delete("/:id", verifyToken, isAdmin, (req, res) => {
  db.query("DELETE FROM clients WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// GET /converted-from/:leadType/:leadId - Get client created from specific lead
router.get("/converted-from/:leadType/:leadId", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM clients WHERE original_lead_id = ? AND original_lead_type = ?",
    [req.params.leadId, req.params.leadType],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0] || null);
    }
  );
});
```

### 5.3 Lead Management Routes (backend/routes/leadManagementRoutes.js)

#### Updates:
- Track teammember_id on all lead operations
- Add reminder missed escalation logic
- Emit notifications based on role

```javascript
// GET /leads/summary - Get lead summary by type
router.get("/leads/summary", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  
  // Get counts for each lead type
  const getCounts = (table, leadType) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT COUNT(*) as total FROM ${table}`;
      const params = [];
      
      if (role === "employee") {
        sql += " WHERE teammember_id = ?";
        params.push(req.user.teammember_id);
      }
      
      db.query(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve({ type: leadType, count: result[0].total });
      });
    });
  };
  
  Promise.all([
    getCounts("Telecalls", "telecall"),
    getCounts("Walkins", "walkin"),
    getCounts("Fields", "field")
  ]).then(results => {
    res.json(results);
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// POST /leads/reminders - Create reminder with employee tracking
router.post("/leads/reminders", verifyToken, (req, res) => {
  const { lead_id, lead_type, reminder_date, reminder_time, reminder_notes } = req.body;
  const employee_id = req.user.teammember_id || null;
  
  const sql = `
    INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_time, reminder_notes, employee_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [lead_id, lead_type, reminder_date, reminder_time, reminder_notes, employee_id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      
      // Log activity
      db.query(
        "INSERT INTO lead_activity (lead_id, lead_type, employee_id, action, details) VALUES (?,?,?,?,?)",
        [lead_id, lead_type, employee_id, "Reminder Created", `Reminder set for ${reminder_date}`]
      );
      
      res.json({ success: true, id: result.insertId });
    }
  );
});

// PUT /leads/reminders/:id/miss - Mark reminder as missed and check escalation
router.put("/leads/reminders/:id/miss", verifyToken, (req, res) => {
  const { id } = req.params;
  
  // Get reminder details
  db.query("SELECT * FROM lead_reminders WHERE id = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: "Reminder not found" });
    
    const reminder = results[0];
    
    // Update status to Missed
    db.query(
      "UPDATE lead_reminders SET status = 'Missed', missed_count = missed_count + 1 WHERE id = ?",
      [id],
      (err) => {
        if (err) return res.status(500).json(err);
        
        // Check if employee has missed 3+ reminders on this lead
        db.query(
          `SELECT COUNT(*) as missed_total FROM lead_reminders 
           WHERE lead_id = ? AND lead_type = ? AND status = 'Missed'`,
          [reminder.lead_id, reminder.lead_type],
          (err, countResult) => {
            const missedTotal = countResult[0].missed_total;
            
            // Log activity
            db.query(
              "INSERT INTO lead_activity (lead_id, lead_type, employee_id, action, details) VALUES (?,?,?,?,?)",
              [reminder.lead_id, reminder.lead_type, reminder.employee_id, "Reminder Missed", `Missed reminder #${missedTotal}`]
            );
            
            // If missed 3 or more, create escalation
            if (missedTotal >= 3) {
              // Check if escalation already exists
              db.query(
                `SELECT id FROM lead_escalations 
                 WHERE lead_id = ? AND lead_type = ? AND status = 'Open'`,
                [reminder.lead_id, reminder.lead_type],
                (err, existingEscalation) => {
                  if (existingEscalation.length === 0) {
                    // Get lead details for escalation
                    const leadTable = reminder.lead_type + "s";
                    db.query(
                      `SELECT customer_name, mobile_number, staff_name FROM ${leadTable} WHERE id = ?`,
                      [reminder.lead_id],
                      (err, leadResult) => {
                        if (leadResult.length > 0) {
                          const lead = leadResult[0];
                          
                          // Create escalation
                          db.query(
                            `INSERT INTO lead_escalations 
                             (lead_id, lead_type, employee_id, customer_name, mobile_number, staff_name, missed_count, missed_threshold_reached)
                             VALUES (?,?,?,?,?,?,?,1)`,
                            [reminder.lead_id, reminder.lead_type, reminder.employee_id, lead.customer_name, lead.mobile_number, lead.staff_name, missedTotal],
                            (err) => {
                              if (!err) {
                                // Emit admin notification
                                const notificationIO = getNotificationIO();
                                if (notificationIO) {
                                  notificationIO.emitNotification("escalation_created", {
                                    type: "reminder_escalation",
                                    lead_id: reminder.lead_id,
                                    lead_type: reminder.lead_type,
                                    employee_id: reminder.employee_id,
                                    customer_name: lead.customer_name,
                                    missed_count: missedTotal,
                                    message: `Employee missed ${missedTotal} reminders on lead: ${lead.customer_name}`
                                  }, null, true);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
            
            res.json({ success: true, missed_count: missedTotal });
          }
        );
      }
    );
  });
});

// GET /leads/escalations - Get all escalations (admin only)
router.get("/leads/escalations", verifyToken, isAdmin, (req, res) => {
  const { status } = req.query;
  
  let sql = `
    SELECT e.*, tm.first_name as employee_name, tm.emp_role
    FROM lead_escalations e
    LEFT JOIN teammember tm ON e.employee_id = tm.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    sql += " AND e.status = ?";
    params.push(status);
  }
  
  sql += " ORDER BY e.created_at DESC";
  
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// PUT /leads/escalations/:id/resolve - Resolve an escalation
router.put("/leads/escalations/:id/resolve", verifyToken, (req, res) => {
  const { id } = req.params;
  const { resolution_notes } = req.body;
  
  db.query(
    "UPDATE lead_escalations SET status = 'Resolved', resolved_at = NOW() WHERE id = ?",
    [id],
    (err) => {
      if (err) return res.status(500).json(err);
      
      // Get escalation details
      db.query("SELECT * FROM lead_escalations WHERE id = ?", [id], (err, result) => {
        if (result.length > 0) {
          const escalation = result[0];
          
          // Notify the employee
          const notificationIO = getNotificationIO();
          if (notificationIO && escalation.employee_id) {
            notificationIO.emitNotification("escalation_resolved", {
              type: "reminder_escalation_resolved",
              lead_id: escalation.lead_id,
              lead_type: escalation.lead_type,
              message: `Your missed reminder escalation for lead ${escalation.customer_name} has been resolved.`
            }, escalation.employee_id, false);
          }
        }
      });
      
      res.json({ success: true });
    }
  );
});

// GET /leads/activity/:leadType/:leadId - Get activity log for a lead
router.get("/leads/activity/:leadType/:leadId", verifyToken, (req, res) => {
  const { leadType, leadId } = req.params;
  
  db.query(
    `SELECT a.*, tm.first_name as employee_name
     FROM lead_activity a
     LEFT JOIN teammember tm ON a.employee_id = tm.id
     WHERE a.lead_id = ? AND a.lead_type = ?
     ORDER BY a.created_at DESC`,
    [leadId, leadType],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});
```

### 5.4 Task Routes (backend/routes/taskRoutes.js)

#### Updates:
- Use teammember for assignments
- Emit notifications to specific employees
- Track task completion for admin notification

```javascript
// POST / - Create task with teammember assignment
router.post("/", verifyToken, isAdmin, (req, res) => {
  const { project_name, task_title, project_status, project_priority, client_name, created_date, due_date, assigned_to, assigned_teammember_id, staff_name } = req.body;
  
  const sql = `
    INSERT INTO tasks (project_name, task_title, project_status, project_priority, client_name, created_date, due_date, assigned_to, assigned_teammember_id, staff_name, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [project_name, task_title, project_status || "New", project_priority || "Medium", client_name, created_date, due_date, assigned_to, assigned_teammember_id, staff_name, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      
      const taskId = result.insertId;
      
      // Log activity
      db.query(
        "INSERT INTO task_activity (task_id, action, message) VALUES (?,?,?)",
        [taskId, "Created", `Task "${task_title}" created and assigned to ${staff_name}`]
      );
      
      // Emit notification to assigned employee
      const notificationIO = getNotificationIO();
      if (notificationIO && assigned_to) {
        notificationIO.emitNotification("task_assigned", {
          taskId: taskId,
          taskName: task_title,
          projectName: project_name,
          dueDate: due_date,
          priority: project_priority,
          assignedBy: req.user.first_name,
          message: `New task assigned: "${task_title}" - Due: ${due_date}`
        }, assigned_to, false);
      }
      
      // Also notify admin
      if (notificationIO) {
        notificationIO.emitNotification("task_created_admin", {
          taskId: taskId,
          taskName: task_title,
          assignedTo: staff_name,
          dueDate: due_date,
          priority: project_priority,
          type: "task"
        }, null, true);
      }
      
      res.json({ message: "Task created", id: taskId });
    }
  );
});

// PUT /:id/status - Update task status
router.put("/:id/status", verifyToken, (req, res) => {
  const { status } = req.body;
  const taskId = req.params.id;
  
  // Get current task details
  db.query("SELECT * FROM tasks WHERE id = ?", [taskId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: "Task not found" });
    
    const task = results[0];
    
    db.query(
      "UPDATE tasks SET project_status = ?, updated_at = NOW() WHERE id = ?",
      [status, taskId],
      (err) => {
        if (err) return res.status(500).json(err);
        
        // Log activity
        db.query(
          "INSERT INTO task_activity (task_id, action, message) VALUES (?,?,?)",
          [taskId, "Status Updated", `Task status changed to ${status}`]
        );
        
        // If completed, notify admin
        if (status === "Completed") {
          const notificationIO = getNotificationIO();
          
          // Notify the employee who created the task (admin)
          if (notificationIO && task.created_by) {
            notificationIO.emitNotification("task_completed", {
              taskId: taskId,
              taskName: task.task_title,
              completedBy: task.staff_name || task.assigned_to,
              completedAt: new Date().toISOString(),
              type: "task_completion"
            }, task.created_by, false);
          }
          
          // Notify all admins
          if (notificationIO) {
            notificationIO.emitNotification("task_completed_admin", {
              taskId: taskId,
              taskName: task.task_title,
              completedBy: task.staff_name || task.assigned_to,
              type: "task"
            }, null, true);
          }
        }
        
        res.json({ message: "Status updated" });
      }
    );
  });
});

// GET /overdue - Get overdue tasks (for admin dashboard)
router.get("/overdue", verifyToken, isAdmin, (req, res) => {
  db.query(
    `SELECT t.*, tm.first_name as employee_name, tm.emp_email
     FROM tasks t
     LEFT JOIN teammember tm ON t.assigned_teammember_id = tm.id
     WHERE t.due_date < CURDATE() AND t.project_status != 'Completed'
     ORDER BY t.due_date ASC`,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// POST /targets - Create target with teammember
router.post("/targets", verifyToken, isAdmin, (req, res) => {
  const { user_id, user_name, yearly_target, monthly_target, teammember_id, created_by_admin } = req.body;
  
  if (!user_name || !yearly_target) {
    return res.status(400).json({ error: "user_name and yearly_target required" });
  }
  
  const finalMonthlyTarget = monthly_target || Math.round(yearly_target / 12);
  
  // Check if target exists
  db.query(
    "SELECT id FROM task_targets WHERE user_name = ? AND YEAR(created_at) = YEAR(NOW())",
    [user_name],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      
      if (rows.length > 0) {
        // Update existing
        db.query(
          "UPDATE task_targets SET yearly_target = ?, monthly_target = ?, teammember_id = ?, updated_at = NOW() WHERE id = ?",
          [yearly_target, finalMonthlyTarget, teammember_id, rows[0].id],
          (err2) => {
            if (err2) return res.status(500).json(err2);
            
            // Notify employee
            const notificationIO = getNotificationIO();
            if (notificationIO && user_id) {
              notificationIO.emitNotification("target_updated", {
                targetId: rows[0].id,
                yearlyTarget: yearly_target,
                monthlyTarget: finalMonthlyTarget,
                updatedBy: req.user.first_name,
                message: `Your target has been updated to ₹${yearly_target}/year (₹${finalMonthlyTarget}/month)`
              }, user_id, false);
            }
            
            res.json({ message: "Target updated", id: rows[0].id });
          }
        );
      } else {
        // Create new
        db.query(
          "INSERT INTO task_targets (user_id, user_name, yearly_target, monthly_target, teammember_id, created_by_admin) VALUES (?,?,?,?,?,?)",
          [user_id, user_name, yearly_target, finalMonthlyTarget, teammember_id, created_by_admin],
          (err2, result) => {
            if (err2) return res.status(500).json(err2);
            
            // Notify employee of new target
            const notificationIO = getNotificationIO();
            if (notificationIO && user_id) {
              notificationIO.emitNotification("new_target", {
                targetId: result.insertId,
                yearlyTarget: yearly_target,
                monthlyTarget: finalMonthlyTarget,
                assignedBy: req.user.first_name,
                message: `New target assigned: ₹${yearly_target}/year (₹${finalMonthlyTarget}/month)`
              }, user_id, false);
            }
            
            // Notify admin
            if (notificationIO) {
              notificationIO.emitNotification("target_created_admin", {
                targetId: result.insertId,
                assignedTo: user_name,
                yearlyTarget: yearly_target,
                monthlyTarget: finalMonthlyTarget,
                type: "target"
              }, null, true);
            }
            
            res.json({ message: "Target created", id: result.insertId });
          }
        );
      }
    }
  );
});

// GET /targets/my - Get target for logged-in employee
router.get("/targets/my", verifyToken, (req, res) => {
  const user_name = req.user.first_name || req.user.name;
  const user_id = req.user.id;
  
  if (!user_name) return res.status(400).json({ error: "User name required" });
  
  db.query(
    `SELECT t.*, tm.job_title
     FROM task_targets t
     LEFT JOIN teammember tm ON t.teammember_id = tm.id
     WHERE t.user_name = ? AND YEAR(t.created_at) = YEAR(NOW())`,
    [user_name],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (rows.length === 0) {
        return res.json({ message: "No target set", hasTarget: false });
      }
      
      const target = rows[0];
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Get current month achievements
      db.query(
        "SELECT COALESCE(SUM(achieved_amount), 0) as achieved FROM task_achievements WHERE user_name = ? AND month_year = ?",
        [user_name, currentMonth],
        (err2, achRows) => {
          const achieved = achRows[0].achieved;
          const pending = Math.max(0, target.monthly_target - achieved);
          
          res.json({
            ...target,
            hasTarget: true,
            achieved_amount: achieved,
            pending_amount: pending,
            progress_percentage: target.monthly_target > 0 ? Math.round((achieved / target.monthly_target) * 100) : 0
          });
        }
      );
    }
  );
});
```

### 5.5 Notification Routes (backend/routes/notificationRoutes.js)

Create new file for consolidated notification handling:

```javascript
const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middileware/authMiddleware");

// GET / - Get notifications for current user
router.get("/", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  const { type, limit, offset } = req.query;
  
  let sql = `
    SELECT n.*, 
           CASE WHEN n.user_id IS NOT NULL THEN 'employee' ELSE 'admin' END as notification_type
    FROM notifications n
    WHERE 1=1
  `;
  const params = [];
  
  // Employees see only their notifications
  if (role === "employee") {
    sql += " AND (n.user_id = ? OR n.user_id IS NULL)";
    params.push(user_id);
  }
  
  if (type) {
    sql += " AND n.type = ?";
    params.push(type);
  }
  
  sql += " ORDER BY n.created_at DESC";
  
  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit));
    if (offset) {
      sql += " OFFSET ?";
      params.push(parseInt(offset));
    }
  }
  
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// GET /unread-count - Get unread notification count
router.get("/unread-count", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  
  let sql = "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0";
  
  if (role === "employee") {
    sql += " AND (user_id = ? OR user_id IS NULL)";
  }
  
  db.query(sql, role === "employee" ? [user_id] : [], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ count: result[0].count });
  });
});

// PUT /:id/read - Mark notification as read
router.put("/:id/read", verifyToken, (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// PUT /read-all - Mark all notifications as read
router.put("/read-all", verifyToken, (req, res) => {
  const { id: user_id, role } = req.user;
  
  let sql = "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE is_read = 0";
  
  if (role === "employee") {
    sql += " AND (user_id = ? OR user_id IS NULL)";
  }
  
  db.query(sql, role === "employee" ? [user_id] : [], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// DELETE /:id - Delete notification
router.delete("/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM notifications WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// GET /admin - Get all admin notifications (admin only)
router.get("/admin", verifyToken, isAdmin, (req, res) => {
  const { type, priority, limit } = req.query;
  
  let sql = `
    SELECT an.*, tm.first_name as employee_name
    FROM admin_notifications an
    LEFT JOIN teammember tm ON an.user_id = tm.user_id
    WHERE 1=1
  `;
  const params = [];
  
  if (type) {
    sql += " AND an.type = ?";
    params.push(type);
  }
  
  if (priority) {
    sql += " AND an.priority = ?";
    params.push(priority);
  }
  
  sql += " ORDER BY an.created_at DESC";
  
  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit));
  }
  
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// GET /admin/unread-count - Get unread admin notification count
router.get("/admin/unread-count", verifyToken, isAdmin, (req, res) => {
  db.query(
    "SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ count: result[0].count });
    }
  );
});

// PUT /admin/:id/read - Mark admin notification as read
router.put("/admin/:id/read", verifyToken, isAdmin, (req, res) => {
  db.query(
    "UPDATE admin_notifications SET is_read = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// PUT /admin/read-all - Mark all admin notifications as read
router.put("/admin/read-all", verifyToken, isAdmin, (req, res) => {
  db.query(
    "UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0",
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// DELETE /admin/:id - Delete admin notification
router.delete("/admin/:id", verifyToken, isAdmin, (req, res) => {
  db.query("DELETE FROM admin_notifications WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

module.exports = router;
```

---

## 6. Frontend Integration Points

### 6.1 Staff Select Component (Reusable)

Create a reusable component that fetches from `/api/teammember`:

```jsx
// frontend/src/components/StaffSelect.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config/api";

const StaffSelect = ({ value, onChange, name, required, excludeSelf, className }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get(`${API}/api/teammember`);
      setTeamMembers(res.data);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <select className={className} disabled><option>Loading...</option></select>;
  }

  return (
    <select name={name} value={value} onChange={onChange} required={required} className={className}>
      <option value="">-- Select Staff --</option>
      {teamMembers.map(member => (
        <option key={member.id} value={member.user_id || member.id}>
          {member.first_name} {member.last_name || ""} {member.job_title ? `(${member.job_title})` : ""}
        </option>
      ))}
    </select>
  );
};

export default StaffSelect;
```

### 6.2 Pages to Update with StaffSelect

| Page | Current Implementation | Update Required |
|------|----------------------|-----------------|
| telecalling.jsx | Fetches from /api/teammember | Already working, ensure consistency |
| walkins.jsx | Fetches from /api/teammember | Already working, ensure consistency |
| field.jsx | Fetches from /api/teammember | Already working, ensure consistency |
| task.jsx | Fetches from /api/teammember | Already working, ensure consistency |
| target.jsx | Fetches from /api/teammember | Already working, ensure consistency |
| clients.jsx | Manual entry | Add teammember dropdown for assigned staff |
| proposal.jsx | Client search | Ensure client fetch includes converted leads |
| contract.jsx | Client search | Ensure client fetch includes converted leads |
| invoice.jsx | Client search | Ensure client fetch includes converted leads |
| amc.jsx | Client search | Ensure client fetch includes converted leads |

### 6.3 Client Fetch for Forms

Update client selection in proposal, contract, invoice, AMC pages to fetch from `/api/clients`:

```jsx
// Client search component for forms
const [clients, setClients] = useState([]);

useEffect(() => {
  fetchClients();
}, []);

const fetchClients = async () => {
  try {
    const res = await axios.get(`${API}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setClients(res.data);
  } catch (err) {
    console.error("Failed to fetch clients:", err);
  }
};

// In form
<select name="client_id" value={form.client_id} onChange={handleChange}>
  <option value="">-- Select Client --</option>
  {clients.map(client => (
    <option key={client.id} value={client.id}>
      {client.name} {client.company_name ? `(${client.company_name})` : ""}
    </option>
  ))}
</select>
```

---

## 7. Notification System Design

### 7.1 WebSocket Namespace Design

```javascript
// backend/sockets/notifications.js

// Admin room: all admins receive notifications
// Employee room: specific employee receives their notifications

io.on("connection", (socket) => {
  // Join based on role
  socket.on("join", ({ userId, role }) => {
    socket.join(`user_${userId}`);
    if (role === "admin") {
      socket.join("admins");
    }
  });

  // Join admin notifications room
  socket.on("join_admin", () => {
    socket.join("admin_notifications");
  });

  // Mark notifications as read
  socket.on("mark_read", (notificationId) => {
    db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [notificationId]);
  });
});

// Emit to specific employee
emitToEmployee(employeeId, event, data) {
  this.io.to(`user_${employeeId}`).emit(event, data);
}

// Emit to all admins
emitToAdmins(event, data) {
  this.io.to("admin_notifications").emit(event, data);
}
```

### 7.2 Notification Types and Recipients

| Event | Recipients | Data |
|-------|-----------|------|
| new_lead | Admins | lead_id, customer_name, lead_type, staff_name |
| lead_converted | Admins | lead_id, client_id, customer_name, converted_by |
| reminder_missed | Admins | lead_id, customer_name, employee_id, missed_count |
| escalation_created | Admins | lead_id, employee_id, customer_name, missed_count |
| task_assigned | Assigned Employee | task_id, task_name, due_date, assigned_by |
| task_completed | Admins | task_id, task_name, completed_by |
| new_target | Assigned Employee | target_id, yearly_target, monthly_target |
| target_achieved | Admins | employee_id, target_id, percentage |
| profile_change_requested | Admins | user_id, changes |
| profile_change_approved | Employee | user_id, message |
| profile_change_declined | Employee | user_id, reason |

### 7.3 Frontend Notification Components

```jsx
// frontend/src/context/NotificationContext.jsx

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Connect to socket
      socket.emit("join", { userId: user.id, role: user.role });
      
      if (user.role === "admin") {
        socket.emit("join_admin");
      }

      // Listen for notifications
      socket.on("notification", (data) => {
        if (user.role === "admin" || data.user_id === user.id) {
          setNotifications(prev => [data, ...prev]);
          // Show toast
          toast(data.message);
        }
      });

      socket.on("admin_notification", (data) => {
        if (user.role === "admin") {
          setAdminNotifications(prev => [data, ...prev]);
          toast(data.message);
        }
      });
    }

    return () => {
      socket.off("notification");
      socket.off("admin_notification");
    };
  }, [user]);

  const markAsRead = async (id) => {
    await axios.put(`${API}/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      adminNotifications,
      unreadCount: notifications.filter(n => !n.is_read).length,
      adminUnreadCount: adminNotifications.filter(n => !n.is_read).length,
      markAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

---

## 8. Lead Conversion Flow

### 8.1 Current Flow Issues

1. Conversion only happens when `call_outcome = "Converted"` in telecallRoutes
2. Client record created but not linked back to original lead
3. Other forms don't know client came from lead conversion
4. No tracking of which employee converted the lead

### 8.2 Improved Lead Conversion Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LEAD CREATION                               │
│                                                                     │
│  Employee creates lead via Telecall/Walkin/Field form              │
│  ├── lead stored with teammember_id (FK)                           │
│  ├── employee_id logged in lead_activity                            │
│  └── notification sent to admin: "New lead created"                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LEAD TRACKING                               │
│                                                                     │
│  Employee sets reminders on lead                                    │
│  ├── reminder stored with employee_id                               │
│  ├── each reminder missed increments missed_count                   │
│  ├── after 3 misses: escalation created                            │
│  └── escalation notification sent to admin                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LEAD CONVERSION                             │
│                                                                     │
│  Employee changes outcome to "Converted"                            │
│  ├── syncClient() called with lead data                            │
│  ├── client record created with:                                    │
│  │   ├── original_lead_id (link to original lead)                  │
│  │   ├── original_lead_type (telecall/walkin/field)               │
│  │   ├── assigned_teammember_id (employee who converted)           │
│  │   └── created_by (admin who approved conversion if needed)      │
│  ├── lead.call_outcome updated to "Converted"                      │
│  ├── lead_activity logged: "Lead converted to client"             │
│  └── notification sent to admin: "Lead converted"                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT USAGE                                │
│                                                                     │
│  Other forms (proposal, contract, invoice, AMC) fetch from:         │
│  └── GET /api/clients - unified client list                        │
│      includes both:                                                 │
│      ├── Manually created clients                                   │
│      └── Converted from leads (has original_lead_* fields)         │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Backend Conversion Code (Updated)

```javascript
// In telecallRoutes.js, walkinRoutes.js, fieldRoutes.js

const syncClient = (data, userId, teammemberId) => {
  const { customer_name, mobile_number, location_city, service_name, email, gst_number, call_outcome } = data;

  if (call_outcome === "Converted") {
    // Check if client already exists from this lead
    db.query(
      "SELECT id FROM clients WHERE original_lead_id = ? AND original_lead_type = 'telecall'",
      [data.id],
      (err, existing) => {
        if (err) {
          console.error("Error checking client existence:", err);
          return;
        }

        if (existing.length === 0) {
          // Create new client
          db.query(
            `INSERT INTO clients 
             (name, phone, address, service, email, gst_number, created_by, assigned_teammember_id, original_lead_id, original_lead_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'telecall')`,
            [customer_name, mobile_number, location_city, service_name, email, gst_number || "", userId, teammemberId, data.id],
            (insertErr) => {
              if (insertErr) console.error("Client creation failed:", insertErr);
              else {
                // Emit notification
                const notificationIO = getNotificationIO();
                if (notificationIO) {
                  notificationIO.emitNotification("lead_converted", {
                    leadId: data.id,
                    leadType: "telecall",
                    clientName: customer_name,
                    convertedBy: teammemberId,
                    mobileNumber: mobile_number
                  }, null, true);
                }
              }
            }
          );
        } else {
          // Update existing client
          db.query(
            `UPDATE clients SET 
             name=?, phone=?, address=?, service=?, email=?, gst_number=?, 
             assigned_teammember_id=?
             WHERE original_lead_id = ? AND original_lead_type = 'telecall'`,
            [customer_name, mobile_number, location_city, service_name, email, gst_number || "", teammemberId, data.id]
          );
        }
      }
    );
  }
};
```

---

## 9. Task & Target Assignment Flow

### 9.1 Task Assignment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN CREATES TASK                          │
│                                                                     │
│  Admin selects:                                                     │
│  ├── Project Name, Task Title, Description                          │
│  ├── Assigned Employee (from teammember dropdown)                   │
│  ├── Due Date, Priority                                             │
│  └── Submit                                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TASK STORED                                 │
│                                                                     │
│  Task record created with:                                          │
│  ├── assigned_teammember_id (FK to teammember)                     │
│  ├── staff_name (text for display)                                 │
│  ├── assigned_to (user_id)                                         │
│  ├── created_by (admin user_id)                                    │
│  └── task_activity logged                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATIONS SENT                          │
│                                                                     │
│  1. To Assigned Employee:                                          │
│     └── Event: "task_assigned"                                      │
│         └── Data: task details, due date, priority                 │
│                                                                     │
│  2. To All Admins:                                                 │
│     └── Event: "task_created_admin"                                │
│         └── Data: task assigned to employee                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   EMPLOYEE COMPLETES TASK   │   │   TASK BECOMES OVERDUE       │
│                             │   │                             │
│  Employee marks completed   │   │  Due date passes            │
│  ├── Status = "Completed"   │   │  ├── Status != "Completed"  │
│  ├── task_activity logged   │   │  ├── Admin notified:         │
│  └── Notification sent:     │   │  │   "task_overdue"         │
│      Event: "task_completed"│   │  └── Escalation tracked     │
│      To: All Admins         │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

### 9.2 Target Assignment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ADMIN SETS TARGET                             │
│                                                                     │
│  Admin selects:                                                     │
│  ├── Employee (from teammember dropdown)                           │
│  ├── Yearly Target (INR)                                            │
│  └── Monthly Target auto-calculated (yearly/12)                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TARGET STORED                               │
│                                                                     │
│  Target record created with:                                        │
│  ├── teammember_id (FK to teammember)                              │
│  ├── user_name (text)                                              │
│  ├── yearly_target, monthly_target                                │
│  ├── created_by_admin = true                                       │
│  └── created_at timestamp                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATIONS SENT                          │
│                                                                     │
│  1. To Assigned Employee:                                          │
│     └── Event: "new_target"                                        │
│         └── Data: yearly/monthly target amounts                     │
│                                                                     │
│  2. To All Admins:                                                 │
│     └── Event: "target_created_admin"                              │
│         └── Data: target assigned to employee                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   EMPLOYEE UPDATES          │   │   EMPLOYEE ACHIEVES         │
│   ACHIEVEMENT               │   │   100% OF TARGET            │
│                             │   │                             │
│  Employee submits amount    │   │  Achieved >= Monthly Target │
│  ├── achievement logged     │   │  ├── Notification sent:     │
│  ├── progress tracked       │   │  │   "target_achieved"      │
│  └── admin sees progress    │   │  └── Celebration toast     │
└─────────────────────────────┘   └─────────────────────────────┘
```

---

## 10. Missed Reminder Tracking

### 10.1 Missed Reminder Logic

```javascript
// When reminder is marked as missed
async function markReminderMissed(reminderId) {
  // 1. Get reminder details
  const reminder = await db.query("SELECT * FROM lead_reminders WHERE id = ?", [reminderId]);
  
  // 2. Update reminder status
  await db.query(
    "UPDATE lead_reminders SET status = 'Missed', missed_count = missed_count + 1 WHERE id = ?",
    [reminderId]
  );
  
  // 3. Get total missed count for this lead
  const missedCount = await db.query(
    "SELECT COUNT(*) as total FROM lead_reminders WHERE lead_id = ? AND lead_type = ? AND status = 'Missed'",
    [reminder.lead_id, reminder.lead_type]
  );
  
  // 4. Log activity
  await db.query(
    "INSERT INTO lead_activity (lead_id, lead_type, employee_id, action, details) VALUES (?,?,?,?,?)",
    [reminder.lead_id, reminder.lead_type, reminder.employee_id, "Reminder Missed", `Missed reminder #${missedCount.total}`]
  );
  
  // 5. Check escalation threshold (default: 3)
  if (missedCount.total >= 3) {
    await createEscalation(reminder, missedCount.total);
  }
}

async function createEscalation(reminder, missedCount) {
  // Check if escalation already exists
  const existing = await db.query(
    "SELECT id FROM lead_escalations WHERE lead_id = ? AND lead_type = ? AND status = 'Open'",
    [reminder.lead_id, reminder.lead_type]
  );
  
  if (existing.length > 0) {
    // Update missed count on existing escalation
    await db.query(
      "UPDATE lead_escalations SET missed_count = ?, updated_at = NOW() WHERE id = ?",
      [missedCount, existing[0].id]
    );
    return;
  }
  
  // Get lead details
  const leadTable = reminder.lead_type + "s";
  const lead = await db.query(`SELECT * FROM ${leadTable} WHERE id = ?`, [reminder.lead_id]);
  
  // Create new escalation
  await db.query(
    `INSERT INTO lead_escalations 
     (lead_id, lead_type, employee_id, customer_name, mobile_number, staff_name, missed_count, missed_threshold_reached)
     VALUES (?,?,?,?,?,?,?,1)`,
    [reminder.lead_id, reminder.lead_type, reminder.employee_id, lead[0].customer_name, lead[0].mobile_number, lead[0].staff_name, missedCount]
  );
  
  // Emit notification to admin
  const notificationIO = getNotificationIO();
  if (notificationIO) {
    notificationIO.emitNotification("escalation_created", {
      type: "reminder_escalation",
      lead_id: reminder.lead_id,
      lead_type: reminder.lead_type,
      employee_id: reminder.employee_id,
      employee_name: reminder.staff_name,
      customer_name: lead[0].customer_name,
      missed_count: missedCount,
      message: `Employee ${lead[0].staff_name} has missed ${missedCount} reminders on lead: ${lead[0].customer_name}`
    }, null, true);
  }
}
```

### 10.2 Admin Escalation Dashboard

```jsx
// frontend/src/pages/escalations.jsx

const Escalations = () => {
  const [escalations, setEscalations] = useState([]);
  const [filter, setFilter] = useState("Open");

  useEffect(() => {
    fetchEscalations();
  }, [filter]);

  const fetchEscalations = async () => {
    const res = await axios.get(`${API}/api/leads/escalations?status=${filter}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setEscalations(res.data);
  };

  const resolveEscalation = async (id) => {
    await axios.put(`${API}/api/leads/escalations/${id}/resolve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchEscalations();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Lead Escalations</h2>
      
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter("Open")} className={filter === "Open" ? "bg-red-500 text-white" : "bg-gray-200"}>
          Open
        </button>
        <button onClick={() => setFilter("Resolved")} className={filter === "Resolved" ? "bg-green-500 text-white" : "bg-gray-200"}>
          Resolved
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Customer</th>
            <th>Lead Type</th>
            <th>Missed Count</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {escalations.map(e => (
            <tr key={e.id}>
              <td>{e.employee_name}</td>
              <td>{e.customer_name}</td>
              <td>{e.lead_type}</td>
              <td className="text-red-600 font-bold">{e.missed_count}</td>
              <td>
                <span className={`px-2 py-1 rounded ${e.status === 'Open' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {e.status}
                </span>
              </td>
              <td>
                {e.status === 'Open' && (
                  <button onClick={() => resolveEscalation(e.id)} className="bg-green-500 text-white px-3 py-1 rounded">
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 11. Implementation Phases

### Phase 1: Database Updates (Day 1)
1. Run migration to add foreign keys
2. Create new tables (escalation_rules, notification_delivery)
3. Add indexes for performance
4. Verify all existing data preserved

### Phase 2: Backend Routes Update (Day 2-3)
1. Update team.js - make GET / public
2. Update newclient.js - add teammember linking
3. Update leadManagementRoutes.js - add escalation logic
4. Update taskRoutes.js - add notifications
5. Create notificationRoutes.js

### Phase 3: Frontend Updates (Day 4-5)
1. Create StaffSelect component
2. Update all forms using staff dropdown
3. Update notification context for role-based filtering
4. Create escalations page
5. Update client forms to fetch from unified client list

### Phase 4: Testing (Day 6-7)
1. Test lead creation and conversion
2. Test task assignment and notifications
3. Test target assignment and notifications
4. Test missed reminder escalation
5. Test role-based notification visibility

---

## 12. Migration Scripts

### 12.1 Main Migration File

Create: `backend/migrations/enhance_employee_tracking.js`

```javascript
require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true
});

const migrations = [
  // Add foreign keys to leads tables
  { sql: "ALTER TABLE Telecalls ADD COLUMN teammember_id INT DEFAULT NULL", name: "Telecalls.team-member_id" },
  { sql: "ALTER TABLE Walkins ADD COLUMN teammember_id INT DEFAULT NULL", name: "Walkins.team-member_id" },
  { sql: "ALTER TABLE Fields ADD COLUMN teammember_id INT DEFAULT NULL", name: "Fields.team-member_id" },
  
  // Add foreign keys to tasks
  { sql: "ALTER TABLE tasks ADD COLUMN teammember_id INT DEFAULT NULL", name: "tasks.team-member_id" },
  { sql: "ALTER TABLE tasks ADD COLUMN assigned_teammember_id INT DEFAULT NULL", name: "tasks.assigned_team-member_id" },
  
  // Add employee tracking to reminders
  { sql: "ALTER TABLE lead_reminders ADD COLUMN employee_id INT DEFAULT NULL", name: "lead_reminders.employee_id" },
  { sql: "ALTER TABLE lead_activity ADD COLUMN employee_id INT DEFAULT NULL", name: "lead_activity.employee_id" },
  { sql: "ALTER TABLE lead_escalations ADD COLUMN employee_id INT DEFAULT NULL", name: "lead_escalations.employee_id" },
  
  // Add target employee tracking
  { sql: "ALTER TABLE task_targets ADD COLUMN teammember_id INT DEFAULT NULL", name: "task_targets.team-member_id" },
  { sql: "ALTER TABLE task_assignments ADD COLUMN teammember_id INT DEFAULT NULL", name: "task_assignments.team-member_id" },
  
  // Add client lead reference
  { sql: "ALTER TABLE clients ADD COLUMN original_lead_id INT DEFAULT NULL", name: "clients.original_lead_id" },
  { sql: "ALTER TABLE clients ADD COLUMN original_lead_type VARCHAR(20) DEFAULT NULL", name: "clients.original_lead_type" },
  { sql: "ALTER TABLE clients ADD COLUMN assigned_teammember_id INT DEFAULT NULL", name: "clients.assigned_team-member_id" },
  
  // Add missed threshold tracking
  { sql: "ALTER TABLE lead_escalations ADD COLUMN missed_threshold_reached TINYINT(1) DEFAULT 0", name: "lead_escalations.missed_threshold" },
  
  // Create new tables
  { sql: `CREATE TABLE IF NOT EXISTS employee_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    action_type ENUM('login','logout','lead_created','lead_updated','task_completed','target_updated','reminder_set','reminder_missed') NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_action_type (action_type)
  )`, name: "employee_activity_log table" },

  { sql: `CREATE TABLE IF NOT EXISTS escalation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_type ENUM('reminder_missed','task_overdue','target_missed') NOT NULL,
    threshold_count INT NOT NULL,
    escalate_to_role VARCHAR(50) DEFAULT 'admin',
    notify_creator TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, name: "escalation_rules table" },

  { sql: `INSERT INTO escalation_rules (rule_type, threshold_count, escalate_to_role, notify_creator, is_active)
          VALUES ('reminder_missed', 3, 'admin', 1, 1)`, name: "default escalation rule" }
];

let completed = 0;
let failed = 0;

migrations.forEach(({ sql, name }) => {
  db.query(sql, (err) => {
    if (err && !err.message.includes("Duplicate column") && !err.message.includes("already exists") && !err.message.includes("Duplicate entry")) {
      console.error(`❌ ${name}: ${err.message.split("\n")[0]}`);
      failed++;
    } else {
      console.log(`✅ ${name}`);
      completed++;
    }
    
    if (completed + failed === migrations.length) {
      console.log(`\nMigration complete: ${completed} succeeded, ${failed} failed`);
      db.end();
      process.exit(failed > 0 ? 1 : 0);
    }
  });
});
```

---

## 13. Testing Checklist

### 13.1 Employee Tracking Tests

- [ ] Create lead - verify teammember_id stored
- [ ] Create task - verify assigned_teammember_id stored
- [ ] Create target - verify teammember_id stored
- [ ] Set reminder - verify employee_id stored
- [ ] View lead details - verify employee name displayed

### 13.2 Client Conversion Tests

- [ ] Convert telecall lead - verify client created with original_lead_id
- [ ] Convert walkin lead - verify client created with original_lead_id
- [ ] Convert field lead - verify client created with original_lead_id
- [ ] Fetch clients in proposal form - verify converted clients appear
- [ ] Fetch clients in invoice form - verify converted clients appear
- [ ] Fetch clients in contract form - verify converted clients appear

### 13.3 Notification Tests

- [ ] New lead created - admin receives notification
- [ ] Task assigned - assigned employee receives notification
- [ ] Task completed - admin receives notification
- [ ] Target set - assigned employee receives notification
- [ ] Target achieved 100% - admin receives notification
- [ ] Reminder missed 3 times - admin receives escalation notification

### 13.4 Role-Based Access Tests

- [ ] Employee views only their notifications
- [ ] Admin views all notifications
- [ ] Employee cannot access admin-only routes
- [ ] Admin can access all routes

### 13.5 Escalation Tests

- [ ] Miss 1 reminder - no escalation
- [ ] Miss 2 reminders - no escalation
- [ ] Miss 3 reminders - escalation created, admin notified
- [ ] Resolve escalation - employee notified
- [ ] Miss more reminders on escalated lead - count updated

---

## 14. Summary of Changes

### Backend Files to Update

| File | Changes |
|------|---------|
| backend/routes/team.js | Make GET / public, add by-user endpoint |
| backend/routes/newclient.js | Add teammember linking, converted-from endpoint |
| backend/routes/leadManagementRoutes.js | Add escalation logic, employee tracking |
| backend/routes/taskRoutes.js | Add notifications on create/complete |
| backend/routes/telecallRoutes.js | Update syncClient with teammember_id |
| backend/routes/walkinRoutes.js | Update syncClient with teammember_id |
| backend/routes/fieldRoutes.js | Update syncClient with teammember_id |
| backend/routes/notificationRoutes.js | Create new consolidated notification routes |

### New Backend Files

| File | Purpose |
|------|---------|
| backend/migrations/enhance_employee_tracking.js | Add all foreign keys and new tables |
| backend/routes/notificationRoutes.js | Consolidated notification handling |

### Frontend Files to Update

| File | Changes |
|------|---------|
| frontend/src/components/StaffSelect.jsx | Create reusable component |
| frontend/src/context/NotificationContext.jsx | Role-based notification filtering |
| frontend/src/pages/escalations.jsx | Create new page for escalations |
| frontend/src/pages/task.jsx | Already working - ensure consistency |
| frontend/src/pages/target.jsx | Already working - ensure consistency |
| frontend/src/pages/clients.jsx | Add teammember dropdown |
| frontend/src/pages/proposal.jsx | Fetch clients from /api/clients |
| frontend/src/pages/invoice.jsx | Fetch clients from /api/clients |
| frontend/src/pages/contract.jsx | Fetch clients from /api/clients |
| frontend/src/pages/amc.jsx | Fetch clients from /api/clients |

### Database Changes

| Change | Type |
|--------|------|
| Add teammember_id to Telecalls, Walkins, Fields | Column |
| Add teammember_id, assigned_teammember_id to tasks | Column |
| Add employee_id to lead_reminders, lead_activity, lead_escalations | Column |
| Add teammember_id to task_targets, task_assignments | Column |
| Add original_lead_id, original_lead_type, assigned_teammember_id to clients | Column |
| Create employee_activity_log table | Table |
| Create escalation_rules table | Table |
| Add indexes for performance | Index |

---

## 15. Rollback Plan

If issues arise during implementation:

1. **Database Rollback**: Restore from backup before migration
2. **Route Rollback**: Revert to previous version of affected route files
3. **Frontend Rollback**: Revert to previous version of affected component files

All changes are backwards compatible - the new columns are nullable and default to NULL, so existing functionality will continue to work while new features are gradually implemented.

---

## 16. Future Enhancements

1. **Performance Monitoring**: Track employee productivity metrics
2. **Automated Reminders**: Cron job to auto-mark missed reminders
3. **Email Notifications**: Send email for critical escalations
4. **Mobile Push Notifications**: Integrate with mobile app
5. **Analytics Dashboard**: Employee performance reports

---

*Document created for ACHME Communication CRM System*
*Last updated: May 2026*