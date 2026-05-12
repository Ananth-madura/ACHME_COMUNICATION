CREATE TABLE IF NOT EXISTS `clientinvoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_company` varchar(150) DEFAULT NULL,
  `project_names` varchar(150) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_duedate` date DEFAULT NULL,
  `category` enum('Default') DEFAULT 'Default',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `profile_change_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `field` varchar(50) NOT NULL,
  `new_value` text,
  `status` enum('pending','approved','declined') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_response_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_company` varchar(150) DEFAULT NULL,
  `template_names` varchar(150) DEFAULT NULL,
  `contract_title` varchar(150) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `category` enum('Default') DEFAULT 'Default',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `amount_value` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `location_city` varchar(100) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_otp` (
  `otp` char(6) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `email` char(100) DEFAULT NULL,
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `estimateclient` (
  `client_company` varchar(150) DEFAULT NULL,
  `project_names` varchar(150) DEFAULT NULL,
  `Estimate_date` date DEFAULT NULL,
  `Expiry_date` date DEFAULT NULL,
  `category` enum('Default') DEFAULT 'Default',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `estimatenew` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(150) DEFAULT NULL,
  `client_firstname` varchar(150) DEFAULT NULL,
  `client_lastname` varchar(150) DEFAULT NULL,
  `client_email` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fields` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(150) NOT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `location_city` varchar(100) DEFAULT NULL,
  `visit_date` date NOT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `staff_name` varchar(150) DEFAULT NULL,
  `field_outcome` enum('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New',
  `followup_required` varchar(50) DEFAULT 'Default',
  `followup_date` date DEFAULT NULL,
  `followup_notes` text,
  `reminder_required` varchar(50) DEFAULT 'Default',
  `reminder_date` date DEFAULT NULL,
  `reminder_notes` text,
  `reference` varchar(255) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_reminders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `lead_type` enum('telecall','walkin','field') DEFAULT 'telecall',
  `reminder_date` date,
  `reminder_time` time DEFAULT NULL,
  `reminder_notes` text,
  `status` enum('Pending','Done','Missed') DEFAULT 'Pending',
  `missed_count` int DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `lead_type` enum('telecall','walkin','field') DEFAULT 'telecall',
  `action` varchar(100),
  `details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_escalations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `lead_type` enum('telecall','walkin','field') DEFAULT 'telecall',
  `customer_name` varchar(150),
  `mobile_number` varchar(20),
  `staff_name` varchar(150),
  `last_followup_date` date,
  `missed_count` int DEFAULT 0,
  `status` enum('Open','Resolved') DEFAULT 'Open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int DEFAULT NULL,
  `receiver_id` int DEFAULT NULL,
  `message` text,
  `type` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `seen` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_read` tinyint DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('Paypal','Cash','Bank') DEFAULT 'Paypal',
  `Transaction_ID` int DEFAULT NULL,
  `invoice_email` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `invoice_id` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CREATE TABLE IF NOT EXISTS `quotation_items` (
--   `id` int NOT NULL AUTO_INCREMENT,
--   `quotation_id` int NOT NULL,
--   `product_number` int NOT NULL,
--   `description` varchar(255) NOT NULL,
--   `price` decimal(10,2) NOT NULL,
--   `quantity` int NOT NULL,
--   `tax` decimal(10,2) DEFAULT '0.00',
--   `discount` decimal(10,2) DEFAULT '0.00',
--   `subtotal` decimal(10,2) NOT NULL,
--   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   KEY `quotation_id` (`quotation_id`),
--   CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CREATE TABLE IF NOT EXISTS `quotations` (
--   `id` int NOT NULL AUTO_INCREMENT,
--   `customer_id` int NOT NULL,
--   `quotation_date` date NOT NULL,
--   `subtotal` decimal(10,2) DEFAULT '0.00',
--   `total_tax` decimal(10,2) DEFAULT '0.00',
--   `total_discount` decimal(10,2) DEFAULT '0.00',
--   `grand_total` decimal(10,2) DEFAULT '0.00',
--   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
--   `total_cgst` decimal(10,2) DEFAULT '0.00',
--   `total_sgst` decimal(10,2) DEFAULT '0.00',
--   PRIMARY KEY (`id`),
--   KEY `customer_id` (`customer_id`),
--   CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
-- ) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FIRST create parent table
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `quotation_date` date NOT NULL,
  `subtotal` decimal(10,2) DEFAULT '0.00',
  `total_tax` decimal(10,2) DEFAULT '0.00',
  `total_discount` decimal(10,2) DEFAULT '0.00',
  `grand_total` decimal(10,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_cgst` decimal(10,2) DEFAULT '0.00',
  `total_sgst` decimal(10,2) DEFAULT '0.00',
  `total_igst` decimal(10,2) DEFAULT '0.00',
  `hsn_sac_code` varchar(50) DEFAULT NULL,
  `supplier_branch` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `quotations_ibfk_1`
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB;
-- THEN child table
CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `product_number` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `brand_model` varchar(150) DEFAULT NULL,
  `hsn_sac` varchar(20) DEFAULT NULL,
  `quantity` int NOT NULL,
  `tax` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`),
  CONSTRAINT `quotation_items_ibfk_1`
  FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`)
) ENGINE=InnoDB;








CREATE TABLE IF NOT EXISTS `task_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `action` varchar(50) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_name` varchar(150) NOT NULL,
  `task_title` varchar(200) NOT NULL,
  `client_name` varchar(150) NOT NULL,
  `project_status` enum('New','Process','Completed') NOT NULL,
  `project_priority` enum('Low','Normal','High','Urgent') NOT NULL,
  `created_date` date NOT NULL,
  `due_date` date NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `staff_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `teammember` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(150) DEFAULT NULL,
  `last_name` varchar(150) DEFAULT NULL,
  `emp_email` varchar(150) DEFAULT NULL,
  `mobile` char(10) DEFAULT NULL,
  `job_title` varchar(150) DEFAULT NULL,
  `emp_role` enum('Developer','BDM','Manager','Sales') DEFAULT 'Sales',
  `quotation_count` int DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `telecalls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `mobile_number` varchar(15) NOT NULL,
  `location_city` varchar(100) DEFAULT NULL,
  `call_date` date NOT NULL,
  `service_name` varchar(150) DEFAULT NULL,
  `staff_name` varchar(150) DEFAULT NULL,
  `call_outcome` enum('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New',
  `followup_required` varchar(50) DEFAULT 'Default',
  `followup_date` date DEFAULT NULL,
  `followup_notes` text,
  `reminder_required` varchar(50) DEFAULT 'Default',
  `reminder_date` date DEFAULT NULL,
  `reminder_notes` text,
  `reference` varchar(255) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `emp_id` varchar(50) DEFAULT NULL,
  `user_password` varchar(255) DEFAULT NULL,
  `role` enum('admin','employee') DEFAULT 'employee',
  `status` enum('pending','active','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) DEFAULT 'registration',
  `user_id` int,
  `message` text,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `walkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `mobile_number` varchar(15) NOT NULL,
  `location_city` varchar(100) DEFAULT NULL,
  `walkin_date` datetime DEFAULT NULL,
  `purpose` varchar(150) DEFAULT NULL,
  `staff_name` varchar(150) DEFAULT NULL,
  `walkin_status` enum('New','Hot Case','Warm Case','Cold Case','Not Required','Converted') DEFAULT 'New',
  `followup_required` varchar(50) DEFAULT 'Default',
  `followup_date` date DEFAULT NULL,
  `followup_notes` text,
  `reminder_required` varchar(50) DEFAULT 'Default',
  `reminder_date` date DEFAULT NULL,
  `reminder_notes` text,
  `reference` varchar(255) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `performainvoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `invoice_date` date NOT NULL,
  `subtotal` decimal(10,2) DEFAULT '0.00',
  `total_tax` decimal(10,2) DEFAULT '0.00',
  `total_discount` decimal(10,2) DEFAULT '0.00',
  `grand_total` decimal(10,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_cgst` decimal(10,2) DEFAULT '0.00',
  `total_sgst` decimal(10,2) DEFAULT '0.00',
  `total_igst` decimal(10,2) DEFAULT '0.00',
  `hsn_sac_code` varchar(50) DEFAULT NULL,
  `supplier_branch` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `performainvoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `product_number` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `brand_model` varchar(150) DEFAULT NULL,
  `hsn_sac` varchar(20) DEFAULT NULL,
  `quantity` int NOT NULL,
  `tax` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client` varchar(150) DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `warranty` varchar(100) DEFAULT NULL,
  `amc` tinyint(1) DEFAULT '0',
  `date` date DEFAULT NULL,
  `images` text,
  `issues` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `service` varchar(255) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `original_lead_id` int DEFAULT NULL,
  `original_lead_type` enum('telecall','walkin','field') DEFAULT NULL,
  `converted_at` timestamp NULL DEFAULT NULL,
  `lead_email` varchar(150) DEFAULT NULL,
  `lead_city` varchar(100) DEFAULT NULL,
  `lead_reference` varchar(255) DEFAULT NULL,
  `lead_purpose` varchar(255) DEFAULT NULL,
  `client_status` enum('active','inactive','converted') DEFAULT 'active',
  `lead_staff_name` varchar(150) DEFAULT NULL,
  `lead_id_display` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `call_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `complaint` text,
  `time_spent` varchar(50) DEFAULT NULL,
  `km` decimal(10,2) DEFAULT NULL,
  `report_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
