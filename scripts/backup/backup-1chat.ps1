param(
  [string]$ProjectPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path "backups")
)

$ErrorActionPreference = "Stop"

function Add-InventoryLine {
  param(
    [System.Collections.Generic.List[string]]$Lines,
    [string]$Text = ""
  )

  $Lines.Add($Text) | Out-Null
}

function Get-CommandOutput {
  param([string[]]$Command)

  try {
    $exe = $Command[0]
    $args = @()
    if ($Command.Count -gt 1) {
      $args = $Command[1..($Command.Count - 1)]
    }

    return (& $exe @args 2>&1 | Out-String).Trim()
  } catch {
    return "Nao disponivel: $($_.Exception.Message)"
  }
}

function Read-EnvFileValues {
  param([string[]]$EnvFiles)

  $values = @{}

  foreach ($file in $EnvFiles) {
    Get-Content -LiteralPath $file -ErrorAction SilentlyContinue | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#") -or $line -notmatch "=") {
        return
      }

      $parts = $line.Split("=", 2)
      $key = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"').Trim("'")

      if ($key -and -not $values.ContainsKey($key)) {
        $values[$key] = $value
      }
    }
  }

  return $values
}

$project = (Resolve-Path -LiteralPath $ProjectPath).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $BackupRoot "1chat-backup-$timestamp"
$projectBackupDir = Join-Path $backupDir "project"
$wahaZip = Join-Path $backupDir "waha-data-$timestamp.zip"
$inventoryPath = Join-Path $backupDir "INVENTARIO.txt"

New-Item -ItemType Directory -Force -Path $backupDir, $projectBackupDir | Out-Null

$robocopyArgs = @(
  $project,
  $projectBackupDir,
  "/E",
  "/XD", "node_modules", ".git", "backups",
  "/XF", "*.zip", "*.sql", "*.dump",
  "/R:2",
  "/W:2",
  "/NFL",
  "/NDL"
)

robocopy @robocopyArgs | Out-Null
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -gt 7) {
  throw "Robocopy falhou com codigo $robocopyExit"
}

$composeFile = Join-Path $project "docker-compose.yml"
if (Test-Path -LiteralPath $composeFile) {
  Copy-Item -LiteralPath $composeFile -Destination $backupDir -Force
}

$envFiles = Get-ChildItem -LiteralPath $project -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notlike "*\node_modules\*" -and
    $_.FullName -notlike "*\.git\*" -and
    ($_.Name -eq ".env" -or $_.Name -like "*.env" -or $_.Name -like ".env.*")
  }

if ($envFiles) {
  $envBackupDir = Join-Path $backupDir "env-files"
  New-Item -ItemType Directory -Force -Path $envBackupDir | Out-Null

  foreach ($envFile in $envFiles) {
    $relative = [System.IO.Path]::GetRelativePath($project, $envFile.FullName)
    $destination = Join-Path $envBackupDir $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $envFile.FullName -Destination $destination -Force
  }
}

$wahaDataPath = Join-Path $project "waha-data"
if (Test-Path -LiteralPath $wahaDataPath) {
  Compress-Archive -LiteralPath $wahaDataPath -DestinationPath $wahaZip -Force
}

$envValues = Read-EnvFileValues -EnvFiles @($envFiles | ForEach-Object { $_.FullName })
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl -and $envValues.ContainsKey("DATABASE_URL")) {
  $databaseUrl = $envValues["DATABASE_URL"]
}

$inventory = [System.Collections.Generic.List[string]]::new()
Add-InventoryLine $inventory "INVENTARIO BACKUP 1CHAT"
Add-InventoryLine $inventory "Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
Add-InventoryLine $inventory "Caminho do projeto: $project"
Add-InventoryLine $inventory "Pasta do backup: $backupDir"
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "VERSOES"
Add-InventoryLine $inventory "Node: $(Get-CommandOutput @('node', '--version'))"
Add-InventoryLine $inventory "npm: $(Get-CommandOutput @('npm', '--version'))"
Add-InventoryLine $inventory "Docker: $(Get-CommandOutput @('docker', '--version'))"
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "ARQUIVOS"
Add-InventoryLine $inventory "docker-compose.yml: $(if (Test-Path -LiteralPath $composeFile) { 'encontrado e copiado' } else { 'nao encontrado' })"
Add-InventoryLine $inventory "Arquivos .env encontrados: $($envFiles.Count)"
foreach ($envFile in $envFiles) {
  Add-InventoryLine $inventory "- $([System.IO.Path]::GetRelativePath($project, $envFile.FullName))"
}
Add-InventoryLine $inventory "waha-data: $(if (Test-Path -LiteralPath $wahaDataPath) { 'compactado' } else { 'nao encontrado' })"
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "DOCKER CONTAINERS"
Add-InventoryLine $inventory (Get-CommandOutput @('docker', 'ps', '-a'))
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "DOCKER IMAGES"
Add-InventoryLine $inventory (Get-CommandOutput @('docker', 'images'))
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "DOCKER VOLUMES"
Add-InventoryLine $inventory (Get-CommandOutput @('docker', 'volume', 'ls'))
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "PORTAS USADAS"
Add-InventoryLine $inventory (Get-CommandOutput @('netstat', '-ano'))
Add-InventoryLine $inventory ""
Add-InventoryLine $inventory "POSTGRESQL"
if ($databaseUrl) {
  Add-InventoryLine $inventory "DATABASE_URL encontrada em ambiente ou arquivo .env."
  Add-InventoryLine $inventory "Comando recomendado, NAO executado por este script:"
  Add-InventoryLine $inventory 'pg_dump "$env:DATABASE_URL" -F c -f ".\backup.dump"'
  Add-InventoryLine $inventory 'pg_dump "$env:DATABASE_URL" -f ".\backup.sql"'
} else {
  Add-InventoryLine $inventory "DATABASE_URL nao encontrada."
  Add-InventoryLine $inventory "Se PostgreSQL for usado, gere dump manualmente com pg_dump antes de depender deste backup."
}

$inventory | Set-Content -LiteralPath $inventoryPath -Encoding UTF8

$zipPath = Join-Path $BackupRoot "1chat-backup-$timestamp.zip"
Compress-Archive -LiteralPath $backupDir -DestinationPath $zipPath -Force

Write-Host "Backup criado em: $backupDir"
Write-Host "Arquivo compactado: $zipPath"
Write-Host "Inventario: $inventoryPath"
