# achme.com Deployment Runbook (Windows Server 2016)

This runbook provides step-by-step instructions for the server administrator to execute the deployment plan.

## Prerequisites
1. **Node.js**: Install Node.js (LTS version) on the server.
2. **MySQL**: Install MySQL Server 8.x.
3. **Nginx**: Download Nginx for Windows (http://nginx.org/en/download.html) and extract it to `C:\nginx`.
4. **NSSM**: Download NSSM (Non-Sucking Service Manager) to install Nginx as a Windows Service (http://nssm.cc/).

---

## Phase 1: Initialize Directory Structure

1. Open PowerShell as **Administrator**.
2. Navigate to the folder containing these scripts:
   ```powershell
   cd <path-to-this-folder>
   ```
3. Run the setup script:
   ```powershell
   .\setup.ps1
   ```
   *(This creates the `C:\Deployment\achme` folder structure)*

---

## Phase 2: Copy Application Files

1. Build your React frontend (`npm run build` or `npm run build:prod`) on your dev machine.
2. Copy the contents of the `build` or `dist` folder to: `C:\Deployment\achme\frontend\`
3. Copy your Node.js backend files (excluding `node_modules`) to: `C:\Deployment\achme\backend\`
4. Run `npm install` inside the backend directory:
   ```cmd
   cd C:\Deployment\achme\backend
   npm install --production
   ```

---

## Phase 3: Setup Nginx Reverse Proxy

1. Copy the provided `nginx.conf` file to your Nginx installation `conf` directory (e.g., `C:\nginx\conf\nginx.conf`), replacing the default one.
2. Install Nginx as a Windows Service using NSSM:
   - Open Command Prompt as Administrator.
   - Navigate to NSSM directory (e.g., `cd C:\nssm\win64`).
   - Run: `nssm install Nginx`
   - In the GUI that appears:
     - Path: `C:\nginx\nginx.exe`
     - Directory: `C:\nginx`
     - Click **Install service**.
3. Start Nginx:
   ```cmd
   net start Nginx
   ```

---

## Phase 4: Setup PM2 for Node.js Backend

1. Install PM2 and the PM2 Windows Service module globally:
   ```cmd
   npm install -g pm2 pm2-windows-startup
   ```
2. Install the startup script:
   ```cmd
   pm2-startup install
   ```
3. Copy the provided `ecosystem.config.js` to `C:\Deployment\achme\`.
4. Start the backend cluster:
   ```cmd
   cd C:\Deployment\achme
   pm2 start ecosystem.config.js
   ```
5. Save the PM2 list so it restores on reboot:
   ```cmd
   pm2 save
   ```

---

## Phase 5: MySQL Security & Backup

1. Ensure MySQL `my.ini` (usually in `C:\ProgramData\MySQL\MySQL Server 8.0\`) has `bind-address = 127.0.0.1` under `[mysqld]`. Restart MySQL service if changed.
2. Open Windows Task Scheduler (`taskschd.msc`).
3. Create a Basic Task:
   - Name: "MySQL Daily Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
   - Program/script: `powershell.exe`
   - Add arguments: `-ExecutionPolicy Bypass -File "C:\path\to\server-deployment\backup.ps1"`
   - Finish and test by running it manually.

---

## Phase 6: DNS and Firewall (Crucial)

1. **DNS**: Ensure your office router or DNS server maps `achme.com` to the Windows Server's static IP (e.g., `192.168.1.100`).
2. **Firewall**: 
   - Open Windows Defender Firewall with Advanced Security.
   - Create Inbound Rules to **ALLOW** TCP ports `80` and `443` (Domain and Private profiles only).
   - Verify that ports `5000` (Node) and `3306` (MySQL) do not have allow rules for public/external access.

## Verification
- Navigate to `http://localhost` on the server. You should see the React app.
- Navigate to `http://achme.com` from an office computer. You should see the React app.
- Ensure API calls to `http://achme.com/api/...` succeed.
