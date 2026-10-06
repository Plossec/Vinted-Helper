# Installe le programme de publication Vinted sur le PC (guide : docs/guides/publication-vinted.md).
# Utilisation (PowerShell, dossier du projet) :
#   powershell -ExecutionPolicy Bypass -File scripts\installer-publication.ps1
# - installe ses bibliothèques (dossier outils\publication-vinted) ;
# - enregistre l'adresse de l'application et le jeton (Réglages → Publication Vinted) ;
# - le fait démarrer avec Windows (fenêtre réduite) et le lance tout de suite.
$ErrorActionPreference = "Stop"
$projet = Split-Path -Parent $PSScriptRoot
$programme = Join-Path $projet "outils\publication-vinted"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js est introuvable : installez-le (README, Prérequis)." }
$chromes = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
if (-not ($chromes | Where-Object { Test-Path $_ })) {
  Write-Host "Attention : Google Chrome ne semble pas installé à l'emplacement habituel. Il est nécessaire." -ForegroundColor Yellow
}

Write-Host "1/4 Installation des bibliothèques du programme..."
Push-Location $programme
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm ci a échoué." }
Pop-Location

Write-Host "2/4 Configuration"
$dossier = Join-Path $env:LOCALAPPDATA "VintedHelper"
New-Item -ItemType Directory -Force -Path $dossier | Out-Null
$adresse = Read-Host "Adresse de l'application (Entrée = http://localhost:3000)"
if ($adresse -eq "") { $adresse = "http://localhost:3000" }
$jeton = Read-Host "Jeton de publication (Réglages → Publication Vinted → Créer un jeton)"
if ($jeton -notmatch "^vh_") { throw "Jeton invalide : il commence par vh_." }
$config = @{ adresse = $adresse.TrimEnd("/"); jeton = $jeton.Trim() } | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path $dossier "publication.json"), $config)

Write-Host "3/4 Démarrage automatique avec Windows"
$node = (Get-Command node).Source
$raccourci = Join-Path ([Environment]::GetFolderPath("Startup")) "Vinted Helper - publication.lnk"
$shell = New-Object -ComObject WScript.Shell
$lien = $shell.CreateShortcut($raccourci)
$lien.TargetPath = $node
$lien.Arguments = "index.mjs"
$lien.WorkingDirectory = $programme
$lien.WindowStyle = 7
$lien.Description = "Publication des annonces Vinted (Vinted Helper)"
$lien.Save()

Write-Host "4/4 Lancement"
Start-Process -FilePath $node -ArgumentList "index.mjs" -WorkingDirectory $programme -WindowStyle Minimized
Write-Host ""
Write-Host "Installé. Une fenêtre Chrome va s'ouvrir quand une publication sera demandée :" -ForegroundColor Green
Write-Host "la première fois, connectez-vous à Vinted dans cette fenêtre (la connexion est gardée)."
Write-Host "Journal : $dossier\publication.log"
