param(
  [string]$ProjectPath = "C:\Users\User\1chat.digital",
  [string]$BackupRoot = "D:\1chat-backups"
)

$ErrorActionPreference = "Continue"

function Add-ListItem {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Text
  )

  $List.Add($Text) | Out-Null
}

function Get-CommandOutput {
  param([scriptblock]$Command)

  try {
    return (& $Command 2>&1 | Out-String).Trim()
  } catch {
    return "Nao disponivel: $($_.Exception.Message)"
  }
}

function Copy-FileSafe {
  param(
    [string]$Source,
    [string]$RelativeDestination
  )

  try {
    if (Test-Path -LiteralPath $Source) {
      $destination = Join-Path $script:BackupDir $RelativeDestination
      $parent = Split-Path -Parent $destination
      if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
      }

      Copy-Item -LiteralPath $Source -Destination $destination -Force -ErrorAction Stop
      Add-ListItem $script:CopiedItems $RelativeDestination
    } else {
      Add-ListItem $script:CopyErrors "Nao encontrado: $Source"
    }
  } catch {
    Add-ListItem $script:CopyErrors "Falha copiando $Source -> $RelativeDestination : $($_.Exception.Message)"
  }
}

function Copy-DirectorySafe {
  param(
    [string]$Source,
    [string]$RelativeDestination
  )

  try {
    if (Test-Path -LiteralPath $Source) {
      $destination = Join-Path $script:BackupDir $RelativeDestination
      New-Item -ItemType Directory -Force -Path $destination | Out-Null

      robocopy $Source $destination /E /R:1 /W:1 /NFL /NDL /NP /XD ".git" "node_modules" "backups" "dumps" /XF "*.zip" "*.rar" "*.7z" "*.tar" "*.gz" "*.sql" "*.dump" | Out-Null
      $exitCode = $LASTEXITCODE

      if ($exitCode -gt 7) {
        Add-ListItem $script:CopyErrors "Robocopy falhou ($exitCode): $Source -> $RelativeDestination"
      } else {
        Add-ListItem $script:CopiedItems $RelativeDestination
      }
    } else {
      Add-ListItem $script:CopyErrors "Nao encontrado: $Source"
    }
  } catch {
    Add-ListItem $script:CopyErrors "Falha copiando pasta $Source -> $RelativeDestination : $($_.Exception.Message)"
  }
}

function Test-ItemLine {
  param(
    [string]$Label,
    [string]$Path
  )

  return "${Label}: $(Test-Path -LiteralPath $Path)"
}

if (-not (Test-Path -LiteralPath "D:\")) {
  throw "Drive D: nao encontrado. Backup abortado."
}

$project = (Resolve-Path -LiteralPath $ProjectPath).Path
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$script:BackupDir = Join-Path $BackupRoot "manual-quick-$timestamp"
$inventoryPath = Join-Path $script:BackupDir "INVENTARIO.txt"
$script:CopiedItems = [System.Collections.Generic.List[string]]::new()
$script:CopyErrors = [System.Collections.Generic.List[string]]::new()

New-Item -ItemType Directory -Force -Path $script:BackupDir | Out-Null

Copy-FileSafe (Join-Path $project "START_HERE.md") "project\START_HERE.md"
Copy-FileSafe (Join-Path $project "CHATGPT_PROJECT_CONTEXT.md") "project\CHATGPT_PROJECT_CONTEXT.md"
Copy-FileSafe (Join-Path $project ".env.example") "project\.env.example"
Copy-FileSafe (Join-Path $project ".gitignore") "project\.gitignore"
Copy-FileSafe (Join-Path $project "docker-compose.example.yml") "project\docker-compose.example.yml"
Copy-DirectorySafe (Join-Path $project "docs") "project\docs"
Copy-DirectorySafe (Join-Path $project "scripts") "project\scripts"

Copy-FileSafe (Join-Path $project ".env") "private\.env"
Copy-FileSafe (Join-Path $project "docker-compose.yml") "private\docker-compose.yml"

Copy-FileSafe (Join-Path $project "bot\data\respostas.xlsx") "project\bot\data\respostas.xlsx"
if (Test-Path -LiteralPath (Join-Path $project "bot\data\config.json")) {
  Copy-FileSafe (Join-Path $project "bot\data\config.json") "project\bot\data\config.json"
} else {
  Add-ListItem $script:CopyErrors "Opcional nao encontrado: bot\data\config.json"
}

Copy-DirectorySafe (Join-Path $project "waha-data") "private\waha-data"
Copy-DirectorySafe (Join-Path $project "waha-files") "private\waha-files"
Copy-FileSafe "C:\Users\User\.cloudflared\config.yml" "private\cloudflared\config.yml"
Copy-FileSafe "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\iniciar-1chat-producao.bat" "private\startup\iniciar-1chat-producao.bat"

$inventory = [System.Collections.Generic.List[string]]::new()
Add-ListItem $inventory "INVENTARIO BACKUP 1CHAT"
Add-ListItem $inventory "Data/hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
Add-ListItem $inventory "Tipo: manual rapido com WAHA rodando"
Add-ListItem $inventory "Origem: $project"
Add-ListItem $inventory "Destino: $script:BackupDir"
Add-ListItem $inventory "Aviso: WAHA estava rodando; waha-data/ pode estar em uso e este backup pode nao ser totalmente consistente."
Add-ListItem $inventory ""
Add-ListItem $inventory "GIT STATUS --SHORT"
Add-ListItem $inventory (Get-CommandOutput { Set-Location $project; git status --short })
Add-ListItem $inventory ""
Add-ListItem $inventory "ULTIMO COMMIT"
Add-ListItem $inventory (Get-CommandOutput { Set-Location $project; git log -1 --oneline })
Add-ListItem $inventory ""
Add-ListItem $inventory "EXISTENCIA DE ITENS CRITICOS"
Add-ListItem $inventory (Test-ItemLine ".env" (Join-Path $project ".env"))
Add-ListItem $inventory (Test-ItemLine "docker-compose.yml" (Join-Path $project "docker-compose.yml"))
Add-ListItem $inventory (Test-ItemLine "waha-data/" (Join-Path $project "waha-data"))
Add-ListItem $inventory (Test-ItemLine "waha-files/" (Join-Path $project "waha-files"))
Add-ListItem $inventory (Test-ItemLine "bot/data/respostas.xlsx" (Join-Path $project "bot\data\respostas.xlsx"))
Add-ListItem $inventory (Test-ItemLine "bot/data/config.json" (Join-Path $project "bot\data\config.json"))
Add-ListItem $inventory (Test-ItemLine "Cloudflare config" "C:\Users\User\.cloudflared\config.yml")
Add-ListItem $inventory (Test-ItemLine "Startup bat" "C:\Users\User\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\iniciar-1chat-producao.bat")
Add-ListItem $inventory ""
Add-ListItem $inventory "DOCKER PS"
Add-ListItem $inventory (Get-CommandOutput { docker ps })
Add-ListItem $inventory ""
Add-ListItem $inventory "PORTA 3000"
Add-ListItem $inventory (Get-CommandOutput { netstat -ano | findstr ":3000" })
Add-ListItem $inventory ""
Add-ListItem $inventory "PORTA 3001"
Add-ListItem $inventory (Get-CommandOutput { netstat -ano | findstr ":3001" })
Add-ListItem $inventory ""
$drive = [System.IO.DriveInfo]::new("D:\")
Add-ListItem $inventory "Espaco livre D: $([math]::Round($drive.AvailableFreeSpace / 1GB, 2)) GB de $([math]::Round($drive.TotalSize / 1GB, 2)) GB"
Add-ListItem $inventory ""
Add-ListItem $inventory "ITENS COPIADOS"
foreach ($item in $script:CopiedItems) {
  Add-ListItem $inventory "- $item"
}
Add-ListItem $inventory ""
Add-ListItem $inventory "ERROS/AVISOS DE COPIA"
if ($script:CopyErrors.Count -eq 0) {
  Add-ListItem $inventory "Nenhum erro registrado."
} else {
  foreach ($errorLine in $script:CopyErrors) {
    Add-ListItem $inventory "- $errorLine"
  }
}
Add-ListItem $inventory ""
Add-ListItem $inventory "POSTGRESQL"
Add-ListItem $inventory "pg_dump nao executado neste modo rapido."
Add-ListItem $inventory "Se DATABASE_URL estiver ativo, gerar dump em etapa aprovada/testada."

$inventory | Set-Content -LiteralPath $inventoryPath -Encoding UTF8

$sizeBytes = (Get-ChildItem -LiteralPath $script:BackupDir -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
$sizeMb = [math]::Round($sizeBytes / 1MB, 2)

Write-Host "Backup rapido criado em: $script:BackupDir"
Write-Host "Inventario: $inventoryPath"
Write-Host "Erros/avisos: $($script:CopyErrors.Count)"
Write-Host "Tamanho aproximado: $sizeMb MB"
Write-Host "Proximos passos: copiar para nuvem/HD externo e testar restore em janela propria."
