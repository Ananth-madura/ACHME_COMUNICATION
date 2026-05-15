const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { generateOtp } = require("../backendutil/otp");
const sendEmailOtp = require("../backendutil/sendSms");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

const getNotificationIO = () => {
  try {
    const app = require("../server");
    return app.get("notificationIO");
  } catch (e) {
    return null;
  }
};

const fieldLabels = {
  first_name: "Name",
  email: "Email",
  mobile_number: "Mobile Number",
  emp_address: "Address",
  password: "Password"
};

/* ================= GET ALL USERS (for admin) ================= */
router.get("/users", verifyToken, (req, res) => {
  db.query(`SELECT id, first_name, email, role, status, emp_id, created_at FROM users ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch users" });
    res.json({ users: rows });
  });
});

/* ================= SEND EMAIL OTP ================= */
router.post("/send-email-otp", (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  const otp = generateOtp();
  const expires = new Date(Date.now() + 5 * 60000);

  db.query(
    `INSERT INTO email_otp (email, otp, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE otp=?, expires_at=?`,
    [email, otp, expires, otp, expires],
    async (err) => {
      if (err) {
        console.error("send-email-otp db error:", err.message);
        return res.status(500).json({ message: "OTP failed" });
      }

      try {
        await sendEmailOtp(email, otp);
        res.json({ message: "OTP sent to email" });
      } catch (mailErr) {
        console.error("send-email-otp mail error:", mailErr.message);
        return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
      }
    }
  );
});

/*  REGISTER  */
router.post("/register", async (req, res) => {
  const { first_name, otp, user_password, emp_id } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  if (!first_name || !email || !otp || !user_password || !emp_id) {
    return res.status(400).json({ message: "All fields required (Name, Email, Employee ID, OTP, Password)" });
  }

  db.query(
    `SELECT * FROM email_otp WHERE email=? AND otp=? AND expires_at > NOW()`,
    [email, otp],
    async (err, rows) => {
      if (!rows || !rows.length) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      const hash = await bcrypt.hash(user_password, 10);
      const userRole = "employee";
      const status = "pending";

      db.query(
        `INSERT INTO users (first_name, email, user_password, role, status, emp_id) VALUES (?,?,?,?,?,?)`,
        [first_name.trim(), email, hash, userRole, status, emp_id.trim()],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(409).json({ message: "Email already registered" });
            }
            if (err.code === "ER_DUP_ENTRY" && err.message.includes("emp_id")) {
              return res.status(409).json({ message: "Employee ID already registered" });
            }
            return res.status(500).json({ message: "Server error" });
          }

          const newUserId = result.insertId;
          db.query(`DELETE FROM email_otp WHERE email=?`, [email]);

          db.query(
            `INSERT INTO teammember (first_name, emp_email, emp_id, job_title, emp_role, user_id) VALUES (?,?,?,?,?,?)`,
            [first_name.trim(), email, emp_id.trim(), "Sales", "Sales", newUserId]
          );

          db.query(
            `INSERT INTO admin_notifications (type, user_id, message) VALUES ('registration', ?, ?)`,
            [newUserId, `New employee registration: ${first_name} (${email}, EMP: ${emp_id}) is waiting for approval.`]
          );

          const notificationIO = getNotificationIO();
          if (notificationIO) {
            notificationIO.sendToAdmin("new_notification", {
              dbId: newUserId,
              type: "registration",
              timestamp: new Date().toISOString(),
              is_read: 0,
              data: {
                id: newUserId,
                userId: newUserId,
                userName: first_name,
                email,
                emp_id: emp_id,
                type: "user",
                message: `New employee registration: ${first_name} (${email}, EMP: ${emp_id}) is waiting for approval.`
              },
              userId: newUserId,
              message: `New employee registration: ${first_name} (${email}, EMP: ${emp_id}) is waiting for approval.`
            });
          }

          res.json({ message: "Registration successful. Your account is pending admin approval." });
        }
      );
    }
  );
});

/* ================= ADMIN LOGIN ================= */
router.post("/admin-login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  const emailLower = email.trim().toLowerCase();

  db.query(
    `SELECT id, first_name, last_name, email, role, status, user_password FROM users WHERE email=? OR emp_id=?`,
    [emailLower, emailLower],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(404).json({ message: "No account found" });
      }

      const user = rows[0];
      if (user.role !== "admin") return res.status(403).json({ message: "Access denied. Admin only." });
      if (user.status !== "active") return res.status(403).json({ message: "Account is not active" });

      bcrypt.compare(password, user.user_password, (err, match) => {
        if (err || !match) return res.status(401).json({ message: "Invalid password" });
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "14d" });
        return res.json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role } });
      });
    }
  );
});

/* ================= LOGIN with Password or OTP ================= */
router.post("/login", (req, res) => {
  const { email, password, otp } = req.body;
  if (!email) return res.status(400).json({ message: "Email / Employee Code required" });
  const emailLower = email.trim().toLowerCase();

  db.query(
    `SELECT id, first_name, last_name, email, role, status, user_password FROM users WHERE email=? OR emp_id=?`,
    [emailLower, emailLower],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(404).json({ message: "No account found with this email or employee code" });
      }

      const user = rows[0];
      if (user.status === "pending") return res.status(403).json({ message: "Account waiting for admin approval" });
      if (user.status === "banned") return res.status(403).json({ message: "Account has been banned" });

      if (password) {
        bcrypt.compare(password, user.user_password, (err, match) => {
          if (err || !match) return res.status(401).json({ message: "Invalid password" });
          const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "14d" });
          return res.json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role } });
        });
        return;
      }

      if (!otp) return res.status(400).json({ message: "Please provide OTP or password" });

      db.query(`SELECT * FROM email_otp WHERE email=? AND otp=? AND expires_at > NOW()`, [emailLower, otp], (err2, otpRows) => {
        if (err2 || !otpRows.length) return res.status(401).json({ message: "Invalid or expired OTP" });
        db.query(`DELETE FROM email_otp WHERE email=?`, [emailLower]);
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "14d" });
        return res.json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role } });
      });
    }
  );
});

/* ================= ADMIN: CREATE USER ================= */
router.post("/create-user", isAdmin, (req, res) => {
  const { first_name, email, emp_id, job_title, emp_role, mobile_number, emp_address, user_password, system_role } = req.body;
  if (!first_name || !email || !user_password) return res.status(400).json({ message: "Name, email and password required" });

  const role = system_role || "employee";
  bcrypt.hash(user_password, 10, (err, hash) => {
    if (err) return res.status(500).json({ message: "Password hash failed" });

    db.query(`INSERT INTO users (first_name, email, user_password, role, status) VALUES (?, ?, ?, ?, ?)`,
      [first_name, email.toLowerCase(), hash, role, "active"], (err2, result) => {
        if (err2) {
          if (err2.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already exists" });
          return res.status(500).json({ message: "User creation failed" });
        }

        db.query(`INSERT INTO teammember (first_name, last_name, emp_email, emp_id, job_title, emp_role, mobile_number, emp_address) VALUES (?, '', ?, ?, ?, ?, ?, ?)`,
          [first_name, email.toLowerCase(), emp_id || null, job_title || "Developer", emp_role || "Developer", mobile_number || null, emp_address || null]);

        res.json({ message: "User created successfully", userId: result.insertId });
      });
  });
});

/* ================= ADMIN: UPDATE USER ================= */
router.put("/update-user/:id", isAdmin, (req, res) => {
  const { first_name, email, emp_id, job_title, emp_role, mobile_number, emp_address, role } = req.body;

  db.query(`SELECT email FROM users WHERE id = ?`, [req.params.id], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: "User not found" });
    const oldEmail = rows[0].email;

    db.query(`UPDATE users SET first_name = ?, email = ?, role = ? WHERE id = ?`, [first_name, email?.toLowerCase() || oldEmail, role || "employee", req.params.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Update failed" });

      db.query(`UPDATE teammember SET first_name = ?, emp_email = ?, emp_id = ?, job_title = ?, emp_role = ?, mobile_number = ?, emp_address = ? WHERE emp_email = ?`,
        [first_name, email?.toLowerCase() || oldEmail, emp_id || null, job_title || "Developer", emp_role || "Developer", mobile_number || null, emp_address || null, oldEmail]);

      res.json({ message: "User updated successfully" });
    });
  });
});

/* ================= ADMIN: CHANGE USER ROLE (Sub-Admin) ================= */
router.put("/change-role/:id", isAdmin, (req, res) => {
  const { role } = req.body;
  if (!["admin", "subadmin", "employee"].includes(role)) {
    return res.status(400).json({ message: "Invalid role. Must be admin, subadmin, or employee" });
  }
  db.query(`UPDATE users SET role = ? WHERE id = ?`, [role, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Role update failed" });
    res.json({ message: `Role updated to ${role}` });
  });
});

/* ================= ADMIN: BAN USER ================= */
router.put("/ban-user/:id", isAdmin, (req, res) => {
  const { status } = req.body;
  if (!["active", "banned", "pending"].includes(status)) return res.status(400).json({ message: "Invalid status" });

  db.query(`UPDATE users SET status = ? WHERE id = ?`, [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Update failed" });
    res.json({ message: "User status updated" });
  });
});

/* ================= ADMIN: DELETE USER ================= */
router.delete("/delete-user/:id", isAdmin, (req, res) => {
  db.query(`SELECT email FROM users WHERE id = ?`, [req.params.id], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: "User not found" });

    db.query(`DELETE FROM users WHERE id = ?`, [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Delete failed" });
      db.query(`DELETE FROM teammember WHERE emp_email = ?`, [rows[0].email]);
      res.json({ message: "User deleted" });
    });
  });
});

/* ================= ADMIN: RESET PASSWORD ================= */
router.post("/reset-password/:id", isAdmin, (req, res) => {
  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ message: "New password required" });

  bcrypt.hash(new_password, 10, (err, hash) => {
    if (err) return res.status(500).json({ message: "Hash failed" });
    db.query(`UPDATE users SET user_password = ? WHERE id = ?`, [hash, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Reset failed" });
      res.json({ message: "Password reset successfully" });
    });
  });
});

/* ================= ADMIN: GET REGISTRATION NOTIFICATIONS ================= */
router.get("/notifications", verifyToken, isAdmin, (req, res) => {
  const { type, limit } = req.query;
  const params = [];
  let sql = `SELECT an.*, u.first_name, u.email, u.role, u.emp_id, u.status as user_status 
             FROM admin_notifications an 
             LEFT JOIN users u ON an.user_id = u.id 
             WHERE 1=1`;

  if (type) { sql += " AND an.type = ?"; params.push(type); }
  sql += " ORDER BY an.created_at DESC";
  if (limit) { sql += " LIMIT ?"; params.push(parseInt(limit)); }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ================= ADMIN: APPROVE/REJECT USER ================= */
router.put("/approve/:userId", verifyToken, isAdmin, (req, res) => {
  const { action } = req.body;
  const { userId } = req.params;
  if (!["active", "rejected"].includes(action)) return res.status(400).json({ message: "Invalid action" });

  db.query("UPDATE users SET status = ? WHERE id = ?", [action, userId], (err) => {
    if (err) return res.status(500).json({ message: "Update failed" });

    if (action === "active") {
      db.query("UPDATE admin_notifications SET is_read = 1 WHERE user_id = ? AND type = 'registration'", [userId]);
      const userRes = db.query("SELECT first_name, email FROM users WHERE id = ?", [userId], (e2, rows) => {
        if (!e2 && rows.length) {
          const notificationIO = getNotificationIO();
          if (notificationIO) {
            notificationIO.sendToUser(rows[0].id, "new_notification", {
              dbId: rows[0].id,
              type: "registration_approved",
              timestamp: new Date().toISOString(),
              is_read: 0,
              data: {
                message: "Your account has been approved. You can now log in.",
                type: "registration_approved"
              }
            });
          }
        }
      });
    } else {
      db.query("UPDATE admin_notifications SET is_read = 1 WHERE user_id = ? AND type = 'registration'", [userId]);
    }

    res.json({ message: `User ${action === "active" ? "approved" : "rejected"} successfully` });
  });
});

/* ================= ADMIN: GET PROFILE CHANGE REQUESTS ================= */
router.get("/profile-change-requests", verifyToken, isAdmin, (req, res) => {
  db.query(
    `SELECT pcr.*, u.first_name, u.email 
     FROM profile_change_requests pcr 
     LEFT JOIN users u ON pcr.user_id = u.id 
     ORDER BY pcr.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ================= ADMIN: HANDLE PROFILE CHANGE REQUEST ================= */
router.put("/handle-change-request/:requestId", verifyToken, isAdmin, (req, res) => {
  const { action } = req.body;
  const { requestId } = req.params;
  if (!["approved", "declined"].includes(action)) return res.status(400).json({ message: "Invalid action" });

  db.query("SELECT * FROM profile_change_requests WHERE id = ?", [requestId], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: "Request not found" });
    const req_data = rows[0];

    if (action === "approved") {
      const fieldMap = {
        first_name: "first_name",
        email: "email",
        mobile_number: "mobile_number",
        emp_address: "emp_address",
        password: "user_password"
      };
      const dbField = fieldMap[req_data.field];
      if (dbField) {
        if (dbField === "user_password") {
          bcrypt.hash(req_data.new_value, 10, (hashErr, hash) => {
            if (hashErr) return res.status(500).json({ message: "Hash failed" });
            db.query("UPDATE users SET ?? = ? WHERE id = ?", [dbField, hash, req_data.user_id], (upErr) => {
              if (upErr) return res.status(500).json({ message: "Update failed" });
            });
          });
        } else if (["mobile_number"].includes(dbField)) {
          db.query("UPDATE teammember SET ?? = ? WHERE user_id = ?", [dbField, req_data.new_value, req_data.user_id]);
        } else {
          db.query("UPDATE users SET ?? = ? WHERE id = ?", [dbField, req_data.new_value, req_data.user_id], (upErr, upRes) => {
            if (upErr) return res.status(500).json({ message: "Update failed" });
            if (dbField === "email") {
              db.query("UPDATE teammember SET emp_email = ? WHERE user_id = ?", [req_data.new_value, req_data.user_id]);
            }
          });
        }
      }
      db.query("UPDATE profile_change_requests SET status = ? WHERE id = ?", [action, requestId]);
    } else {
      db.query("UPDATE profile_change_requests SET status = ? WHERE id = ?", [action, requestId]);
    }

    const notificationIO = getNotificationIO();
    if (notificationIO) {
      notificationIO.sendToUser(req_data.user_id, "new_notification", {
        type: action === "approved" ? "profile_change_approved" : "profile_change_declined",
        timestamp: new Date().toISOString(),
        is_read: 0,
        data: {
          message: `Your profile change request (${req_data.field}) has been ${action}.`,
          field: req_data.field
        }
      });
    }

    res.json({ message: `Request ${action}` });
  });
});

module.exports = router;
