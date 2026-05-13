# ACHME Communication – Full Stack Diagnostic Report

## Project Scope
This report analyzes the frontend, backend, socket layer, API integration, and SQL interaction across the CRM system.

Focus areas checked:
- Employee → Task → Target flow
- Lead creation and conversion flow
- Dashboard stability
- Notification system
- API synchronization
- SQL consistency
- Socket events
- Data fetching reliability
- State management
- Backend route behavior
- Database schema assumptions

---

# Critical System Findings

## 1. Employee Data Not Fetching Into Task/Target System

### Problem
Employee-related targets and tasks are failing because the system relies heavily on `user_name` instead of stable identifiers like `user_id`.

### Files Involved
- `backend/routes/targetRoutes.js`
- frontend task/target pages
- SQL tables: `task_targets`, `task_updates`, `task_achievements`

### Root Cause
The backend searches targets using:

- `WHERE user_name = ?`

instead of using:

- `user_id`

This causes multiple failures:

- Employee rename breaks target tracking
- Username mismatch prevents fetch
- Duplicate names create collisions
- Frontend may send different casing/spaces
- SQL joins become unreliable

### Why It Crashes
When a task/target lookup fails:

- rows become empty
- frontend receives `null`
- UI expects object data
- rendering crashes or shows empty state forever

### Corrective Solution
- Convert all target/task relationships to `user_id`
- Keep `user_name` only for display
- Create SQL foreign key relationships
- Validate employee existence before assigning target
- Normalize all employee identifiers in backend middleware
- Add fallback handling when target is missing

### Recommended Database Fix
- Add indexed `user_id`
- Add foreign key constraint
- Prevent orphan task records

---

# 2. Task Assignment Flow Breakage

### Problem
Tasks can be assigned inconsistently or fail silently.

### Root Cause
The backend inserts task records before validating:

- employee existence
- role permissions
- target existence
- active status

The notification system also emits events before confirming database success.

### Failure Pattern
1. Frontend submits task
2. Backend inserts partial record
3. Notification emits
4. SQL insert fails later
5. UI thinks task exists
6. Employee never receives actual task

### Corrective Solution
- Use transaction-based inserts
- Validate employee first
- Validate target ownership
- Emit socket notification only after SQL success
- Return unified response schema
- Add rollback logic on failure

---

# 3. Target Achievement Tracking Not Updating Correctly

### File
`backend/routes/targetRoutes.js`

### Problem
Achievement tracking depends on month formatting consistency.

### Root Cause
The system uses:

- `new Date().toISOString().slice(0, 7)`

while SQL uses:

- `DATE_FORMAT(NOW(), '%Y-%m')`

Timezone mismatches can cause:

- month offset
- duplicate month entries
- missing achievements
- incorrect pending amount

### Corrective Solution
- Standardize month handling entirely inside SQL
- Use UTC consistently
- Store normalized date values
- Prevent duplicate month records with unique constraints

---

# 4. Notification System Double Event Bug

### Files
- `frontend/src/context/NotificationContext.jsx`
- `backend/sockets/notifications.js`

### Problem
Admin notifications are registered twice.

### Root Cause
The frontend attaches:

- `socket.on("new_notification")`

multiple times for admins.

This creates:

- duplicate notifications
- incorrect unread counts
- memory leaks
- repeated renders
- notification spam

### Why It Happens
One listener handles all users.
Another listener is added specifically for admins.
Both receive the same socket event.

### Corrective Solution
- Separate admin and employee event names
- Register listener once
- Clean listeners before re-registering
- Use scoped notification channels
- Add socket lifecycle logging

---

# 5. Notification Read Sync Failure

### Problem
Read state becomes inconsistent between frontend and database.

### Root Cause
The frontend updates local state immediately before backend confirmation.

If SQL update fails:

- frontend says read
- backend still unread
- refresh restores unread notifications

### Corrective Solution
- Wait for backend confirmation before updating UI
- Add optimistic update rollback
- Add notification sync reconciliation on refresh

---

# 6. Lead Creation Failure

### Problem
Leads sometimes fail creation or save partially.

### Likely Root Causes
Observed architecture suggests:

- inconsistent field naming
- nullable SQL assumptions
- frontend payload mismatch
- missing validation middleware

### Failure Indicators
- lead page unable to create
- partial save
- conversion failure later
- dashboard counts mismatch

### Corrective Solution
- Create centralized lead schema validator
- Validate required fields before SQL insert
- Add backend logging for rejected payloads
- Normalize frontend form structure
- Add SQL NOT NULL rules carefully

---

# 7. Lead Conversion to Client Broken

### Problem
Lead conversion pipeline is structurally weak.

### Root Cause
The system appears to store leads and clients separately without transactional migration.

Likely failures:

- lead converts but client insert fails
- client creates but lead status remains old
- dashboard counts become incorrect
- conversion history disappears

### Corrective Solution
- Use single conversion transaction
- Update lead status only after client creation succeeds
- Preserve conversion audit history
- Add rollback support
- Create unified lead lifecycle states

### Recommended Lifecycle
- New
- Contacted
- Qualified
- Proposal
- Negotiation
- Converted
- Disqualified

---

# 8. Dashboard Fetch Instability

### File
`frontend/src/dashboards/admindashboard.jsx`

### Problem
Dashboard fetch architecture is overloaded.

### Root Cause
Dashboard executes many parallel requests:

- Telecalls
- Walkins
- Fields
- Team
- Invoices
- Pending users
- Escalations

One API failure can destabilize dashboard rendering.

### Additional Issue
Fallback requests duplicate traffic.

This creates:
- API storms
- unnecessary renders
- race conditions
- slow loading
- duplicated state updates

### Corrective Solution
- Split dashboard into modular fetch groups
- Use independent loading states
- Cache dashboard data
- Add request cancellation
- Use retry policy instead of duplicate fallback fetch

---

# 9. Socket Refresh Flooding

### Problem
Dashboard refreshes excessively.

### Root Cause
The dashboard listens for:

- `data_changed`

and fully refetches all APIs every event.

### Impact
- CPU spikes
- frontend lag
- SQL load increase
- duplicate network traffic
- UI flickering

### Corrective Solution
- Emit granular events
- Refresh only affected sections
- Debounce socket refreshes
- Use React Query or SWR caching

---

# 10. Lead Utility Date Logic Issues

### File
`frontend/src/utils/leadutil.js`

### Problem
Date calculations rely on browser local timezone.

### Root Cause
Using raw:

- `new Date(dateStr)`

creates timezone shifts.

### Impact
- leads appear on wrong day
- monthly counts incorrect
- dashboard metrics mismatch
- followup dates drift

### Corrective Solution
- Store dates in UTC
- Normalize before comparison
- Use consistent timezone formatting
- Avoid browser-local calculations for business logic

---

# 11. Missing Backend Validation Layer

### Problem
Many routes directly trust frontend input.

### Risks
- invalid SQL data
- runtime crashes
- empty inserts
- corrupted reporting
- security exposure

### Corrective Solution
Introduce:

- request validation middleware
- schema validation
- type checking
- payload sanitization
- centralized error responses

Recommended:
- Zod
- Joi
- Yup

---

# 12. Weak Error Handling Across APIs

### Problem
Many API calls silently fail.

### Example
Notification fetch intentionally suppresses errors.

### Impact
- impossible debugging
- hidden production failures
- stale UI
- fake success states

### Corrective Solution
- Add structured error logger
- Create global API error handler
- Add frontend toast reporting
- Store backend stack traces
- Add monitoring

---

# 13. SQL Relationship Integrity Problems

### Observed Risk
The architecture appears loosely relational.

### Likely Missing Constraints
- foreign keys
- cascade rules
- unique constraints
- transaction grouping

### Impact
- orphan records
- broken joins
- missing dashboard counts
- inconsistent lead status

### Corrective Solution
Add:

- foreign keys
- indexes
- relational integrity rules
- transaction boundaries
- migration validation

---

# 14. API Naming Inconsistency

### Problem
Endpoints use mixed naming conventions.

Examples:
- `/api/Telecalls`
- `/api/Walkins`
- `/api/Fields`

### Risks
- Linux deployment case-sensitivity failures
- frontend mismatch
- routing confusion
- broken production APIs

### Corrective Solution
Use standardized lowercase REST naming:

- `/api/telecalls`
- `/api/walkins`
- `/api/fields`

---

# 15. Potential Memory Leak in Socket Lifecycle

### Problem
Socket listeners may persist after component remount.

### Impact
- duplicated events
- performance degradation
- stale state updates
- notification duplication

### Corrective Solution
- Remove all listeners during cleanup
- Use named handlers
- Prevent duplicate subscriptions
- Centralize socket manager

---

# 16. Missing Loading/Error State Architecture

### Problem
UI mixes:

- loading
- empty state
- failed state

### Impact
Users cannot know whether:
- data failed
- data loading
- data empty

### Corrective Solution
Create standardized UI states:

- idle
- loading
- success
- empty
- failed

---

# 17. Missing Audit Logging

### Problem
Critical actions are not traceable.

### Affected Areas
- lead conversion
- task assignment
- target updates
- notification changes

### Corrective Solution
Add audit tables:

- action type
- user id
- timestamp
- previous value
- updated value
- IP/device

---

# 18. Missing Role Authorization Enforcement

### Problem
Frontend role checks exist, but backend authorization appears weak.

### Risk
Users may manually call restricted APIs.

### Corrective Solution
- Add backend RBAC middleware
- Validate role before every protected action
- Never trust frontend permissions

---

# 19. Dashboard KPI Count Inconsistency

### Problem
Counts derive from frontend filtering instead of backend aggregation.

### Impact
- incorrect reports
- slow rendering
- mismatch between users

### Corrective Solution
Move KPI aggregation into backend SQL queries.

---

# 20. Production Deployment Risk

### Problem
Project includes:

- node_modules inside repository
- environment inconsistencies
- mixed fallback API strategy

### Risks
- deployment size explosion
- dependency mismatch
- unstable builds

### Corrective Solution
- remove node_modules from repo
- lock versions
- create environment strategy
- validate env vars at startup

---

# High Priority Immediate Fix Order

## Phase 1 – Stability
1. Fix employee/user_id relationships
2. Fix lead creation validation
3. Fix lead conversion transaction
4. Fix notification duplication
5. Fix dashboard fetch overload

## Phase 2 – Data Integrity
6. Add SQL foreign keys
7. Add transaction support
8. Normalize date handling
9. Add audit logging
10. Add API validation middleware

## Phase 3 – Performance
11. Optimize socket refreshes
12. Add caching layer
13. Split dashboard modules
14. Reduce duplicate API calls
15. Improve query indexing

---

# Recommended Architecture Improvements

## Backend
- Introduce service layer
- Separate controller/business logic
- Add repository pattern
- Use centralized validation
- Introduce transaction manager

## Frontend
- Use React Query/SWR
- Normalize API responses
- Create reusable loading states
- Centralize socket management

## Database
- Add migrations
- Add foreign keys
- Add indexing strategy
- Add soft delete support
- Add audit tables

---

# Final Technical Assessment

Current project status:

- Core architecture exists
- Features are connected partially
- Major issue is data consistency and event synchronization
- Frontend/backend/database are not fully normalized
- Socket lifecycle management is unstable
- SQL relationships are too loosely enforced

The biggest root problem across the project is:

> The system relies on display values and optimistic frontend assumptions instead of strict relational consistency and transactional backend validation.

Once:

- identifiers are normalized
- SQL integrity is enforced
- socket events are stabilized
- validation middleware is added
- dashboard fetching is modularized

…the CRM will become significantly more stable, scalable, and production-ready.

