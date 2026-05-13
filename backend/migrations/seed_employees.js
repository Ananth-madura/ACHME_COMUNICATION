const db = require("../config/database");

const migration = async () => {
  console.log("Fixing users table and seeding new employees...");
  await db.ready;
  console.log("Database connected!");

await new Promise((resolve) => {
    db.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','employee','user') DEFAULT 'employee'", (err) => {
      if (err) console.log("Alter users role:", err.message);
      else console.log("Users role column updated");
      resolve();
    });
  });

  await new Promise((resolve) => {
    db.query("ALTER TABLE teammember MODIFY COLUMN emp_role ENUM('Developer','BDM','Manager','Sales') DEFAULT 'Sales'", (err) => {
      if (err) console.log("Alter teammember emp_role:", err.message);
      else console.log("Teammember emp_role column updated");
      resolve();
    });
  });

  const oldEmails = [
    "john.smith@test.local",
    "sarah.j@test.local",
    "mike.w@test.local",
    "emily.b@test.local",
    "david.l@test.local",
    "employee1@test.local",
    "employee2@test.local",
    "thanan757@gmail.com"
  ];

  for (const email of oldEmails) {
    await new Promise((resolve) => {
      db.query("DELETE FROM teammember WHERE emp_email = ?", [email], (err) => {
        if (!err) console.log("Deleted teammember:", email);
        resolve();
      });
    });
    await new Promise((resolve) => {
      db.query("DELETE FROM users WHERE email = ?", [email], (err) => {
        if (!err) console.log("Deleted user:", email);
        resolve();
      });
    });
  }

  const bcrypt = require("bcryptjs");
  const employees = [
    { first_name: "Princee", last_name: "SD", emp_id: "AC055", email: "info@achmecommunication.com", password: "Achme@Princee" },
    { first_name: "Vimal", last_name: "", emp_id: "AC051", email: "sales1@technostore.co.in", password: "Achme@Vimal" },
    { first_name: "Moorthi", last_name: "", emp_id: "AC015", email: "sales5@technostore.co.in", password: "Achme@Moorthi" },
    { first_name: "Uma", last_name: "Kalyani", emp_id: "AC010", email: "uma@achmecommunication.com", password: "Achme@Uma" },
    { first_name: "Nagaraj", last_name: "", emp_id: "AC014", email: "nagaraj@technostore.co.in", password: "Achme@Nagaraj" },
    { first_name: "Priyanka", last_name: "", emp_id: "AC099", email: "service@achmecommunication.com", password: "Achme@Priyanka" }
  ];

  for (const emp of employees) {
    const hash = await bcrypt.hash(emp.password, 10);

    const existing = await new Promise((resolve) => {
      db.query("SELECT id FROM users WHERE email = ?", [emp.email], (err, rows) => resolve(rows[0] || null));
    });

    if (existing) {
      await new Promise((resolve) => {
        db.query(
          `UPDATE users SET first_name=?, last_name=?, emp_id=?, user_password=?, role='employee', status='active' WHERE email=?`,
          [emp.first_name, emp.last_name, emp.emp_id, hash, emp.email],
          (err) => {
            if (!err) console.log("Updated user:", emp.email, "(" + emp.emp_id + ")");
            resolve();
          }
        );
      });
    } else {
      await new Promise((resolve) => {
        db.query(
          `INSERT INTO users (first_name, last_name, emp_id, email, user_password, role, status)
           VALUES (?, ?, ?, ?, ?, 'employee', 'active')`,
          [emp.first_name, emp.last_name, emp.emp_id, emp.email, hash],
          (err) => {
            if (!err) console.log("Inserted user:", emp.email, "(" + emp.emp_id + ")");
            resolve();
          }
        );
      });
    }

    const userRow = await new Promise((resolve) => {
      db.query("SELECT id FROM users WHERE email = ?", [emp.email], (err, rows) => resolve(rows[0] || null));
    });

    if (userRow) {
      const existTm = await new Promise((resolve) => {
        db.query("SELECT id FROM teammember WHERE emp_email = ?", [emp.email], (err, rows) => resolve(rows[0] || null));
      });

      if (existTm) {
        await new Promise((resolve) => {
          db.query(
            `UPDATE teammember SET first_name=?, last_name=?, emp_id=?, user_id=? WHERE emp_email=?`,
            [emp.first_name, emp.last_name, emp.emp_id, userRow.id, emp.email],
            (err) => {
              if (!err) console.log("Updated teammember:", emp.email);
              resolve();
            }
          );
        });
      } else {
        await new Promise((resolve) => {
          db.query(
            `INSERT INTO teammember (first_name, last_name, emp_id, emp_email, mobile, job_title, emp_role, quotation_count, user_id)
             VALUES (?, ?, ?, ?, '', 'Sales', 'Sales', 0, ?)`,
            [emp.first_name, emp.last_name, emp.emp_id, emp.email, userRow.id],
            (err) => {
              if (!err) console.log("Inserted teammember:", emp.email);
              resolve();
            }
          );
        });
      }
    }
  }

  console.log("\n=== All 6 Employees Ready ===");
  employees.forEach(e => {
    console.log("  " + e.emp_id + " | " + e.first_name + (e.last_name ? " " + e.last_name : "") + " | Password: " + e.password);
  });

  process.exit(0);
};

migration().catch(e => { console.error(e); process.exit(1); });