# Setup Deployment Directories
$DeploymentRoot = "C:\Deployment\achme"

$directories = @(
    "$DeploymentRoot",
    "$DeploymentRoot\frontend",
    "$DeploymentRoot\backend",
    "$DeploymentRoot\nginx",
    "$DeploymentRoot\logs",
    "$DeploymentRoot\backups"
)

foreach ($dir in $directories) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "Directory already exists: $dir" -ForegroundColor Yellow
    }
}

Write-Host "Directory structure initialization complete." -ForegroundColor Cyan
