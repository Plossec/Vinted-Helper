# Rapatrie sur le PC les sauvegardes automatiques du serveur OVH (base + photos).
# Utilisation (PowerShell, dans le dossier du projet) :
#   powershell -ExecutionPolicy Bypass -File scripts\rapatrier-sauvegardes.ps1
# Le mot de passe SSH du serveur est demandé une fois. Seuls les fichiers absents (ou incomplets) sont téléchargés.
# Guide : docs/guides/mise-en-ligne-ovh.md, étape « Sauvegardes ».
param(
  [string]$Serveur = "",
  [string]$Utilisateur = "ubuntu",
  [string]$Destination = (Join-Path $HOME "Documents\Sauvegardes Vinted Helper"),
  [int]$ConservationJours = 45
)
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$memo = Join-Path $Destination "serveur.txt"
if ($Serveur -eq "" -and (Test-Path $memo)) { $Serveur = (Get-Content $memo -Raw).Trim() }
if ($Serveur -eq "") { $Serveur = Read-Host "Adresse du serveur (ex. vps-1234abcd.vps.ovh.net)" }
Set-Content -Path $memo -Value $Serveur -Encoding UTF8

Write-Host "Connexion à $Utilisateur@$Serveur (le mot de passe SSH va être demandé)..."
# sftp lit ses commandes ici ; « get -a » ne télécharge que ce qui manque ou est incomplet.
$commandes = "lcd `"$Destination`"`ncd /opt/vinted-helper/sauvegardes/auto`nget -a *.gz`nbye`n"
$commandes | sftp "$Utilisateur@$Serveur"
if ($LASTEXITCODE -ne 0) { throw "Échec du téléchargement (adresse, mot de passe ou réseau ?)." }

# Conservation sur le PC : les sauvegardes de plus de $ConservationJours jours sont retirées.
$limite = (Get-Date).AddDays(-$ConservationJours)
Get-ChildItem -Path $Destination -Filter "*.gz" | Where-Object { $_.LastWriteTime -lt $limite } | Remove-Item

$fichiers = Get-ChildItem -Path $Destination -Filter "*.gz" | Sort-Object Name
Write-Host ""
Write-Host "Sauvegardes présentes sur le PC : $($fichiers.Count) fichiers dans $Destination"
$fichiers | Select-Object -Last 4 | ForEach-Object { Write-Host "  $($_.Name)  ($([math]::Round($_.Length / 1MB, 1)) Mo)" }
