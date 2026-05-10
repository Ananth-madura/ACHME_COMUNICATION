-- ============================================
-- Migration: Add new columns for Achme Updates
-- Run this SQL against your MySQL database
-- ============================================

-- 1. Add 'reference' column to Telecalls table
ALTER TABLE Telecalls ADD COLUMN IF NOT EXISTS reference VARCHAR(255) DEFAULT NULL;

-- 2. Add 'reference' column to Walkins table
ALTER TABLE Walkins ADD COLUMN IF NOT EXISTS reference VARCHAR(255) DEFAULT NULL;

-- 3. Add 'reference' column to fields table
ALTER TABLE fields ADD COLUMN IF NOT EXISTS reference VARCHAR(255) DEFAULT NULL;

-- 4. Add 'quotation_count' column to teammember table
ALTER TABLE teammember ADD COLUMN IF NOT EXISTS quotation_count INT DEFAULT 0;

-- 5. Add 'issues' column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS issues TEXT DEFAULT NULL;
