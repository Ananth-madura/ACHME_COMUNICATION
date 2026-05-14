# MySQL Database Schema Reference

**Project:** simple-react-spark (Achme Communication CRM)
**Database:** `achme`
**Charset:** utf8mb4 / utf8mb4_unicode_ci

---

## EXISTING TABLES (managed in `backend/config/database.js`)

### 1. `users`
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  emp_id VARCHAR(50) DEFAULT NULL,
  user_password VARCHAR(255) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL UNIQUE,
  role ENUM('admin','employee') DEFAULT 'employee',
  status ENUM('pending','active','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `teammember`
```sql
CREATE TABLE teammember (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(150) DEFAULT NULL,
  last_name VARCHAR(150) DEFAULT NULL,
  emp_email VARCHAR(150) DEFAULT NULL,
  mobile CHAR(10) DEFAULT NULL,
  mobile_number VARCHAR(20) DEFAULT NULL,
  job_title VARCHAR(150) DEFAULT NULL,
  emp_role ENUM('Developer','BDM','Manager','Sales') DEFAULT 'Sales',
  quotation_count INT DEFAULT 0,
  emp_id VARCHAR(50) DEFAULT NULL,
  user_id INT DEFAULT NULL,
  emp_address TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `Telecalls`
```sql
CREATE TABLE Telecalls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  location_city VARCHAR(100) DEFAULT NULL,
  call_date DATE NOT NULL,
  service_name VARCHAR(150) DEFAULT NULL,
  staff_name VARCHAR(150) DEFAULT NULL,
  call_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New',
  followup_required VARCHAR(50) DEFAULT 'Default',
  followup_date DATE DEFAULT NULL,
  followup_notes TEXT,
  reminder_required VARCHAR(50) DEFAULT 'Default',
  reminder_date DATE DEFAULT NULL,
  reminder_notes TEXT,
  reference VARCHAR(255) DEFAULT NULL,
  gst_number VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `Walkins`
```sql
CREATE TABLE Walkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  location_city VARCHAR(100) DEFAULT NULL,
  walkin_date DATETIME DEFAULT NULL,
  purpose VARCHAR(150) DEFAULT NULL,
  staff_name VARCHAR(150) DEFAULT NULL,
  walkin_status ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New',
  followup_required VARCHAR(50) DEFAULT 'Default',
  followup_date DATE DEFAULT NULL,
  followup_notes TEXT,
  reminder_required VARCHAR(50) DEFAULT 'Default',
  reminder_date DATE DEFAULT NULL,
  reminder_notes TEXT,
  reference VARCHAR(255) DEFAULT NULL,
  gst_number VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. `fields`
```sql
CREATE TABLE fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) DEFAULT NULL,
  location_city VARCHAR(100) DEFAULT NULL,
  visit_date DATE NOT NULL,
  purpose VARCHAR(255) DEFAULT NULL,
  staff_name VARCHAR(150) DEFAULT NULL,
  field_outcome ENUM('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New',
  followup_required VARCHAR(50) DEFAULT 'Default',
  followup_date DATE DEFAULT NULL,
  followup_notes TEXT,
  reminder_required VARCHAR(50) DEFAULT 'Default',
  reminder_date DATE DEFAULT NULL,
  reminder_notes TEXT,
  reference VARCHAR(255) DEFAULT NULL,
  gst_number VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 6. `clients`
```sql
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  company_name VARCHAR(150) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  service VARCHAR(255) DEFAULT NULL,
  gst_number VARCHAR(50) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  assigned_teammember_id INT DEFAULT NULL,
  original_lead_id INT DEFAULT NULL,
  original_lead_type ENUM('telecall','walkin','field') DEFAULT NULL,
  converted_at TIMESTAMP NULL DEFAULT NULL,
  lead_email VARCHAR(150) DEFAULT NULL,
  lead_city VARCHAR(100) DEFAULT NULL,
  lead_reference VARCHAR(255) DEFAULT NULL,
  lead_purpose VARCHAR(255) DEFAULT NULL,
  client_status ENUM('active','inactive','converted') DEFAULT 'active',
  lead_staff_name VARCHAR(150) DEFAULT NULL,
  lead_id_display VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 7. `customers`
```sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  location_city VARCHAR(100) DEFAULT NULL,
  gst_number VARCHAR(50) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8. `quotations`
```sql
CREATE TABLE quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  quotation_date DATE NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  total_cgst DECIMAL(12,2) DEFAULT 0,
  total_sgst DECIMAL(12,2) DEFAULT 0,
  total_igst DECIMAL(12,2) DEFAULT 0,
  reference_no VARCHAR(50) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT DEFAULT NULL,
  client_company VARCHAR(150) DEFAULT NULL,
  client_address1 TEXT DEFAULT NULL,
  client_address2 TEXT DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(20) DEFAULT NULL,
  client_country VARCHAR(50) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax VARCHAR(20) DEFAULT NULL,
  exec_name VARCHAR(100) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT 0,
  terms_tax TINYINT(1) DEFAULT 0,
  terms_project_period VARCHAR(100) DEFAULT NULL,
  terms_validity VARCHAR(50) DEFAULT NULL,
  terms_separate_orders TEXT DEFAULT NULL,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(100) DEFAULT NULL,
  hsn_sac_code VARCHAR(50) DEFAULT NULL,
  supplier_branch VARCHAR(100) DEFAULT NULL,
  bank_details_id VARCHAR(50) DEFAULT NULL,
  bank_company VARCHAR(150) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  bank_account VARCHAR(50) DEFAULT NULL,
  bank_ifsc VARCHAR(50) DEFAULT NULL,
  bank_branch VARCHAR(100) DEFAULT NULL,
  custom_terms TEXT DEFAULT NULL,
  is_latest TINYINT(1) DEFAULT 1,
  parent_id INT DEFAULT NULL,
  version INT DEFAULT 1,
  lead_id INT DEFAULT NULL,
  lead_type VARCHAR(20) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9. `quotation_items`
```sql
CREATE TABLE quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 10. `performainvoices`
```sql
CREATE TABLE performainvoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  total_cgst DECIMAL(12,2) DEFAULT 0,
  total_sgst DECIMAL(12,2) DEFAULT 0,
  total_igst DECIMAL(12,2) DEFAULT 0,
  reference_no VARCHAR(50) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT DEFAULT NULL,
  client_company VARCHAR(150) DEFAULT NULL,
  client_address1 TEXT DEFAULT NULL,
  client_address2 TEXT DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(20) DEFAULT NULL,
  client_country VARCHAR(50) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax VARCHAR(20) DEFAULT NULL,
  exec_name VARCHAR(100) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT 0,
  terms_tax TINYINT(1) DEFAULT 0,
  terms_project_period VARCHAR(100) DEFAULT NULL,
  terms_validity VARCHAR(50) DEFAULT NULL,
  terms_separate_orders TEXT DEFAULT NULL,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(100) DEFAULT NULL,
  hsn_sac_code VARCHAR(50) DEFAULT NULL,
  supplier_branch VARCHAR(100) DEFAULT NULL,
  bank_details_id VARCHAR(50) DEFAULT NULL,
  bank_company VARCHAR(150) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  bank_account VARCHAR(50) DEFAULT NULL,
  bank_ifsc VARCHAR(50) DEFAULT NULL,
  bank_branch VARCHAR(100) DEFAULT NULL,
  custom_terms TEXT DEFAULT NULL,
  is_latest TINYINT(1) DEFAULT 1,
  parent_id INT DEFAULT NULL,
  version INT DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 11. `performainvoice_items`
```sql
CREATE TABLE performainvoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 12. `estimate_invoices`
```sql
CREATE TABLE estimate_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  total_cgst DECIMAL(12,2) DEFAULT 0,
  total_sgst DECIMAL(12,2) DEFAULT 0,
  total_igst DECIMAL(12,2) DEFAULT 0,
  reference_no VARCHAR(50) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT DEFAULT NULL,
  client_company VARCHAR(150) DEFAULT NULL,
  client_address1 TEXT DEFAULT NULL,
  client_address2 TEXT DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(20) DEFAULT NULL,
  client_country VARCHAR(50) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax VARCHAR(20) DEFAULT NULL,
  exec_name VARCHAR(100) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT 0,
  terms_tax TINYINT(1) DEFAULT 0,
  terms_project_period VARCHAR(100) DEFAULT NULL,
  terms_validity VARCHAR(50) DEFAULT NULL,
  terms_separate_orders TEXT DEFAULT NULL,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(100) DEFAULT NULL,
  hsn_sac_code VARCHAR(50) DEFAULT NULL,
  supplier_branch VARCHAR(100) DEFAULT NULL,
  bank_details_id VARCHAR(50) DEFAULT NULL,
  bank_company VARCHAR(150) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  bank_account VARCHAR(50) DEFAULT NULL,
  bank_ifsc VARCHAR(50) DEFAULT NULL,
  bank_branch VARCHAR(100) DEFAULT NULL,
  custom_terms TEXT DEFAULT NULL,
  is_latest TINYINT(1) DEFAULT 1,
  parent_id INT DEFAULT NULL,
  version INT DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13. `estimate_invoice_items`
```sql
CREATE TABLE estimate_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 14. `service_estimations`
```sql
CREATE TABLE service_estimations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  total_cgst DECIMAL(12,2) DEFAULT 0,
  total_sgst DECIMAL(12,2) DEFAULT 0,
  total_igst DECIMAL(12,2) DEFAULT 0,
  reference_no VARCHAR(50) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT DEFAULT NULL,
  client_company VARCHAR(150) DEFAULT NULL,
  client_address1 TEXT DEFAULT NULL,
  client_address2 TEXT DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(20) DEFAULT NULL,
  client_country VARCHAR(50) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax VARCHAR(20) DEFAULT NULL,
  exec_name VARCHAR(100) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT 0,
  terms_tax TINYINT(1) DEFAULT 0,
  terms_project_period VARCHAR(100) DEFAULT NULL,
  terms_validity VARCHAR(50) DEFAULT NULL,
  terms_separate_orders TEXT DEFAULT NULL,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(100) DEFAULT NULL,
  hsn_sac_code VARCHAR(50) DEFAULT NULL,
  supplier_branch VARCHAR(100) DEFAULT NULL,
  bank_details_id VARCHAR(50) DEFAULT NULL,
  bank_company VARCHAR(150) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  bank_account VARCHAR(50) DEFAULT NULL,
  bank_ifsc VARCHAR(50) DEFAULT NULL,
  bank_branch VARCHAR(100) DEFAULT NULL,
  custom_terms TEXT DEFAULT NULL,
  is_latest TINYINT(1) DEFAULT 1,
  parent_id INT DEFAULT NULL,
  version INT DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 15. `service_estimation_items`
```sql
CREATE TABLE service_estimation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 16. `service_items`
```sql
CREATE TABLE service_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 17. `estimate_items`
```sql
CREATE TABLE estimate_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estimate_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 18. `contracts`
```sql
CREATE TABLE contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_company VARCHAR(150) DEFAULT NULL,
  template_names VARCHAR(150) DEFAULT NULL,
  contract_title VARCHAR(150) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  category ENUM('Default') DEFAULT 'Default',
  amount_value DECIMAL(10,2) NOT NULL,
  contract_type VARCHAR(20) DEFAULT 'Service',
  quotation_id INT DEFAULT NULL,
  mobile_number VARCHAR(20) DEFAULT NULL,
  location_city VARCHAR(100) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 19. `amc_alc_services`
```sql
CREATE TABLE amc_alc_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  contract_title VARCHAR(150) DEFAULT NULL,
  service_type ENUM('AMC', 'ALC', 'None') DEFAULT 'AMC',
  customer_name VARCHAR(255) DEFAULT NULL,
  mobile_number VARCHAR(20) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  location_city VARCHAR(255) DEFAULT NULL,
  service_date DATE NOT NULL,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  km DECIMAL(10,2) DEFAULT NULL,
  technician VARCHAR(150) DEFAULT NULL,
  sales_person VARCHAR(150) DEFAULT NULL,
  service_person VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  next_service_date DATE DEFAULT NULL,
  petrol_charges DECIMAL(10,2) DEFAULT 0,
  spare_parts_price DECIMAL(10,2) DEFAULT 0,
  labour_charges DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 20. `call_reports`
```sql
CREATE TABLE call_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) DEFAULT NULL,
  client_name VARCHAR(200) DEFAULT NULL,
  staff_name VARCHAR(150) DEFAULT NULL,
  executive_name VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  location VARCHAR(100) DEFAULT NULL,
  call_sequence INT DEFAULT 1,
  start_time DATETIME DEFAULT NULL,
  end_time DATETIME DEFAULT NULL,
  assigned_time INT DEFAULT 30,
  actual_duration INT DEFAULT 0,
  is_exceeded TINYINT(1) DEFAULT 0,
  report_date DATE DEFAULT NULL,
  complaint TEXT DEFAULT NULL,
  km DECIMAL(10,2) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 21. `tasks`
```sql
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(150) NOT NULL,
  task_title VARCHAR(200) NOT NULL,
  client_name VARCHAR(150) DEFAULT NULL,
  project_status ENUM('New','Process','Completed') NOT NULL,
  project_priority ENUM('Low','Normal','Medium','High','Urgent') DEFAULT 'Normal',
  created_date DATE NOT NULL,
  due_date DATE NOT NULL,
  staff_name VARCHAR(100) DEFAULT NULL,
  assigned_to VARCHAR(150) DEFAULT NULL,
  assigned_teammember_id INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 22. `task_targets`
```sql
CREATE TABLE task_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_name VARCHAR(150) NOT NULL,
  teammember_id INT DEFAULT NULL,
  yearly_target DECIMAL(15,2) DEFAULT 0,
  monthly_target DECIMAL(15,2) DEFAULT 0,
  carry_forward DECIMAL(15,2) DEFAULT 0,
  effective_target DECIMAL(15,2) DEFAULT 0,
  created_by_admin TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 23. `task_achievements`
```sql
CREATE TABLE task_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_name VARCHAR(150) NOT NULL,
  target_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  achieved_count INT DEFAULT 0,
  achieved_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_target_month (target_id, month_year)
);
```

### 24. `task_updates`
```sql
CREATE TABLE task_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_name VARCHAR(150) NOT NULL,
  target_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  count INT DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 25. `task_assignments`
```sql
CREATE TABLE task_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  assigned_to_user_id INT DEFAULT NULL,
  assigned_to_user_name VARCHAR(255) DEFAULT NULL,
  assigned_by VARCHAR(255) DEFAULT NULL,
  status ENUM('Pending','Accepted','Declined','In Progress','Completed') DEFAULT 'Pending',
  assigned_date DATE DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
  notes TEXT DEFAULT NULL,
  response_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 26. `task_activity`
```sql
CREATE TABLE task_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT DEFAULT NULL,
  action VARCHAR(50) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 27. `notifications`
```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL DEFAULT 0,
  user_id INT DEFAULT NULL,
  type VARCHAR(50) DEFAULT NULL,
  title VARCHAR(150) DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 28. `admin_notifications`
```sql
CREATE TABLE admin_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) DEFAULT 'registration',
  user_id INT DEFAULT NULL,
  message TEXT DEFAULT NULL,
  related_id INT DEFAULT NULL,
  related_type VARCHAR(50) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 29. `lead_reminders`
```sql
CREATE TABLE lead_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
  reminder_date DATE DEFAULT NULL,
  reminder_time TIME DEFAULT NULL,
  reminder_notes TEXT DEFAULT NULL,
  status ENUM('Pending','Done','Missed') DEFAULT 'Pending',
  missed_count INT DEFAULT 0,
  employee_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 30. `lead_activity`
```sql
CREATE TABLE lead_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
  action VARCHAR(100) DEFAULT NULL,
  details TEXT DEFAULT NULL,
  employee_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 31. `lead_escalations`
```sql
CREATE TABLE lead_escalations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  lead_type ENUM('telecall','walkin','field') DEFAULT 'telecall',
  customer_name VARCHAR(150) DEFAULT NULL,
  mobile_number VARCHAR(20) DEFAULT NULL,
  staff_name VARCHAR(150) DEFAULT NULL,
  last_followup_date DATE DEFAULT NULL,
  missed_count INT DEFAULT 0,
  employee_id INT DEFAULT NULL,
  status ENUM('Open','Resolved') DEFAULT 'Open',
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 32. `profile_change_requests`
```sql
CREATE TABLE profile_change_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  field VARCHAR(50) NOT NULL,
  new_value TEXT DEFAULT NULL,
  status ENUM('pending','approved','declined') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  admin_response_at TIMESTAMP NULL DEFAULT NULL,
  KEY user_id (user_id)
);
```

### 33. `pi_from_addresses`
```sql
CREATE TABLE pi_from_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 34. `estimatenew`
```sql
CREATE TABLE estimatenew (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(150) DEFAULT NULL,
  client_firstname VARCHAR(150) DEFAULT NULL,
  client_lastname VARCHAR(150) DEFAULT NULL,
  client_email VARCHAR(150) DEFAULT NULL,
  client_company VARCHAR(150) DEFAULT NULL,
  client_address TEXT DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_gst VARCHAR(50) DEFAULT NULL,
  client_phone VARCHAR(20) DEFAULT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 35. `estimateclient`
```sql
CREATE TABLE estimateclient (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_company VARCHAR(150) DEFAULT NULL,
  project_names VARCHAR(150) DEFAULT NULL,
  Estimate_date DATE DEFAULT NULL,
  Expiry_date DATE DEFAULT NULL,
  category ENUM('Default') DEFAULT 'Default',
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 36. `services`
```sql
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client VARCHAR(150) DEFAULT NULL,
  material VARCHAR(255) DEFAULT NULL,
  warranty VARCHAR(100) DEFAULT NULL,
  amc TINYINT(1) DEFAULT 0,
  date DATE DEFAULT NULL,
  images TEXT DEFAULT NULL,
  issues TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 37. `service_activity`
```sql
CREATE TABLE service_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT DEFAULT NULL,
  activity_type VARCHAR(50) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## MISSING TABLES (in schema.sql but NOT in database.js)

These tables exist in `schema.sql` but are NOT registered in `database.js` for auto-creation. They should be added to `database.js` `tableStatements` array.

### 38. `email_otp` (MISSING from database.js)
```sql
CREATE TABLE email_otp (
  email CHAR(100) PRIMARY KEY,
  otp CHAR(6) DEFAULT NULL,
  expires_at DATETIME DEFAULT NULL
);
```

### 39. `payments` (MISSING from database.js)
```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('Paypal','Cash','Bank') DEFAULT 'Paypal',
  Transaction_ID INT DEFAULT NULL,
  invoice_email VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 40. `clientinvoices` (MISSING from database.js)
```sql
CREATE TABLE clientinvoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_company VARCHAR(150) DEFAULT NULL,
  project_names VARCHAR(150) DEFAULT NULL,
  invoice_date DATE DEFAULT NULL,
  invoice_duedate DATE DEFAULT NULL,
  category ENUM('Default') DEFAULT 'Default',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 41. `messages` (MISSING from database.js — unused but defined)
```sql
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT DEFAULT NULL,
  receiver_id INT DEFAULT NULL,
  message TEXT DEFAULT NULL,
  type VARCHAR(20) DEFAULT NULL,
  seen TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## MIGRATION-ONLY TABLES (in migration files but NOT in database.js)

### 42. `sales_targets` (in target_migration.js)
```sql
CREATE TABLE sales_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  yearly_target DECIMAL(15,2) DEFAULT 0,
  monthly_target DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_admin TINYINT(1) DEFAULT 1
);
```

### 43. `target_achievements` (in target_migration.js)
```sql
CREATE TABLE target_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_name VARCHAR(150) NOT NULL,
  target_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  achieved_count INT DEFAULT 0,
  achieved_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## COLUMN FIXES NEEDED

The following columns need to be added to existing tables. These are already in `database.js` `columnChecks` — they will auto-add on server restart:

### Lead tables — missing `employee_id`
```sql
ALTER TABLE Telecalls ADD COLUMN employee_id INT DEFAULT NULL;
ALTER TABLE Walkins ADD COLUMN employee_id INT DEFAULT NULL;
ALTER TABLE fields ADD COLUMN employee_id INT DEFAULT NULL;
```

### Lead reminders — missing `employee_id`
```sql
ALTER TABLE lead_reminders ADD COLUMN employee_id INT DEFAULT NULL;
```

### Lead activity — missing `employee_id`
```sql
ALTER TABLE lead_activity ADD COLUMN employee_id INT DEFAULT NULL;
```

### Lead escalations — missing `employee_id`, `missed_threshold_reached`
```sql
ALTER TABLE lead_escalations ADD COLUMN employee_id INT DEFAULT NULL;
ALTER TABLE lead_escalations ADD COLUMN missed_threshold_reached TINYINT(1) DEFAULT 0;
```

---

## INDEX SUMMARY

| Table | Indexes |
|-------|---------|
| `users` | email (UNIQUE), id (PK) |
| `profile_change_requests` | user_id (KEY) |
| `task_achievements` | (target_id, month_year) UNIQUE |
| `teammember` | id (PK), user_id (FK) |
| `quotations` | id (PK), customer_id (FK), parent_id |
| `performainvoices` | id (PK), customer_id (FK) |
| `estimate_invoices` | id (PK), customer_id (FK) |
| `service_estimations` | id (PK), customer_id (FK) |
| `lead_reminders` | id (PK), (lead_id, lead_type) |
| `lead_activity` | id (PK), (lead_id, lead_type) |
| `lead_escalations` | id (PK), (lead_id, lead_type) |
| `email_otp` | email (PK) |

---

## TABLE RELATIONSHIPS

```
customers (id) ← quotations, performainvoices, estimate_invoices, service_estimations (customer_id FK)
clients (id) ← quotations, performainvoices, estimate_invoices, service_estimations (reference only)
contracts (id) ← amc_alc_services (contract_id FK)
tasks (id) ← task_assignments, task_activity, task_targets, task_achievements, task_updates, notifications
users (id) ← teammember, clients, Telecalls, Walkins, fields, tasks, leads tables (created_by, user_id)
Telecalls/Walkins/fields (id) ← lead_reminders, lead_activity, lead_escalations (lead_id, lead_type FK)
```

---

## NOTES

- `schema.sql` is loaded at server startup via `db.query(schema)` inside `ensureTablesAndColumns()`
- `database.js` handles all table creation + column migration via `ensureTablesAndColumns()` and `ensureColumn()`
- Tables NOT in `database.js` (email_otp, payments, clientinvoices, messages) exist in `schema.sql` only
- `sales_targets` and `target_achievements` are only in migration files, not in main schema
- `BANK_DETAILS` in frontend `branchConfig.js` is a JS array, NOT a DB table
- `BRANCH_DATA` and `BRANCH_OPTIONS` are frontend config, NOT DB tables