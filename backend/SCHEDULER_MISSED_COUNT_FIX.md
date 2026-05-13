# Scheduler `missed_count` Fix

## Problem
The backend scheduler failed with this error:

`[Scheduler] check-missed error: Unknown column 'missed_count' in 'field list'`

This happens when the `lead_reminders` table exists but does not have the `missed_count` column.

## Why this occurred
- The project previously created `lead_reminders`, `lead_activity`, and `lead_escalations` tables separately.
- The existing `backend/schema.sql` file did not include the new reminder/escalation tables.
- When the app connected to the database, the scheduler started before missing columns were created.

## What changed
1. `backend/config/database.js`
   - Now initializes the schema from `backend/schema.sql`.
   - Automatically creates `lead_reminders`, `lead_activity`, and `lead_escalations` if they are missing.
   - Safely adds missing columns such as `lead_reminders.missed_count`, `lead_escalations.missed_count`, and other required migration columns.
   - Continues if tables or columns already exist.

2. `backend/schema.sql`
   - Added definitions for `lead_reminders`, `lead_activity`, and `lead_escalations`.
   - Included `missed_count` in the `lead_reminders` and `lead_escalations` tables.

## How to verify
1. Start the backend with `npm run dev` in `backend/`.
2. Confirm the logs show:
   - `MySQL Connected`
   - `Database initialized successfully`
   - `Create table lead_reminders` / `lead_reminders.missed_count exists`
3. Confirm the scheduler starts without the `check-missed` error.

## Notes
- If your database is already populated, the startup code will only create missing tables/columns.
- Existing tables and columns are preserved.
