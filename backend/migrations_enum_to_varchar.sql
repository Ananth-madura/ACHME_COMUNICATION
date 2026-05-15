-- Migration script to convert problematic ENUMs to VARCHAR(50)
ALTER TABLE `clientinvoices` MODIFY COLUMN `category` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `contracts` MODIFY COLUMN `category` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `estimateclient` MODIFY COLUMN `category` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `fields` MODIFY COLUMN `followup_required` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `fields` MODIFY COLUMN `reminder_required` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `profile_change_requests` MODIFY COLUMN `status` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending';
ALTER TABLE `task_assignments` MODIFY COLUMN `status` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Pending';
ALTER TABLE `teammember` MODIFY COLUMN `emp_role` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Sales';
ALTER TABLE `telecalls` MODIFY COLUMN `followup_required` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `telecalls` MODIFY COLUMN `reminder_required` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'employee';
ALTER TABLE `users` MODIFY COLUMN `status` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending';
ALTER TABLE `walkins` MODIFY COLUMN `followup_required` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
ALTER TABLE `walkins` MODIFY COLUMN `reminder_required` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Default';
