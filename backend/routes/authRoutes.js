const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { generateOtp } = require("../backendutil/otp");
const sendEmailOtp = require("../backendutil/sendSms");
const { isAdmin } = require("../middileware/authMiddleware");

const router = express.Router();

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
  const { first_name, otp, user_password, role } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  if (!first_name || !email || !otp || !user_password) {
    return res.status(400).json({ message: "All fields required" });
  }

  db.query(
    `SELECT * FROM email_otp WHERE email=? AND otp=? AND expires_at > NOW()`,
    [email, otp],
    async (err, rows) => {
      if (!rows || !rows.length) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      const hash = await bcrypt.hash(user_password, 10);
      const userRole = role || "user";
      // All new registrations start as pending — admin must approve
      const status = "pending";

      db.query(
        `INSERT INTO users (first_name, email, user_password, role, status) VALUES (?,?,?,?,?)`,
        [first_name, email, hash, userRole, status],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(409).json({ message: "Email already registered" });
            }
            return res.status(500).json({ message: "Server error" });
          }

          const newUserId = result.insertId;
          db.query(`DELETE FROM email_otp WHERE email=?`, [email]);

          // Create admin notification
          db.query(
            `INSERT INTO admin_notifications (type, user_id, message) VALUES ('registration', ?, ?)`,
            [newUserId, `New ${userRole} registration: ${first_name} (${email}) is waiting for approval.`]
          );

          res.json({ message: "Registration successful. Your account is pending admin approval." });
        }
      );
    }
  );
});

/*  LOGIN (EMAIL + OTP) */
router.post("/login", (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  // First check if the user account exists at all
  db.query(`SELECT id, first_name, email, role, status FROM users WHERE email=?`, [email], (err, userRows) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (!userRows.length) {
      return res.status(404).json({ message: "No account found with this email. Please register first." });
    }

    const user = userRows[0];

    // Check status before OTP
    if (user.status === "pending") {
      return res.status(403).json({ message: "Your account is waiting for admin approval. Please wait for confirmation." });
    }
    if (user.status === "rejected") {
      return res.status(403).json({ message: "Your account access has been rejected. Please contact the admin." });
    }

    // Now verify OTP
    db.query(
      `SELECT * FROM email_otp WHERE email=? AND otp=? AND expires_at > NOW()`,
      [email.trim().toLowerCase(), otp],
      (err2, otpRows) => {
        if (err2) return res.status(500).json({ message: "Server error" });

        if (!otpRows.length) {
          return res.status(401).json({ message: "Invalid or expired OTP. Please request a new one." });
        }

        const token = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "14d" }
        );

        db.query(`DELETE FROM email_otp WHERE email=?`, [email]);

        res.json({
          token,
          user: { id: user.id, name: user.first_name, email: user.email, role: user.role },
        });
      }
    );
  });
});

/* ================= GET ALL USERS ================= */

router.get("/users", (req, res) => {
  const query = `
    SELECT u.id, u.first_name, t.job_title AS position, t.emp_role AS empRole, u.role AS systemRole
    FROM users u LEFT JOIN teammember t ON u.email = t.emp_email
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
  });
});

/* ================= ADMIN: PENDING REGISTRATIONS ================= */

router.get("/pending-users", (req, res) => {
  db.query(
    `SELECT id, first_name, email, role, status, created_at FROM users WHERE status='pending' ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(rows);
    }
  );
});

/* ================= ADMIN: APPROVE / REJECT ================= */

router.put("/approve/:id", (req, res) => {
  const { action } = req.body; // "active" or "rejected"
  if (!["active", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }
  
  // First get the user's email before updating
  db.query(`SELECT email, first_name FROM users WHERE id=?`, [req.params.id], (err, userRows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!userRows.length) return res.status(404).json({ message: "User not found" });
    
    const userEmail = userRows[0].email;
    const userName = userRows[0].first_name;
    
    db.query(`UPDATE users SET status=? WHERE id=?`, [action, req.params.id], (err) => {
      if (err) return res.status(500).json({ message: "DB error" });
      
      // If approved (active), add to team
      if (action === "active") {
        db.query(`SELECT id FROM teammember WHERE emp_email=?`, [userEmail], (err, teamRows) => {
          if (teamRows.length === 0) {
            db.query(
              `INSERT INTO teammember (first_name, last_name, emp_email, job_title, emp_role) VALUES (?, '', ?, ?, ?)`,
              [userName, userEmail, "Developer", "Developer"]
            );
          }
        });
      }
      
      // Mark notification as read
      db.query(`UPDATE admin_notifications SET is_read=1 WHERE user_id=?`, [req.params.id]);
      res.json({ message: `User ${action}` });
    });
  });
});

/* ================= ADMIN: NOTIFICATIONS ================= */

router.get("/notifications", (req, res) => {
  db.query(
    `SELECT n.id, n.type, n.message, n.is_read, n.created_at, n.user_id,
            u.first_name, u.email, u.role, u.status
     FROM admin_notifications n
     INNER JOIN users u ON u.id = n.user_id
     ORDER BY n.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error", error: err.message });
      res.json(rows);
    }
  );
});

router.put("/notifications/:id/read", (req, res) => {
  db.query(`UPDATE admin_notifications SET is_read=1 WHERE id=?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Marked read" });
  });
});

/* ================= ADMIN LOGIN (EMAIL + PASSWORD) ================= */
router.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  const ADMIN_EMAIL = "admin@madhura.com";
  const ADMIN_PASSWORD = "admin@123#";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: 0, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "14d" }
  );

  res.json({
    token,
    user: { id: 0, name: "Admin", email: ADMIN_EMAIL, role: "admin" },
  });
});

/* ================= LOGIN with Password or OTP ================= */
router.post("/login", (req, res) => {
  const { email, password, otp } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  const emailLower = email.trim().toLowerCase();

  db.query(`SELECT id, first_name, email, role, status, user_password FROM users WHERE email=?`, [emailLower], (err, rows) => {
    if (err || !rows.length) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const user = rows[0];
    if (user.status === "pending") return res.status(403).json({ message: "Account waiting for admin approval" });
    if (user.status === "banned") return res.status(403).json({ message: "Account has been banned" });

    // Password login
    if (password) {
      bcrypt.compare(password, user.user_password, (err, match) => {
        if (err || !match) return res.status(401).json({ message: "Invalid password" });
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "14d" });
        return res.json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role } });
      });
      return;
    }

    // OTP login
    if (!otp) return res.status(400).json({ message: "Please provide OTP or password" });

    db.query(`SELECT * FROM email_otp WHERE email=? AND otp=? AND expires_at > NOW()`, [emailLower, otp], (err2, otpRows) => {
      if (err2 || !otpRows.length) return res.status(401).json({ message: "Invalid or expired OTP" });

      db.query(`DELETE FROM email_otp WHERE email=?`, [emailLower]);
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "14d" });
      return res.json({ token, user: { id: user.id, name: user.first_name, email: user.email, role: user.role } });
    });
  });
});

/* ================= ADMIN: CREATE USER ================= */
router.post("/create-user", isAdmin, (req, res) => {
  const { first_name, email, emp_id, job_title, emp_role, mobile_number, emp_address, user_password } = req.body;
  if (!first_name || !email || !user_password) return res.status(400).json({ message: "Name, email and password required" });

  bcrypt.hash(user_password, 10, (err, hash) => {
    if (err) return res.status(500).json({ message: "Password hash failed" });

    db.query(`INSERT INTO users (first_name, email, user_password, role, status) VALUES (?, ?, ?, ?, ?)`,
      [first_name, email.toLowerCase(), hash, "employee", "active"], (err2, result) => {
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
  const { first_name, email, emp_id, job_title, emp_role, mobile_number, emp_address } = req.body;

  db.query(`SELECT email FROM users WHERE id = ?`, [req.params.id], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: "User not found" });
    const oldEmail = rows[0].email;

    db.query(`UPDATE users SET first_name = ?, email = ? WHERE id = ?`, [first_name, email?.toLowerCase() || oldEmail, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Update failed" });

      db.query(`UPDATE teammember SET first_name = ?, emp_email = ?, emp_id = ?, job_title = ?, emp_role = ?, mobile_number = ?, emp_address = ? WHERE emp_email = ?`,
        [first_name, email?.toLowerCase() || oldEmail, emp_id || null, job_title || "Developer", emp_role || "Developer", mobile_number || null, emp_address || null, oldEmail]);

      res.json({ message: "User updated successfully" });
    });
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

module.exports = router;
