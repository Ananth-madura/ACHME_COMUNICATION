# Change Report

## Overview
This report summarizes the changes made in the current workspace to fix backend startup/schema issues, scheduler errors, OTP/register/login flow, and auth persistence.

> Note: The workspace does not appear to be a Git repository, so this report is based on current file contents and visible code sections rather than a git diff.

---

## Files Changed

### 1. `backend/config/database.js` (approx. lines 33-152)
- **Why changed**: Backend startup was failing due to missing DB schema elements and incorrect auto-migration behavior.
- **What fixed**:
  - Added `runQuerySafe()` for safe `CREATE TABLE` / `ALTER TABLE` execution.
  - Added `ensureColumn()` to detect and add missing columns via `information_schema.columns`.
  - Added `ensureTablesAndColumns()` to create missing tables and add required columns:
    - `lead_reminders` with `missed_count INT DEFAULT 0`
    - `lead_escalations` with `missed_count INT DEFAULT 0`
    - `admin_notifications`
    - `users.status` enum column
    - several `assigned_to`, `created_by`, `lead_id`, `lead_type` columns used by existing routes and scheduler.
  - Ensured the schema initialization path calls `ensureTablesAndColumns()` after loading `schema.sql`.
- **Revert**:
  - Remove the `ensureColumn()` and `ensureTablesAndColumns()` functions.
  - Restore the previous database connect / initialization code block if available.
  - Remove the new `admin_notifications` and `users.status` auto-add logic if you want original schema only.

### 2. `backend/routes/authRoutes.js` (approx. lines 81-130)
- **Why changed**: Registration and login were failing due to missing `users.status`, missing admin notification support, and insufficient login persistence.
- **What fixed**:
  - Normalized email values using `trim().toLowerCase()` before database operations.
  - Stored all new registrations with `status='pending'` and created `admin_notifications` entries for each new user registration.
  - Added account approval checks during login for `pending` and `rejected` status.
  - Extended JWT token expiry from default to `14d` so login persists for two weeks.
- **Revert**:
  - Remove `status` handling from registration and login.
  - Remove the `INSERT INTO admin_notifications` query.
  - Reset the JWT expiry clause to the prior configuration (for example, `expiresIn: "1d"` or as originally configured).

### 3. `backend/backendutil/sendSms.js` (approx. lines 1-30)
- **Why changed**: OTP email sending was not resilient enough and could fail silently when the mail transporter was not ready.
- **What fixed**:
  - Added `transporter.verify()` logging to detect SMTP authentication or connection issues at startup.
  - Kept `sendEmailOtp()` unchanged but made email sending behavior more observable for debugging.
- **Revert**:
  - Remove `transporter.verify()` block.
  - Keep the original `nodemailer.createTransport()` and `sendMail()` flow.

### 4. `backend/backendutil/reminderScheduler.js` (approx. lines 11-60)
- **Why changed**: Scheduler failures were caused by missing `missed_count` and invalid `reminder_time` comparisons.
- **What fixed**:
  - Added `missed_count` handling to ensure overdue reminders are tracked.
  - Used `TIME(reminder_time) < ?` to compare stored `TIME` values correctly against the current time.
  - Added robust escalation logic after marking reminders missed.
- **Revert**:
  - Remove the `missed_count` update logic from the `UPDATE lead_reminders` query.
  - Restore the original reminder-time comparison logic if the previous code did not use `TIME(reminder_time)`.

### 5. `backend/routes/leadManagementRoutes.js` (approx. lines 70-100)
- **Why changed**: Reminder marking and escalation checks needed proper `TIME(reminder_time)` handling in SQL.
- **What fixed**:
  - Normalized the `check-missed` query to compare `TIME(reminder_time)` against the current time string.
  - Prevented invalid datetime comparisons when only a `TIME` value is stored.
- **Revert**:
  - Restore the previous `UPDATE lead_reminders` query without `TIME(reminder_time)` if desired.

### 6. `backend/schema.sql` (approx. lines 319-333)
- **Why changed**: The database schema lacked the required user status and admin notifications tables.
- **What fixed**:
  - Added `status ENUM('pending','active','rejected') DEFAULT 'pending'` to the `users` table.
  - Added the `admin_notifications` table for registration approval workflows.
- **Revert**:
  - Remove the `status` column from `CREATE TABLE IF NOT EXISTS users`.
  - Remove the `CREATE TABLE IF NOT EXISTS admin_notifications` block.

### 7. `frontend/src/auth/AuthContext.jsx` (approx. lines 6-25)
- **Why changed**: Login persistence was lost after refresh because auth state was stored in `sessionStorage`.
- **What fixed**:
  - Switched to `localStorage` so the user stays logged in across browser sessions for the token lifetime.
  - Persisted both `user` and `token` entries in local storage when logging in.
- **Revert**:
  - Replace `localStorage` calls with `sessionStorage` calls.
  - Restore the previous `useState` loader to read from session storage.

### 8. `frontend/src/auth/login.jsx` (approx. lines 1-60)
- **Why changed**: Login flow needed to pass normalized email and store the returned token in auth state.
- **What fixed**:
  - Normalized the login email with `trim().toLowerCase()`.
  - Called `login({ ...res.data.user, token: res.data.token })` on successful login.
  - Added clearer error handling for 404 and 403 responses.
- **Revert**:
  - Restore any previous login payload handling if a different auth shape was expected.
  - Remove the `token` from the `login()` call if the old flow did not use token persistence.

---

---

## New Features Added (Phase 2 - Dashboard & Reports)

### 9. Profile Page (`frontend/src/pages/profile.jsx`)
- **Why added**: Needed a user profile management page for viewing and editing user details.
- **What implemented**:
  - View mode showing user details (name, email, phone, address, company)
  - Edit mode with form fields to update profile information
  - Change Password modal with current password, new password, confirm password fields
  - Integration with backend API: `GET /api/auth/profile`, `PUT /api/auth/profile`, `POST /api/auth/change-password`
- **Files created**: `frontend/src/pages/profile.jsx`
- **Revert**: Remove the profile route from App.js and delete `profile.jsx`

### 10. Settings Page (`frontend/src/pages/settings.jsx`)
- **Why added**: Needed a comprehensive settings page for user preferences.
- **What implemented**:
  - **Theme Settings**: Light/Dark mode toggle with color scheme options
  - **Notification Settings**: Email notifications, SMS alerts, push notifications toggles
  - **Security Settings**: Two-factor authentication, session management, login history
  - **Preferences**: Language selection, timezone, date format, currency format
  - Save/Cancel buttons with local state management
- **Files created**: `frontend/src/pages/settings.jsx`
- **Revert**: Remove the settings route from App.js and delete `settings.jsx`

### 11. Backend Profile & Password Endpoints (`backend/routes/authRoutes.js`)
- **Why added**: Profile and settings pages needed backend API support.
- **What implemented**:
  - `GET /api/auth/profile` - Returns current user's profile data
  - `PUT /api/auth/profile` - Updates user profile (name, phone, address, etc.)
  - `POST /api/auth/change-password` - Validates current password and updates to new one
- **Code location**: Added new route handlers in `backend/routes/authRoutes.js`
- **Revert**: Remove the route handlers for profile and change-password

### 12. Task Accept/Decline Workflow (`backend/routes/taskRoutes.js`, `frontend/src/pages/task.jsx`)
- **Why added**: Needed workflow for employees to accept or decline assigned tasks with INR-based targets.
- **What implemented**:
  - Backend endpoint for task accept/decline: `POST /api/task/:id/respond` with `action` (accept/decline) and optional `decline_reason`
  - Admin notifications when employee declines a task
  - INR-based target system: Changed from task count to monetary amounts (INR)
  - Employee dropdown in task assignment form using `/api/teammember` endpoint
  - Display of target achievement progress in INR
- **Files modified**: `backend/routes/taskRoutes.js`, `frontend/src/pages/task.jsx`
- **Revert**: Remove accept/decline buttons and INR target logic from task.jsx

### 13. Client Dropdown in AMC Contract Form (`frontend/src/pages/amc.jsx`)
- **Why added**: AMC contract form needed to select from existing clients.
- **What implemented**:
  - Added client dropdown fetching from `/dashboard/clients` API
  - Auto-fills client details when selecting from dropdown
  - Contract value stored as exact INR (not broken down)
- **Files modified**: `frontend/src/pages/amc.jsx`
- **Revert**: Remove the client dropdown and related fetch logic

### 14. Convert to Client Buttons (`frontend/src/pages/telecalling.jsx`, `walkins.jsx`, `field.jsx`)
- **Why added**: Needed easy conversion from lead to client in Telecalling, Walkins, and Field Work pages.
- **What implemented**:
  - "Convert to Client" button on each lead row
  - Creates client record from lead data (customer_name, phone, email, address)
  - Stores lead ID and lead type in client record for tracking
  - Uses sessionStorage for cross-page data flow (`contract_prefill`, `quotation_prefill`)
- **Files modified**: `frontend/src/pages/telecalling.jsx`, `frontend/src/pages/walkins.jsx`, `frontend/src/pages/field.jsx`
- **Revert**: Remove Convert to Client buttons and client creation logic

### 15. Contract Filter in AMC Services Tab (`frontend/src/pages/amc.jsx`)
- **Why added**: Needed filtering of AMC services by contract.
- **What implemented**:
  - Contract dropdown filter in AMC services tab
  - "View Services" button to see all services for selected contract
  - Shows service details in modal/drawer
  - Quotation link in service rows to view associated quotation
- **Files modified**: `frontend/src/pages/amc.jsx`
- **Revert**: Remove contract filter and View Services functionality

### 16. Reports Page with Comprehensive Analytics (`frontend/src/pages/reports.jsx`)
- **Why added**: Needed a full-featured Reports page with Overview, By Employee, and Trends tabs.
- **What implemented**:

#### Overview Tab
- 5 summary metric cards: Total Sales, Total Leads, Services Done, Revenue, Conversion %
- Monthly Sales & Leads Trend (Line Chart with dual Y-axis)
- Revenue & Services Trend (Area Chart)
- Lead Sources Distribution (Pie Chart)
- Lead Conversion (Pie Chart)
- Employee Performance (Bar Chart)
- Detailed breakdown cards: Telecalls, Walkins, Field Visits, Total Clients
- Monthly Breakdown Table with all metrics

#### By Employee Tab
- Team Performance Summary with 5 metrics (Employees, Total Leads, Converted, Revenue, Avg Conv %)
- Employee selector dropdown to view individual employee details
- Individual employee metrics cards with detailed breakdown
- Performance Breakdown Bar Chart (Telecalls, Walkins, Field, Clients, Proposals, Contracts, Services)
- Target Achievement circular progress indicator
- All Employees Comparison Table with sorting options:
  - Sort by Leads, Revenue, Conversion, Target, Tasks
  - Columns: #, Employee, Position, Tel, Walk, Field, Leads, Conv%, Clients, Services, Revenue, Target%

#### Trends Tab
- Day/Week/Month/Year filter buttons
- 5 metric cards with gradient colors
- Daily Leads & Services Trend (Line Chart)
- Daily Sales Trend (Area Chart)
- Monthly Comparison (Bar Chart with dual Y-axis)
- Revenue by Month (Composed Chart with Area + Line)
- Detailed Trends Breakdown Table

- **Data Sources**:
  - `/api/teammember` - Employee list
  - `/api/Telecalls` - Telecalling data
  - `/api/Walkins` - Walkins data
  - `/api/Fields` - Field work data
  - `/api/client` - Client data
  - `/api/contract/with-usage` - Contract data
  - `/api/amc/amc-alc` - AMC services
  - `/api/quotations` - Quotations
  - `/api/performainvoice` - Performa invoices
  - `/api/task/targets` - Task targets
  - `/api/task` - Tasks

- **Key Functions**:
  - `normalizeName()` - Normalizes employee names for matching
  - `isEmployeeMatch()` - Matches employee names across different fields
  - `getEmployeeMetrics()` - Calculates individual employee metrics
  - `getEmployeeComparisonData` - useMemo for comparison data with sorting
  - `getMonthlyTrendData` - useMemo for monthly trend data
  - `getDailyTrendData` - useMemo for daily trend data

- **Files created/modified**: `frontend/src/pages/reports.jsx`
- **Revert**: Remove the Reports component and route

### 17. Fix useMemo Function Call Errors
- **Why fixed**: Several useMemo hooks were being called as functions causing runtime errors.
- **What fixed**:
  - Changed `getMonthlyTrendData()` to `getMonthlyTrendData` (useMemo returns array directly)
  - Changed `getDailyTrendData()` to `getDailyTrendData`
  - Changed `getEmployeeComparisonData()` to `getEmployeeComparisonData`
  - Used local variables in component functions to capture useMemo values
- **Files modified**: `frontend/src/pages/reports.jsx`
- **Revert**: Revert the function call changes

---

## Architecture & Data Flow

### Dashboard Module Interlinking
```
Leads (Telecalling/Walkins/Field)
    ↓ Convert to Client
Clients
    ↓ Create Contract
Contracts (AMC/Service)
    ↓ Create Services
Services
    ↓ Create Proposal/Quotation
Quotations → Performa Invoices
```

### Cross-Page Data Flow
- **sessionStorage**: Used for prefilling data between pages
  - `contract_prefill` - Prefill contract form from lead conversion
  - `quotation_prefill` - Prefill quotation form from service

### Employee Matching System
- Uses `normalizeName()` to handle various name formats
- Matches by: exact match, partial match (includes), reverse includes
- Checks fields: `staff_name`, `assigned_to`, `service_person`, `created_by`

### API Endpoints Summary
| Endpoint | Purpose |
|----------|---------|
| GET /api/auth/profile | Get user profile |
| PUT /api/auth/profile | Update profile |
| POST /api/auth/change-password | Change password |
| POST /api/task/:id/respond | Accept/Decline task |
| GET /api/task/targets | Get INR-based targets |
| GET /api/teammember | Get team members for dropdowns |

---

## Notes
- Existing runtime issues were addressed in both backend and frontend.
- Because this workspace is not a Git repository, there is no native `.git diff` to produce exact patch metadata.
- If you need a full rollback, copy this file list and remove or restore the changed sections manually.
- All new features use socket.io for live updates where applicable
- Forms validate required fields before submission
- Contract value stored as exact INR (not broken down)
