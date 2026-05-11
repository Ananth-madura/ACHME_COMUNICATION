const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { generateOtp } = require("../backendutil/otp");
const sendEmailOtp = require("../backendutil/sendSms");
const { verifyToken, isAdmin } = require("../middileware/authMiddleware");

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
                type: "user",
                message: `New ${userRole} registration: ${first_name} (${email}) is waiting for approval.`
              },
              userId: newUserId,
              message: `New ${userRole} registration: ${first_name} (${email}) is waiting for approval.`
            });
          }

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
  
    // First get the user's email, name and role before updating
    db.query(`SELECT email, first_name, role FROM users WHERE id=?`, [req.params.id], (err, userRows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!userRows.length) return res.status(404).json({ message: "User not found" });
      
      const userEmail = userRows[0].email;
      const userName = userRows[0].first_name;
      const userRole = userRows[0].role || 'employee';
      
      db.query(`UPDATE users SET status=? WHERE id=?`, [action, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "DB error" });
        
        // If approved (active), add to team
        if (action === "active") {
          db.query(`SELECT id FROM teammember WHERE emp_email=? OR user_id=?`, [userEmail, req.params.id], (err, teamRows) => {
            if (err) {
              console.error("Error checking team member:", err.message);
            } else if (teamRows.length === 0) {
              // Create new team member entry
              const jobTitle = userRole === 'admin' ? 'Administrator' : 'Team Member';
              const empRole = userRole === 'admin' ? 'BDM' : 'Developer'; // Default to something in the current enum
              
              db.query(
                `INSERT INTO teammember (first_name, last_name, emp_email, job_title, emp_role, user_id) VALUES (?, '', ?, ?, ?, ?)`,
                [userName, userEmail, jobTitle, empRole, req.params.id],
                (insertErr, insertResult) => {
                  if (insertErr) {
                    console.error("Error adding user to team:", insertErr.message);
                  } else {
                    console.log(`User ${userName} added to team with ID: ${insertResult.insertId}`);
                  }
                }
              );
            } else {
              // Update existing team member with user_id if missing
              db.query(`UPDATE teammember SET user_id=? WHERE emp_email=? AND (user_id IS NULL OR user_id = 0)`, [req.params.id, userEmail]);
            }
          });
        }
      
      // Mark notification as read
      db.query(`UPDATE admin_notifications SET is_read=1 WHERE user_id=?`, [req.params.id]);

      const notificationIO = getNotificationIO();
      if (notificationIO) {
        notificationIO.emitNotification(action === "active" ? "registration_approved" : "registration_declined", {
          id: req.params.id,
          userId: req.params.id,
          userName,
          type: "user",
          message: action === "active"
            ? "Your account has been approved. You can now log in."
            : "Your account request was declined. Please contact admin."
        }, req.params.id, false);
      }

      res.json({ message: `User ${action}` });
    });
  });
});

/* ================= USER PROFILE ================= */

router.get("/profile", verifyToken, (req, res) => {
  if (req.user.role === "admin" && Number(req.user.id) === 0) {
    return res.json({
      id: 0,
      first_name: "Admin",
      email: "admin@madhura.com",
      role: "admin",
      status: "active",
      job_title: "Administrator",
      emp_role: "Admin"
    });
  }

  db.query(
    `SELECT u.id, u.first_name, u.email, u.role, u.status, u.created_at,
            t.job_title, t.emp_role,
            COALESCE(t.mobile_number, t.mobile) AS mobile_number,
            t.emp_address
     FROM users u
     LEFT JOIN teammember t ON t.emp_email = u.email
     WHERE u.id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error", error: err.message });
      if (!rows.length) return res.status(404).json({ message: "Profile not found" });
      res.json(rows[0]);
    }
  );
});

router.put("/profile", verifyToken, (req, res) => {
  const { first_name, mobile_number, emp_address } = req.body;
  if (!first_name?.trim()) return res.status(400).json({ message: "Name is required" });

  db.query("SELECT email FROM users WHERE id=?", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!rows.length) return res.status(404).json({ message: "Profile not found" });

    db.query("UPDATE users SET first_name=? WHERE id=?", [first_name.trim(), req.user.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Profile update failed" });

      db.query(
        "UPDATE teammember SET first_name=?, mobile_number=?, emp_address=? WHERE emp_email=?",
        [first_name.trim(), mobile_number || null, emp_address || null, rows[0].email]
      );

      res.json({ message: "Profile updated successfully" });
    });
  });
});

router.get("/my-change-requests", verifyToken, (req, res) => {
  db.query(
    "SELECT id, field, status, created_at, admin_response_at FROM profile_change_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error", error: err.message });
      res.json(rows);
    }
  );
});

router.post("/request-profile-change", verifyToken, (req, res) => {
  const { field, new_value, current_password } = req.body;
  const allowedFields = ["first_name", "email", "mobile_number", "emp_address", "password"];
  if (!allowedFields.includes(field)) return res.status(400).json({ message: "Invalid field" });
  if (!new_value) return res.status(400).json({ message: "New value is required" });

  const createRequest = (valueToStore) => {
    db.query(
      "INSERT INTO profile_change_requests (user_id, field, new_value, status) VALUES (?, ?, ?, 'pending')",
      [req.user.id, field, valueToStore],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Request failed", error: err.message });

        const notificationIO = getNotificationIO();
        if (notificationIO) {
          notificationIO.emitNotification("profile_change_requested", {
            id: result.insertId,
            userId: req.user.id,
            userName: req.user.name,
            field,
            fieldLabel: fieldLabels[field] || field,
            type: "profile",
            priority: "high"
          }, null, true);
        } else {
          db.query(
            "INSERT INTO admin_notifications (type, user_id, message, related_id, related_type, priority) VALUES (?, ?, ?, ?, ?, ?)",
            ["profile_change_requested", req.user.id, `Profile change requested: ${fieldLabels[field] || field}`, result.insertId, "profile", "high"]
          );
        }

        res.json({ message: "Change request submitted", id: result.insertId });
      }
    );
  };

  if (field !== "password") return createRequest(new_value);

  db.query("SELECT user_password FROM users WHERE id=?", [req.user.id], async (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ message: "User not found" });
    const ok = await bcrypt.compare(current_password || "", rows[0].user_password || "");
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
    const hash = await bcrypt.hash(new_value, 10);
    createRequest(hash);
  });
});

router.get("/profile-change-requests", (req, res) => {
  db.query(
    `SELECT p.id, p.user_id, p.field, p.new_value, p.status, p.created_at,
            u.first_name, u.email
     FROM profile_change_requests p
     JOIN users u ON u.id = p.user_id
     WHERE p.status='pending'
     ORDER BY p.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error", error: err.message });
      res.json(rows.map((row) => row.field === "password" ? { ...row, new_value: "" } : row));
    }
  );
});

router.put("/handle-change-request/:id", (req, res) => {
  const { action } = req.body;
  if (!["approved", "declined"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  db.query(
    `SELECT p.*, u.email, u.first_name
     FROM profile_change_requests p
     JOIN users u ON u.id = p.user_id
     WHERE p.id=? AND p.status='pending'`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!rows.length) return res.status(404).json({ message: "Request not found" });

      const request = rows[0];
      const finish = () => {
        db.query(
          "UPDATE profile_change_requests SET status=?, admin_response_at=NOW() WHERE id=?",
          [action, req.params.id],
          (err2) => {
            if (err2) return res.status(500).json({ message: "Request update failed" });

            const notificationIO = getNotificationIO();
            if (notificationIO) {
              notificationIO.emitNotification(action === "approved" ? "profile_change_approved" : "profile_change_declined", {
                id: req.params.id,
                userId: request.user_id,
                field: request.field,
                fieldLabel: fieldLabels[request.field] || request.field,
                type: "profile"
              }, request.user_id, false);
              notificationIO.sendToUser(request.user_id, "profile_change_response", { id: req.params.id, status: action });
            }

            res.json({ message: `Request ${action}` });
          }
        );
      };

      if (action === "declined") return finish();

      if (request.field === "password") {
        db.query("UPDATE users SET user_password=? WHERE id=?", [request.new_value, request.user_id], finish);
        return;
      }

      if (request.field === "first_name" || request.field === "email") {
        const sql = request.field === "first_name"
          ? "UPDATE users SET first_name=? WHERE id=?"
          : "UPDATE users SET email=? WHERE id=?";
        db.query(sql, [request.new_value, request.user_id], (e) => {
          if (e) return res.status(500).json({ message: "Could not apply change", error: e.message });
          const teamSql = request.field === "first_name"
            ? "UPDATE teammember SET first_name=? WHERE emp_email=?"
            : "UPDATE teammember SET emp_email=? WHERE emp_email=?";
          db.query(teamSql, [request.new_value, request.email], finish);
        });
        return;
      }

      db.query(
        `UPDATE teammember SET ${request.field}=? WHERE emp_email=?`,
        [request.new_value, request.email],
        finish
      );
    }
  );
});

/* ================= ADMIN: NOTIFICATIONS ================= */

router.get("/notifications", (req, res) => {
  db.query(
    `SELECT n.id, n.type, n.message, n.is_read, n.created_at, n.user_id,
            u.first_name, u.email, u.role, u.status
     FROM admin_notifications n
     LEFT JOIN users u ON u.id = n.user_id
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
