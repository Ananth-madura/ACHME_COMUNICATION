require("dotenv").config({ path: __dirname + "/.env" });
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "achme_db",
};

// 6 Sales Team Employees
const employees = [
  { first_name: "Rahul", last_name: "Sharma", email: "rahul.sharma@achme.com", mobile: "9876543201", job_title: "Sales Executive", emp_role: "Sales" },
  { first_name: "Priya", last_name: "Patel", email: "priya.patel@achme.com", mobile: "9876543202", job_title: "Sales Executive", emp_role: "Sales" },
  { first_name: "Amit", last_name: "Kumar", email: "amit.kumar@achme.com", mobile: "9876543203", job_title: "Sales Executive", emp_role: "Sales" },
  { first_name: "Sneha", last_name: "Reddy", email: "sneha.reddy@achme.com", mobile: "9876543204", job_title: "Sales Executive", emp_role: "Sales" },
  { first_name: "Vikram", last_name: "Singh", email: "vikram.singh@achme.com", mobile: "9876543205", job_title: "Sales Executive", emp_role: "Sales" },
  { first_name: "Anjali", last_name: "Gupta", email: "anjali.gupta@achme.com", mobile: "9876543206", job_title: "Sales Executive", emp_role: "Sales" },
];

async function seedEmployees() {
  const db = await mysql.createConnection(dbConfig);
  console.log("MySQL Connected");

  console.log("Seeding 6 sales team employees...");

  // Default password for all employees
  const defaultPassword = "sales123";

  for (const emp of employees) {
    // Check if user already exists
    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [emp.email]);

    if (existingUser) {
      console.log(`User ${emp.email} already exists, skipping...`);
      continue;
    }

    // Hash password
    const hash = await bcrypt.hash(defaultPassword, 10);

    // Create user account (status = active)
    const [userResult] = await db.query(
      "INSERT INTO users (first_name, email, user_password, role, status) VALUES (?, ?, ?, ?, ?)",
      [emp.first_name, emp.email, hash, "user", "active"]
    );

    // Create team member record
    await db.query(
      "INSERT INTO teammember (first_name, last_name, emp_email, mobile, job_title, emp_role) VALUES (?, ?, ?, ?, ?, ?)",
      [emp.first_name, emp.last_name, emp.email, emp.mobile, emp.job_title, emp.emp_role]
    );

    console.log(`Created: ${emp.email} (Password: ${defaultPassword})`);
  }

  await db.end();
  console.log("Seeding complete!");
  process.exit(0);
}

seedEmployees().catch(err => {
  console.error("Seed error:", err.message);
  process.exit(1);
});