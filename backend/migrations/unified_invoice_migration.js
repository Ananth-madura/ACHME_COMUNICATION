require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  multipleStatements: true,
});

const sql = `
-- Estimate Invoice tables (EI prefix)
CREATE TABLE IF NOT EXISTS estimate_invoices (
  id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  total_cgst DECIMAL(10,2) DEFAULT 0,
  total_sgst DECIMAL(10,2) DEFAULT 0,
  total_tax DECIMAL(10,2) DEFAULT 0,
  total_discount DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) DEFAULT 0,
  reference_no VARCHAR(30) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT DEFAULT NULL,
  client_company VARCHAR(200) DEFAULT NULL,
  client_address1 VARCHAR(255) DEFAULT NULL,
  client_address2 VARCHAR(255) DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(10) DEFAULT NULL,
  client_country VARCHAR(100) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax DECIMAL(5,2) DEFAULT NULL,
  exec_name VARCHAR(150) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT 0,
  terms_tax TINYINT(1) DEFAULT 0,
  terms_project_period VARCHAR(255) DEFAULT NULL,
  terms_validity TINYINT(1) DEFAULT 1,
  terms_separate_orders TEXT DEFAULT NULL,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY customer_id (customer_id),
  CONSTRAINT ei_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estimate_invoice_items (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(255) DEFAULT NULL,
  uom VARCHAR(50) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY invoice_id (invoice_id),
  CONSTRAINT ei_items_fk FOREIGN KEY (invoice_id) REFERENCES estimate_invoices(id)
) ENGINE=InnoDB;

-- Service Estimation tables (SE prefix)
CREATE TABLE IF NOT EXISTS service_estimations (
  id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  total_cgst DECIMAL(10,2) DEFAULT 0,
  total_sgst DECIMAL(10,2) DEFAULT 0,
  total_tax DECIMAL(10,2) DEFAULT 0,
  total_discount DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) DEFAULT 0,
  reference_no VARCHAR(30) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT DEFAULT NULL,
  client_company VARCHAR(200) DEFAULT NULL,
  client_address1 VARCHAR(255) DEFAULT NULL,
  client_address2 VARCHAR(255) DEFAULT NULL,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(10) DEFAULT NULL,
  client_country VARCHAR(100) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax DECIMAL(5,2) DEFAULT NULL,
  exec_name VARCHAR(150) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT 0,
  terms_tax TINYINT(1) DEFAULT 0,
  terms_project_period VARCHAR(255) DEFAULT NULL,
  terms_validity TINYINT(1) DEFAULT 1,
  terms_separate_orders TEXT DEFAULT NULL,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY customer_id (customer_id),
  CONSTRAINT se_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_estimation_items (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(255) DEFAULT NULL,
  uom VARCHAR(50) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY invoice_id (invoice_id),
  CONSTRAINT se_items_fk FOREIGN KEY (invoice_id) REFERENCES service_estimations(id)
) ENGINE=InnoDB;

-- Add new columns to quotations for enhanced form
ALTER TABLE quotations ADD COLUMN reference_no VARCHAR(30) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN from_address_id INT DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN from_address_custom TEXT DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_company VARCHAR(200) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_address1 VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_address2 VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_city VARCHAR(100) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_state VARCHAR(100) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_pincode VARCHAR(10) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN client_country VARCHAR(100) DEFAULT 'India';
ALTER TABLE quotations ADD COLUMN tax_type VARCHAR(20) DEFAULT 'GST18';
ALTER TABLE quotations ADD COLUMN custom_tax DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN exec_name VARCHAR(150) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN exec_phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN exec_email VARCHAR(150) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN terms_general TINYINT(1) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN terms_tax TINYINT(1) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN terms_project_period VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN terms_validity TINYINT(1) DEFAULT 1;
ALTER TABLE quotations ADD COLUMN terms_separate_orders TEXT DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN terms_payment VARCHAR(100) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN terms_payment_custom VARCHAR(100) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN terms_warranty VARCHAR(50) DEFAULT NULL;
ALTER TABLE quotation_items ADD COLUMN brand_model VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotation_items ADD COLUMN uom VARCHAR(50) DEFAULT 'Nos';
`;

db.query(sql, (err) => {
  if (err) console.error("MIGRATION ERROR:", err.message);
  else console.log("Migration OK");
  db.end();
});
