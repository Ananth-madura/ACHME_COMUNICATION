# Achme Application Setup Guide

This guide explains how to set up and run the Achme application locally, including database configuration, backend/frontend setup, and authentication options.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MySQL](https://www.mysql.com/) (v5.7 or higher)
- Git (optional)

## Database Setup

1. **Install MySQL** if not already installed
2. **Start MySQL service**
3. **Create database and user**:
   ```sql
   CREATE DATABASE achme;
   CREATE USER 'achme_user'@'localhost' IDENTIFIED BY 'achme_pass';
   GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. **Import schema**:
   ```bash
   mysql -u achme_user -p achme < backend/schema.sql
   ```

## Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=achme_user
   DB_PASS=achme_pass
   DB_NAME=achme
   JWT_SECRET=your_secure_random_string_here
   # For demo mode (development only):
   DEMO_MODE=false
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:3000`

## Frontend Setup

1. Open new terminal, navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   The frontend will run on `http://localhost:3001` (proxy configured to backend)

## Authentication Systems

### Original OTP-Based Authentication (Default)

- Users must register with email and verify via OTP sent to email
- Admin approval required for new registrations
- Login requires email + valid OTP

### Demo Authentication Mode (For Testing Only)

⚠️ **WARNING**: Never enable demo mode in production.

To enable demo mode:
1. Set `DEMO_MODE=true` in backend/.env
2. Restart backend server

Demo login options:
1. **OTP Bypass**: Use `/api/auth/login` with:
   - Email: `demo@achme.com`
   - OTP: `123456`
2. **Username/Password**: Use `/api/auth/demo-login` with:
   - Email: `demo@achme.com` (optional)
   - Password: `DemoPass123!` (optional)

Both methods create/log in a demo admin user with full access.

## Reverting to Original Authentication

To disable demo mode and revert to pure OTP-based authentication:

1. Set `DEMO_MODE=false` in backend/.env (or remove the line)
2. Restart backend server
3. Verify:
   - Demo credentials no longer work
   - `/api/auth/demo-login` returns 403 Forbidden
   - Normal OTP flow functions as expected

## Troubleshooting

### Database Connection Errors
- Verify MySQL service is running
- Check `.env` credentials match your MySQL setup
- Ensure database `achme` exists and schema is imported

### Port Conflicts
- Backend defaults to port 3000
- Frontend defaults to port 3001 (proxy to backend)
- Change ports in `.env` (backend) and `package.json` (frontend) if needed

### Demo Mode Issues
- Ensure `DEMO_MODE=true` is set in backend/.env
- Remember demo mode is disabled by default for security
- Demo user persists in database but requires valid credentials when demo mode is off

## Directory Structure
```
Achme-master/
├backend/                 # Node.js/Express server
├frontend/                # React application
├schema.sql               # MySQL database schema
└README.md                # Project overview
```

## Development Notes
- Backend API base URL: `http://localhost:3000/api`
- Frontend proxies `/api` requests to backend during development
- JWT tokens expire in 1 hour
- Passwords are hashed using bcrypt
- Admin approval workflow: New registrations → pending → admin approval → active

## Security Recommendations
1. Always use strong, random JWT_SECRET
2. Never commit `.env` with real credentials to version control
3. Use environment-specific configuration (development/staging/production)
4. Regularly update dependencies
5. Implement rate limiting on authentication endpoints in production