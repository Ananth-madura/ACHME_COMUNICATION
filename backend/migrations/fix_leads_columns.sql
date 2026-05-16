-- Migration: Fix missing columns for Telecalls, Walkins, Fields
-- Run this SQL against your MySQL database

-- Add reference column to Telecalls if not exists
ALTER TABLE Telecalls ADD COLUMN IF NOT EXISTS reference VARCHAR(255) DEFAULT NULL;

-- Add gst_number column to Telecalls if not exists
ALTER TABLE Telecalls ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20) DEFAULT NULL;

-- Add reference column to Walkins if not exists
ALTER TABLE Walkins ADD COLUMN IF NOT EXISTS reference VARCHAR(255) DEFAULT NULL;

-- Add gst_number column to Walkins if not exists
ALTER TABLE Walkins ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20) DEFAULT NULL;

-- Add reference column to fields if not exists
ALTER TABLE fields ADD COLUMN IF NOT EXISTS reference VARCHAR(255) DEFAULT NULL;

-- Add gst_number column to fields if not exists
ALTER TABLE fields ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20) DEFAULT NULL;

-- Add quotation_count column to teammember if not exists
ALTER TABLE teammember ADD COLUMN IF NOT EXISTS quotation_count INT DEFAULT 0;

-- Add issues column to services if not exists
ALTER TABLE services ADD COLUMN IF NOT EXISTS issues TEXT DEFAULT NULL;

-- Create performainvoices table if not exists (for Dashboard sales data)
CREATE TABLE IF NOT EXISTS performainvoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT '0.00',
  total_tax DECIMAL(10,2) DEFAULT '0.00',
  total_discount DECIMAL(10,2) DEFAULT '0.00',
  grand_total DECIMAL(10,2) DEFAULT '0.00',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  total_cgst DECIMAL(10,2) DEFAULT '0.00',
  total_sgst DECIMAL(10,2) DEFAULT '0.00',
  total_igst DECIMAL(10,2) DEFAULT '0.00',
  hsn_sac_code VARCHAR(50) DEFAULT NULL,
  supplier_branch VARCHAR(100) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  reference_no VARCHAR(50) DEFAULT NULL,
  from_address_id INT DEFAULT NULL,
  from_address_custom TEXT,
  client_company VARCHAR(150) DEFAULT NULL,
  client_address1 TEXT,
  client_address2 TEXT,
  client_city VARCHAR(100) DEFAULT NULL,
  client_state VARCHAR(100) DEFAULT NULL,
  client_pincode VARCHAR(20) DEFAULT NULL,
  client_country VARCHAR(50) DEFAULT 'India',
  tax_type VARCHAR(20) DEFAULT 'GST18',
  custom_tax VARCHAR(20) DEFAULT NULL,
  exec_name VARCHAR(100) DEFAULT NULL,
  exec_phone VARCHAR(20) DEFAULT NULL,
  exec_email VARCHAR(150) DEFAULT NULL,
  terms_general TINYINT(1) DEFAULT '0',
  terms_tax TINYINT(1) DEFAULT '0',
  terms_project_period VARCHAR(100) DEFAULT NULL,
  terms_validity VARCHAR(50) DEFAULT NULL,
  terms_separate_orders TEXT,
  terms_payment VARCHAR(100) DEFAULT NULL,
  terms_payment_custom VARCHAR(100) DEFAULT NULL,
  terms_warranty VARCHAR(100) DEFAULT NULL,
  bank_details_id VARCHAR(50) DEFAULT NULL,
  bank_company VARCHAR(150) DEFAULT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  bank_account VARCHAR(50) DEFAULT NULL,
  bank_ifsc VARCHAR(50) DEFAULT NULL,
  bank_branch VARCHAR(100) DEFAULT NULL,
  custom_terms TEXT,
  is_latest TINYINT(1) DEFAULT '1',
  version INT DEFAULT '1',
  parent_id INT DEFAULT NULL,
  KEY customer_id (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create performainvoice_items table if not exists
CREATE TABLE IF NOT EXISTS performainvoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_number INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  brand_model VARCHAR(150) DEFAULT NULL,
  hsn_sac VARCHAR(20) DEFAULT NULL,
  uom VARCHAR(20) DEFAULT 'Nos',
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  tax DECIMAL(10,2) DEFAULT '0.00',
  discount DECIMAL(10,2) DEFAULT '0.00',
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;