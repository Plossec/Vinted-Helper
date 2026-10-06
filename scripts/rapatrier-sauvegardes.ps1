# Rapatrie sur le PC les sauvegardes automatiques du serveur OVH (base + photos).
# Utilisation (PowerShell, dans le dossier du projet) :
#   powershell -ExecutionPolicy Bypass -File scripts\rapatrier-sauvegardes.ps1
# Avec la clé de scripts\installer-sauvegarde-auto.ps1 : aucun mot de passe (lancé chaque jour par une tâche planifiée).
# Sans cette clé : le mot de passe SSH du serveur est demandé. Seuls les fichiers absents (ou incomplets) sont
# téléchargés. Journal : rapatriement.log dans le dossier des sauvegardes.
# Guide : docs/guides/mise-en-ligne-ovh.md, étape « Sauvegardes ».
param(
  [string]$Serveur = "",
  [string]$Utilisateur = "ubuntu",
  [string]$Destination = (Join-Path $HOME "Documents\Sauvegardes Vinted Helper"),
  [int]$ConservationJours = 45
)
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$journalFichier = Join-Path $Destination "rapatriement.log"
function Journal([string]$texte) {
  Write-Host $texte
  Add-Content -Path $journalFichier -Value "$(Get-Date -Format 'dd/MM/yyyy HH:mm') — $texte" -Encoding UTF8
}

$memo = Join-Path $Destination "serveur.txt"
if ($Serveur -eq "" -and (Test-Path $memo)) { $Serveur = (Get-Content $memo -Raw).Trim() }
if ($Serveur -eq "") { $Serveur = Read-Host "Adresse du serveur (ex. vps-1234abcd.vps.ovh.net)" }
Set-Content -Path $memo -Value $Serveur -Encoding UTF8

# Clé dédiée (lecture seule des sauvegardes sur le serveur) : pas de mot de passe, jamais de question bloquante.
$cle = Join-Path $HOME ".ssh\vinted-helper-sauvegardes"
$options = @()
if (Test-Path $cle) {
  $options = @("-i", $cle, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")
  Write-Host "Connexion à $Utilisateur@$Serveur avec la clé de sauvegarde..."
} else {
  Write-Host "Connexion à $Utilisateur@$Serveur (le mot de passe SSH va être demandé)..."
}

try {
  # sftp lit ses commandes ici ; « get -a » ne télécharge que ce qui manque ou est incomplet.
  $commandes = "lcd `"$Destination`"`ncd /opt/vinted-helper/sauvegardes/auto`nget -a *.gz`nbye`n"
  $commandes | sftp @options "$Utilisateur@$Serveur"
  if ($LASTEXITCODE -ne 0) { throw "Échec du téléchargement (adresse, clé, mot de passe ou réseau ?)." }

  # Conservation sur le PC : les sauvegardes de plus de $ConservationJours jours sont retirées.
  $limite = (Get-Date).AddDays(-$ConservationJours)
  Get-ChildItem -Path $Destination -Filter "*.gz" | Where-Object { $_.LastWriteTime -lt $limite } | Remove-Item

  $fichiers = Get-ChildItem -Path $Destination -Filter "*.gz" | Sort-Object Name
  Write-Host ""
  Journal "Sauvegardes présentes sur le PC : $($fichiers.Count) fichiers dans $Destination (dernière : $(($fichiers | Select-Object -Last 1).Name))"
  $fichiers | Select-Object -Last 4 | ForEach-Object { Write-Host "  $($_.Name)  ($([math]::Round($_.Length / 1MB, 1)) Mo)" }
} catch {
  Journal "ERREUR : $($_.Exception.Message)"
  exit 1
}
