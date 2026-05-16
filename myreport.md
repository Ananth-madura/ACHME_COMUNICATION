# Change Report

## Overview
This document captures the evolution of the current workspace—from initial setup through feature expansion. The journey addressed backend startup and schema concerns, resolved scheduler errors, established a structured OTP/register/login flow, and implemented robust auth persistence. Each phase built upon the previous, creating a more cohesive system.

---

## Files Changed

### 1. `backend/config/database.js` (approx. lines 33-152)
Backend startup was experiencing failures due to missing DB schema elements and incorrect auto-migration behavior. The system needed a more robust approach to schema initialization.

- **What was addressed**:
  - Added `runQuerySafe()` for safe `CREATE TABLE` / `ALTER TABLE` execution.
  - Added `ensureColumn()` to detect and add missing columns via `information_schema.columns`.
  - Added `ensureTablesAndColumns()` to create missing tables and add required columns:
    - `lead_reminders` with `missed_count INT DEFAULT 0`
    - `lead_escalations` with `missed_count INT DEFAULT 0`
    - `admin_notifications`
    - `users.status` enum column
    - several `assigned_to`, `created_by`, `lead_id`, `lead_type` columns used by existing routes and scheduler.
  - Ensured the schema initialization path calls `ensureTablesAndColumns()` after loading `schema.sql`.
- **Rolling back**: Removing the `ensureColumn()` and `ensureTablesAndColumns()` functions would return to the previous approach. Restoring the original database connect/initialization block would undo these schema adjustments. The new `admin_notifications` and `users.status` auto-add logic could be removed if keeping the original schema only was preferred.

> *Created by ANNATH-dev* - Should additional schema tables be documented in future iterations?

### 2. `backend/routes/authRoutes.js` (approx. lines 81-130)
The registration and login flow needed attention—missing user status fields, lack of admin notification support, and insufficient session persistence were creating friction in the authentication flow.

- **What was addressed**:
  - Normalized email values using `trim().toLowerCase()` before database operations.
  - New registrations now receive `status='pending'` with admin notification entries created for each signup.
  - Account approval checks were added during login to handle `pending` and `rejected` status states.
  - JWT token expiry extended from default to `14d`, allowing login to persist across browser sessions for two weeks.
- **Rolling back**: Removing the `status` handling from registration and login would reverse the approval flow. The `INSERT INTO admin_notifications` query could be removed. Resetting the JWT expiry clause to prior configuration (for example, `expiresIn: "1d"`) would shorten session persistence.

> *Created by ANNATH-dev* - Is the 14d token expiry working as expected for your use case?

### 3. `backend/backendutil/sendSms.js` (approx. lines 1-30)
Email delivery needed to be more resilient—the OTP sending process could fail silently when the mail transporter wasn't properly initialized or authenticated.

- **What was addressed**:
  - Added `transporter.verify()` logging to detect SMTP authentication or connection issues at startup.
  - Kept `sendEmailOtp()` unchanged while making email sending behavior more observable for debugging.
- **Rolling back**: Removing the `transporter.verify()` block would revert to the original simpler approach. Keeping the original `nodemailer.createTransport()` and `sendMail()` flow would maintain less visibility into SMTP issues.

> *Created by ANNATH-dev* - Would you like to add SMS delivery tracking in future updates?

### 4. `backend/backendutil/reminderScheduler.js` (approx. lines 11-60)
The scheduler was experiencing failures—missing `missed_count` tracking and invalid `reminder_time` comparisons were causing reminders to slip through without proper escalation handling.

- **What was addressed**:
  - Added `missed_count` handling to ensure overdue reminders are tracked properly.
  - Implemented `TIME(reminder_time) < ?` comparison to correctly match stored `TIME` values against the current time.
  - Built robust escalation logic that triggers after marking reminders as missed.
- **Rolling back**: Removing the `missed_count` update logic from the `UPDATE lead_reminders` query would undo the tracking enhancement. Restoring the original reminder-time comparison logic (if the previous code didn't use `TIME(reminder_time)`) would revert to the earlier approach.

> *Created by ANNATH-dev* - Is the escalation timing configured correctly for your team's workflow?

### 5. `backend/routes/leadManagementRoutes.js` (approx. lines 70-100)
Reminder marking and escalation checks needed proper `TIME(reminder_time)` handling in SQL queries.

- **What was addressed**:
  - Normalized the `check-missed` query to compare `TIME(reminder_time)` against the current time string.
  - Prevented invalid datetime comparisons when only a `TIME` value is stored.
- **Rolling back**: Restoring the previous `UPDATE lead_reminders` query without `TIME(reminder_time)` would return to the simpler approach.

> *Created by ANNATH-dev* - Are there any additional reminder rules or conditions that should be added?

### 6. `backend/schema.sql` (approx. lines 319-333)
The database schema was missing key elements for user status tracking and admin notification workflows.

- **What was addressed**:
  - Added `status ENUM('pending','active','rejected') DEFAULT 'pending'` to the `users` table.
  - Created the `admin_notifications` table to support registration approval workflows.
- **Rolling back**: Removing the `status` column from `CREATE TABLE IF NOT EXISTS users` would undo the user status tracking. Deleting the `CREATE TABLE IF NOT EXISTS admin_notifications` block would remove notification support.

> *Created by ANNATH-dev* - Should the status enum values be expandable (e.g., 'suspended', 'archived')?

### 7. `frontend/src/auth/AuthContext.jsx` (approx. lines 6-25)
Authentication state was being lost on page refresh because it was stored in `sessionStorage`, which cleared when the browser closed.

- **What was addressed**:
  - Switched to `localStorage` so users remain logged in across browser sessions for the full token lifetime.
  - Both `user` and `token` entries are now persisted in local storage upon login.
- **Rolling back**: Replacing `localStorage` calls with `sessionStorage` calls would return to session-only persistence. The previous `useState` loader could be restored to read from session storage instead.

> *Created by ANNATH-dev* - Would you like to add a token refresh mechanism for extended sessions?

### 8. `frontend/src/auth/login.jsx` (approx. lines 1-60)
The login flow needed adjustment—email normalization was inconsistent and the returned token wasn't being stored properly in auth state.

- **What was addressed**:
  - Normalized the login email with `trim().toLowerCase()` for consistent matching.
  - The login function now calls `login({ ...res.data.user, token: res.data.token })` on successful authentication.
  - Added clearer error handling for 404 and 403 responses.
- **Rolling back**: Restoring any previous login payload handling would revert to prior auth shape. Removing the `token` from the `login()` call would undo token persistence in the flow.

> *Created by ANNATH-dev* - Would you like to add a "remember me" checkbox option?

---

## New Features Added (Phase 2 - Dashboard & Reports)

### 9. Profile Page (`frontend/src/pages/profile.jsx`)
A user profile management page became necessary for viewing and editing personal details directly in the application.

- **How it came together**:
  - View mode displays user details: name, email, phone, address, company
  - Edit mode provides form fields to update profile information
  - Change Password modal includes current password, new password, and confirm password fields
  - Backend integration through: `GET /api/auth/profile`, `PUT /api/auth/profile`, `POST /api/auth/change-password`
- **Files created**: `frontend/src/pages/profile.jsx`
- **Rolling back**: Removing the profile route from App.js and deleting `profile.jsx` would undo this feature.

> *Created by ANNATH-dev* - Is profile photo upload functionality needed?

### 10. Settings Page (`frontend/src/pages/settings.jsx`)
A comprehensive settings page emerged to give users control over their preferences and security options.

- **How it came together**:
  - **Theme Settings**: Light/Dark mode toggle with color scheme options
  - **Notification Settings**: Email notifications, SMS alerts, push notifications toggles
  - **Security Settings**: Two-factor authentication, session management, login history
  - **Preferences**: Language selection, timezone, date format, currency format
  - Save/Cancel buttons with local state management
- **Files created**: `frontend/src/pages/settings.jsx`
- **Rolling back**: Removing the settings route from App.js and deleting `settings.jsx` would undo this feature.

> *Created by ANNATH-dev* - Are there additional setting categories that should be included?

### 11. Backend Profile & Password Endpoints (`backend/routes/authRoutes.js`)
The profile and settings pages required corresponding backend API support to function properly.

- **How it came together**:
  - `GET /api/auth/profile` - Returns current user's profile data
  - `PUT /api/auth/profile` - Updates user profile (name, phone, address, etc.)
  - `POST /api/auth/change-password` - Validates current password and updates to new one
- **Code location**: New route handlers added in `backend/routes/authRoutes.js`
- **Rolling back**: Removing the route handlers for profile and change-password would revert these additions.

> *Created by ANNATH-dev* - Should a profile picture upload endpoint be added?

### 12. Task Accept/Decline Workflow (`backend/routes/taskRoutes.js`, `frontend/src/pages/task.jsx`)
A workflow for employees to respond to assigned tasks became essential—with INR-based targets replacing simple task counts.

- **How it came together**:
  - Backend endpoint `POST /api/task/:id/respond` accepts `action` (accept/decline) with optional `decline_reason`
  - Admin notifications trigger when an employee declines a task
  - INR-based target system: shifted from task count to monetary amounts
  - Employee dropdown in task assignment form pulls from `/api/teammember` endpoint
  - Target achievement progress displays in INR
- **Files modified**: `backend/routes/taskRoutes.js`, `frontend/src/pages/task.jsx`
- **Rolling back**: Removing the accept/decline buttons and INR target logic from task.jsx would undo this workflow.

> *Created by ANNATH-dev* - Would you like to add task comments/notes functionality?

### 13. Client Dropdown in AMC Contract Form (`frontend/src/pages/amc.jsx`)
The AMC contract form needed to select from existing clients rather than requiring manual entry of client details.

- **How it came together**:
  - Client dropdown fetches data from `/dashboard/clients` API
  - Client details auto-fill when selecting from the dropdown
  - Contract value stores as exact INR (not broken into components)
- **Files modified**: `frontend/src/pages/amc.jsx`
- **Rolling back**: Removing the client dropdown and related fetch logic would revert to manual entry.

> *Created by ANNATH-dev* - Would a searchable client dropdown be helpful?

### 14. Convert to Client Buttons (`frontend/src/pages/telecalling.jsx`, `walkins.jsx`, `field.jsx`)
Making it easier to convert leads to clients across Telecalling, Walkins, and Field Work pages improved the user workflow significantly.

- **How it came together**:
  - "Convert to Client" button added to each lead row
  - Client record creates from lead data: customer_name, phone, email, address
  - Lead ID and lead type stored in client record for tracking
  - Cross-page data flow handled through sessionStorage (`contract_prefill`, `quotation_prefill`)
- **Files modified**: `frontend/src/pages/telecalling.jsx`, `frontend/src/pages/walkins.jsx`, `frontend/src/pages/field.jsx`
- **Rolling back**: Removing the Convert to Client buttons and client creation logic would return to the earlier approach.

> *Created by ANNATH-dev* - Should a bulk lead conversion option be added?

### 15. Contract Filter in AMC Services Tab (`frontend/src/pages/amc.jsx`)
Filtering AMC services by contract became important for better organization and quick access to related services.

- **How it came together**:
  - Contract dropdown filter added in AMC services tab
  - "View Services" button reveals all services for selected contract
  - Service details appear in modal/drawer
  - Quotation link included in service rows to view associated quotation
- **Files modified**: `frontend/src/pages/amc.jsx`
- **Rolling back**: Removing the contract filter and View Services functionality would revert to the unfiltered view.

> *Created by ANNATH-dev* - Should a date range filter be added to the services view?

### 16. Reports Page with Comprehensive Analytics (`frontend/src/pages/reports.jsx`)
A full-featured Reports page developed to provide deep insights across Overview, By Employee, and Trends tabs.

- **How it came together**:

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
- Employee selector dropdown for viewing individual employee details
- Individual employee metrics cards with detailed breakdown
- Performance Breakdown Bar Chart (Telecalls, Walkins, Field, Clients, Proposals, Contracts, Services)
- Target Achievement circular progress indicator
- All Employees Comparison Table with sorting:
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

- **Data pull from**:
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

- **Supporting functions**:
  - `normalizeName()` - Normalizes employee names for matching
  - `isEmployeeMatch()` - Matches employee names across different fields
  - `getEmployeeMetrics()` - Calculates individual employee metrics
  - `getEmployeeComparisonData` - useMemo for comparison data with sorting
  - `getMonthlyTrendData` - useMemo for monthly trend data
  - `getDailyTrendData` - useMemo for daily trend data

- **Files created/modified**: `frontend/src/pages/reports.jsx`
- **Rolling back**: Removing the Reports component and its route would undo this feature.

> *Created by ANNATH-dev* - Would you like to add PDF/Excel export functionality?

### 17. Fix useMemo Function Call Errors
Several useMemo hooks were being called as functions, causing runtime errors in the application.

- **What was addressed**:
  - Changed `getMonthlyTrendData()` to `getMonthlyTrendData` (useMemo returns array directly)
  - Changed `getDailyTrendData()` to `getDailyTrendData`
  - Changed `getEmployeeComparisonData()` to `getEmployeeComparisonData`
  - Used local variables in component functions to capture useMemo values properly
- **Files modified**: `frontend/src/pages/reports.jsx`
- **Rolling back**: Reverting the function call changes would return the errors.

> *Created by ANNATH-dev* - Should performance monitoring be added to track rendering issues?

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

## Additional Considerations
A few guiding principles shaped these developments throughout the journey:

- Runtime issues encountered during development were addressed in both backend and frontend, creating a more stable foundation.
- Since this workspace doesn't function as a Git repository, tracking changes happened through careful review of the codebase itself rather than native diffs—a manual but thorough approach to documenting progress.
- Socket.io integration found its way into real-time features where live updates made sense for the user experience.
- Form validation ensures required fields are captured before submission, maintaining data integrity.
- Contract values store as exact INR amounts rather than broken into separate components, simplifying financial tracking.

For anyone looking to understand the flow of how this system came together, tracing through the data relationships—leads flowing into clients, clients into contracts, contracts into services—reveals the natural progression. The employee matching system ties it all together, connecting work across Telecalling, Walkins, Field Work, and reporting.

---

## Role-Based Access Control Implementation (Phase 3 - RBAC)

### Overview
Implemented strict role-based access control (admin / subadmin / employee) across the application. Employee role gets read/create only, subadmin gets full access except user management, and admin gets full access. Subadmin role can be assigned by admin from the team page.

---

### 18. Subadmin Role Support in Auth Middleware (`backend/middleware/authMiddleware.js`)

The authentication middleware needed to recognize a new `subadmin` role that sits between employee and admin in permission hierarchy.

- **What was addressed**:
  - `isAdmin` middleware updated to allow both `admin` and `subadmin` roles: `req.user.role !== "admin" && req.user.role !== "subadmin"`
  - Added new `isReadOnly` middleware to block PUT/DELETE for employee role
  - Role checking pattern: `const role = req.user?.role || "employee"`
- **Rolling back**: Restoring the `isAdmin` check to only allow `"admin"` would revert to admin-only access.

> *Done by ananth-dev* - Should a `manager` role be added in future?

---

### 19. All PUT/DELETE Routes Protected with `isAdmin` (`backend/routes/`)

34 PUT/DELETE routes across 16 backend files were updated to include `isAdmin` permission middleware.

- **Files modified** (all PUT/DELETE routes now have `isAdmin`):
  - `serviceRoutes.js` — service CRUD (image upload fixed)
  - `newclient.js` — client CRUD (full client fields)
  - `amcRoutes.js` — service type + payment fields, contract CRUD
  - `taskRoutes.js` — task CRUD (priority validation fixed, safe default "Medium")
  - `fieldRoutes.js` — field work CRUD
  - `telecallRoutes.js` — telecalling CRUD
  - `walkinRoutes.js` — walkins CRUD
  - `estimate.js` — estimate CRUD
  - `callReportRoutes.js` — call report CRUD (service types fixed: Warranty/Installation/Service Call)
  - `leadManagementRoutes.js` — lead management CRUD
  - `notificationRoutes.js` — notifications CRUD
  - `contract.js` — contract CRUD
  - `invoice.js` — invoice CRUD
  - `quotationRoutes.js` — quotation CRUD
  - `performaInvoiceRoutes.js` — performa invoice CRUD
  - `unifiedInvoiceRoute.js` — unified invoice CRUD

- **Rolling back**: Removing `isAdmin` from any route's middleware array would revert that route to being accessible by any authenticated user.

> *Done by ananth-dev* - Is the permission hierarchy aligned with the team's org structure?

---

### 20. Role Assignment Endpoint (`backend/routes/authRoutes.js`)

Admin needed a way to assign or change a user's system role (employee → subadmin → admin) after account creation.

- **What was added**:
  - `PUT /api/auth/change-role/:id` — allows admin to change any user's role
  - `POST /api/auth/create-user` — now accepts and saves `system_role` field (defaults to "employee")
  - `PUT /api/auth/update-user/:id` — now saves `role` field
- **Rolling back**: Removing the change-role route handler and reverting create-user/update-user to ignore role fields would undo these additions.

> *Done by ananth-dev* - Should subadmin be able to assign roles to employees?

---

### 21. Team Member Page — Role-Based UI (`frontend/src/pages/teammember.jsx`)

The team page needed a modern role-aware interface showing user roles with badges and a role change modal for admins.

- **What was added**:
  - Access column with color-coded badges: admin (blue), subadmin (orange), employee (gray)
  - Zap icon button to open role change modal (admin only)
  - Role Change modal with role selector (Employee/Sub-Admin/Admin) and permission explanation
  - Admin sees: Add, Edit, Delete, Assign Task, Change Role buttons
  - Subadmin sees: Assign Task button only
  - Employee sees: View + Email buttons only
  - `fetchTeam()` uses `/api/teammember/admin` for admin/subadmin, `/api/teammember` for employee
- **Backend updated**: `GET /api/teammember` and `GET /api/teammember/admin` now join `users` table to return `user_role`
- **Files modified**: `backend/routes/team.js`, `frontend/src/pages/teammember.jsx`
- **Rolling back**: Removing the role column, role change modal, and conditional button rendering from team member page would revert to the original view.

> *Done by ananth-dev* - Should a role history log be added to track role changes?

---

### 22. User Management Page — System Role Dropdown (`frontend/src/pages/usermanagement.jsx`)

The user management page needed a System Role field when creating users to set initial role.

- **What was added**:
  - System Role dropdown (Employee/Sub-Admin/Admin) in the create user form
  - Default role: "employee"
  - Form state includes `system_role` field
  - Badge display for subadmin in user list (orange)
  - Role selector in edit mode
- **Rolling back**: Removing the System Role dropdown and reverting formData to exclude `system_role` would undo this addition.

> *Done by ananth-dev* - Should user role be editable from the user management list itself?

---

### 23. Database Auto-Migration (`backend/config/database.js`)

New columns needed to be available in the database without manual migration steps.

- **What was added**:
  - `ensureColumn()` added to `database.js` — detects and adds missing columns via `information_schema`
  - Auto-migration runs on server startup ensuring all new fields exist:
    - `task_description` in tasks table
    - `user_role` / `system_role` in users table
    - `service_type`, `cost_breakdown`, `payment_status` in amc_services table
    - `assigned_to`, `created_by`, `lead_id`, `lead_type` across relevant tables
- **Rolling back**: Disabling the `ensureTablesAndColumns()` call in database initialization would prevent auto-migration on startup.

> *Done by ananth-dev* - Should migration status be logged to a separate table?

---

### 24. Role-Based Button Visibility Across Frontend Pages

Edit and Delete buttons were conditionally hidden for employee role across all listing pages to enforce the permission matrix.

- **Pages updated with `canEditDelete` check** (shows buttons only for admin/subadmin):
  - `estimate.jsx` — Edit button wrapped with `canEditDelete`
  - `quotation.jsx` — Edit + Delete buttons wrapped with `canEditDelete`
  - `contract.jsx` — Edit + Delete buttons wrapped with `canEditDelete`
  - `invoice.jsx` — Edit + Delete buttons wrapped with `canEditDelete`
  - `clients.jsx` — Edit button in list + detail modal, Delete button wrapped with `canEditDelete`
  - `products.jsx` — Delete button wrapped with `canEditDelete`
  - `amc.jsx` — Delete buttons for both contracts and services wrapped with `canEditDelete`
  - `task.jsx` — already had role checks (verified)
  - `field.jsx` — already had role checks (verified)
- **Pattern used**: `const canEditDelete = userRole === "admin" || userRole === "subadmin"`
- **Rolling back**: Removing the conditional wrappers from any button would make it visible to all roles.

> *Done by ananth-dev* - Should a tooltip explain why buttons are hidden for employees?

---

### 25. Task Description Field (`backend/routes/taskRoutes.js`, `frontend/src/pages/task.jsx`)

Tasks needed a description field to capture detailed task information.

- **What was added**:
  - `task_description TEXT` column added to tasks table (via auto-migration)
  - Backend routes updated to include `task_description` in INSERT and UPDATE queries
  - Frontend task form added description textarea input
  - Task detail modal displays description with proper formatting
  - Priority validation added (safe default "Medium" on invalid input)
- **Files modified**: `backend/routes/taskRoutes.js`, `frontend/src/pages/task.jsx`
- **Rolling back**: Removing `task_description` from queries and form fields would revert to the original task system.

> *Done by ananth-dev* - Should task description support rich text formatting?

---

### 26. Target Auto-Creation Fix (`backend/routes/taskRoutes.js`)

Target updates were failing when no target record existed for an employee.

- **What was addressed**:
  - Target update endpoint now auto-creates default target (monthly: 0, calls: 0, visits: 0) if none exists before updating
  - Graceful error recovery on task priority (defaults to "Medium")
- **Rolling back**: Removing the auto-creation logic from the target update endpoint would revert to failing on missing target records.

> *Done by ananth-dev* - Should default targets be configurable per employee?

---

### 27. Call Report Service Types Fix (`backend/routes/callReportRoutes.js`, `frontend/src/pages/callreport.jsx`)

Call report service types needed to match the expected service types (Warranty/Installation/Service Call) with conditional Cost Breakdown and Payment Status fields.

- **What was fixed**:
  - Service type values normalized to match expected enums
  - Cost Breakdown section shown only for "Service Call" type
  - Payment Status shown only for "Service Call" and "Installation" types
- **Rolling back**: Reverting the conditional rendering in callreport.jsx and removing type normalization in callReportRoutes.js would return to the previous behavior.

> *Done by ananth-dev* - Should additional service types be added?

---

### 28. Products/Service Image Upload Fix (`backend/routes/serviceRoutes.js`)

Image upload was failing for products/services due to missing multipart header handling and empty image values.

- **What was fixed**:
  - Service routes now handle empty image values gracefully
  - Multipart form-data header explicitly set for upload requests
  - `backend/uploads/` folder created for service image storage
- **Rolling back**: Removing the empty check and explicit header setting would revert to the broken upload behavior.

> *Done by ananth-dev* - Should image compression be added for large uploads?

---

### 29. Clients Page Modern UI (`frontend/src/pages/clients.jsx`)

The clients page received a comprehensive UI overhaul with new fields and stats display.

- **What was updated**:
  - New fields: source, customer type (Individual/Company), GST number, industry, company size
  - Stats row at top: Total Clients, Active, New This Month, With Contracts
  - Modern card-based layout with search and filter
  - Client details modal with full information display
  - Commented out Excel download button (pending library installation)
- **Rolling back**: Reverting to the previous table-based layout would undo the UI modernization.

> *Done by ananth-dev* - Should client categories/tags be added for filtering?

---

## Permission Matrix

| Action | Employee | Sub-Admin | Admin |
|--------|----------|-----------|-------|
| View Records | ✅ | ✅ | ✅ |
| Create Records | ✅ | ✅ | ✅ |
| Edit Records | ❌ | ✅ | ✅ |
| Delete Records | ❌ | ✅ | ✅ |
| Assign Tasks | ❌ | ✅ | ✅ |
| Change User Role | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ✅ |

---

## API Endpoints Summary (RBAC)

| Endpoint | Method | Access |
|----------|--------|--------|
| `/api/auth/create-user` | POST | Admin only |
| `/api/auth/update-user/:id` | PUT | Admin only |
| `/api/auth/change-role/:id` | PUT | Admin only |
| All other CRUD routes | PUT/DELETE | Admin + Sub-Admin |
| All GET routes | GET | All authenticated users |

---

## ESLint Warning Fixes — Zero-Warning Build (Phase 4 - Code Quality)

### Overview
Fixed all ESLint `no-unused-vars` and `react-hooks/exhaustive-deps` warnings across 9 frontend files without removing any functionality. All unused imports, variables, and functions were properly removed or utilized. Corrupted edits from initial attempts were repaired to restore full compilation.

---

### 30. Unused Import & Variable Cleanup (9 Files)

Multiple files had imported icons, utilities, and declared variables that were never used, causing ESLint warnings during build.

- **Files modified**:
  - `frontend/src/components/ClientSearchDropdown.jsx` — Removed unused `Mail` icon import
  - `frontend/src/components/invoicetemplate.jsx` — Removed unused `BANK_DETAILS`, `Card`, `LogoSVG`, `HeaderWaves` definitions
  - `frontend/src/pages/callreport.jsx` — Removed unused `AlertCircle`, `Eye`, `ArrowRight`, `TrendingUp` imports; removed unused `selectedContract`, `reports`, `performance`, `totalUsed` variables
  - `frontend/src/pages/clients.jsx` — Removed unused `FileText`, `Users`, `UserCheck`, `Calendar`, `Hash`, `CreditCard` imports; removed unused `downloadExcel` function
  - `frontend/src/pages/estimateinvoice.jsx` — Removed unused `PlusCircle`, `ChevronDown` imports; removed unused `calculateTotals`, `html2pdf`, `INDIAN_STATES`, `GST_STATE_MAP`, `showAddAddress`, `handleAddAddress`, `handleDeleteAddress`, `historySelectedId`; added `eslint-disable-next-line` for useEffect dependency array
  - `frontend/src/pages/performainvoice.jsx` — Removed unused `PlusCircle`, `ChevronDown`, `calculateTotals`, `html2pdf`, `handleDeleteAddress`, `handleDescInput`, `addItem`; restored `BRANCH_DATA`/`BRANCH_OPTIONS` imports; restored `showAddAddress` state
  - `frontend/src/pages/products.jsx` — Added `fetchServices` to useEffect dependency array
  - `frontend/src/pages/quotation.jsx` — Removed unused `historySelectedId`, `historySearch`; added `eslint-disable-next-line` for useEffect dependency array
  - `frontend/src/pages/serviceestimation.jsx` — Removed unused `PlusCircle`, `ChevronDown`, `calculateTotals`, `html2pdf`, `handleDeleteAddress`, `handleDescInput`, `addItem`, `historySelectedId`; restored `BRANCH_DATA`/`BRANCH_OPTIONS` imports

- **Key approach**:
  - Removed only imports/variables that were genuinely unused (not referenced anywhere in the component)
  - Preserved all functionality — no features were removed
  - Used `// eslint-disable-next-line react-hooks/exhaustive-deps` for useEffect hooks where adding dependencies would cause infinite loops
  - Fixed corrupted edits from initial batch operations (duplicate imports, missing function names, broken JSX)

- **Rolling back**: Re-adding the removed imports and variable declarations would restore the warnings.

> *Done by ananth-dev* - Should a pre-commit ESLint check be added to prevent future warnings?

---

*Document updated by ananth-dev*
