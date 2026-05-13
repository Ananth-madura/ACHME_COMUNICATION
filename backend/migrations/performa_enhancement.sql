-- Performa Invoice Enhancement Migration

CREATE TABLE IF NOT EXISTS `pi_from_addresses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(100) NOT NULL,
  `address` TEXT NOT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

INSERT IGNORE INTO `pi_from_addresses` (`id`, `label`, `address`, `is_default`) VALUES
(1, 'Chennai', '#12, Anna Salai, Mount Road, Chennai - 600002, Tamil Nadu', 1),
(2, 'Mumbai', 'Office No.45, Andheri East, Mumbai - 400069, Maharashtra', 0),
(3, 'Delhi', 'Shop No.8, Connaught Place, Delhi - 110001, Delhi NCR', 0);

ALTER TABLE `performainvoices` ADD COLUMN `reference_no` VARCHAR(30) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `from_address_id` INT DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `from_address_custom` TEXT DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_company` VARCHAR(200) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_address1` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_address2` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_city` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_state` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_pincode` VARCHAR(10) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `client_country` VARCHAR(100) DEFAULT 'India';
ALTER TABLE `performainvoices` ADD COLUMN `tax_type` VARCHAR(20) DEFAULT 'GST18';
ALTER TABLE `performainvoices` ADD COLUMN `custom_tax` DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `exec_name` VARCHAR(150) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `exec_phone` VARCHAR(20) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `exec_email` VARCHAR(150) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `terms_general` TINYINT(1) DEFAULT 0;
ALTER TABLE `performainvoices` ADD COLUMN `terms_tax` TINYINT(1) DEFAULT 0;
ALTER TABLE `performainvoices` ADD COLUMN `terms_project_period` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `terms_validity` TINYINT(1) DEFAULT 1;
ALTER TABLE `performainvoices` ADD COLUMN `terms_separate_orders` TEXT DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `terms_payment` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `terms_payment_custom` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `performainvoices` ADD COLUMN `terms_warranty` VARCHAR(50) DEFAULT NULL;

ALTER TABLE `performainvoice_items` ADD COLUMN `brand_model` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `performainvoice_items` ADD COLUMN `uom` VARCHAR(50) DEFAULT 'Nos';
