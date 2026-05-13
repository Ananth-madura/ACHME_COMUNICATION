# MySQL Database Backup Script for Windows
# Schedule this script to run daily via Windows Task Scheduler

# Configuration
$MySqlDumpPath = "C:\Program Files\MySQL\MySQL Server\bin\mysqldump.exe" # Adjust if MySQL is installed elsewhere
$BackupDir = "C:\Deployment\achme\backups"
$DbUser = "root" # Change to backup user
$DbPass = "YOUR_SECURE_PASSWORD" # Change to actual password
$DbName = "achme_crm"
$RetentionDays = 30 # Delete backups older than this

# Get current date
$DateStr = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = "$BackupDir\${DbName}_backup_${DateStr}.sql"

# Ensure backup directory exists
if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Starting backup for $DbName to $BackupFile..." -ForegroundColor Cyan

# Execute mysqldump
try {
    # Note: Suppressing the password warning via standard output/error redirection can be tricky in powershell, 
    # but the dump will succeed.
    & $MySqlDumpPath -u$DbUser -p$DbPass $DbName > $BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backup completed successfully!" -ForegroundColor Green
        
        # Cleanup old backups
        Write-Host "Cleaning up backups older than $RetentionDays days..." -ForegroundColor Cyan
        $OldBackups = Get-ChildItem -Path $BackupDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) }
        
        foreach ($File in $OldBackups) {
            Remove-Item $File.FullName -Force
            Write-Host "Deleted old backup: $($File.Name)" -ForegroundColor Yellow
        }
    } else {
        Write-Error "mysqldump failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "An error occurred during backup: $_"
}
