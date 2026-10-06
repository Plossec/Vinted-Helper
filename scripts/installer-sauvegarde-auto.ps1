# Rapatriement AUTOMATIQUE des sauvegardes du serveur OVH sur le PC (à lancer une seule fois) :
#   powershell -ExecutionPolicy Bypass -File scripts\installer-sauvegarde-auto.ps1
# 1. crée une clé SSH dédiée sur le PC (%USERPROFILE%\.ssh\vinted-helper-sauvegardes), sans mot de passe ;
# 2. la dépose sur le serveur, LIMITÉE à la lecture des fichiers (sftp en lecture seule, ni commande ni modification) :
#    le mot de passe SSH du serveur est demandé une dernière fois ;
# 3. teste le rapatriement avec la clé ;
# 4. crée la tâche planifiée Windows « Vinted Helper - sauvegardes » : chaque jour (rattrapée au démarrage du PC
#    s'il était éteint).
# Relançable sans risque. Guide : docs/guides/mise-en-ligne-ovh.md, étape « Sauvegardes ».
param(
  [string]$Serveur = "",
  [string]$Utilisateur = "ubuntu",
  [string]$Destination = (Join-Path $HOME "Documents\Sauvegardes Vinted Helper"),
  [string]$Heure = "12:00"
)
$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -ge 7) {
  throw "Lancez ce script avec « powershell -ExecutionPolicy Bypass -File … » (Windows PowerShell), pas avec pwsh."
}

$rapatrier = Join-Path $PSScriptRoot "rapatrier-sauvegardes.ps1"
$nomTache = "Vinted Helper - sauvegardes"
$cle = Join-Path $HOME ".ssh\vinted-helper-sauvegardes"
$dossierServeur = "/opt/vinted-helper/sauvegardes/auto"

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$memo = Join-Path $Destination "serveur.txt"
if ($Serveur -eq "" -and (Test-Path $memo)) { $Serveur = (Get-Content $memo -Raw).Trim() }
if ($Serveur -eq "") { $Serveur = Read-Host "Adresse du serveur (ex. vps-1234abcd.vps.ovh.net)" }
Set-Content -Path $memo -Value $Serveur -Encoding UTF8

Write-Host "1/4 Clé SSH de sauvegarde"
if (Test-Path $cle) {
  Write-Host "Clé déjà présente : $cle"
} else {
  New-Item -ItemType Directory -Force -Path (Split-Path $cle) | Out-Null
  # '""' = phrase secrète vide (syntaxe de Windows PowerShell 5.1 pour passer une chaîne vide).
  & ssh-keygen -q -t ed25519 -N '""' -f $cle -C "vinted-helper-sauvegardes"
  if ($LASTEXITCODE -ne 0) { throw "Création de la clé impossible (OpenSSH est-il installé ?)." }
  Write-Host "Clé créée : $cle"
}

Write-Host "2/4 Dépôt de la clé sur le serveur (mot de passe SSH du serveur demandé une dernière fois)"
$publique = (Get-Content "$cle.pub" -Raw).Trim()
$corps = ($publique -split " ")[1]
# restrict : ni terminal ni redirection ; command : uniquement sftp en lecture seule, ouvert sur le dossier des
# sauvegardes. La clé ne permet donc ni de lancer une commande, ni de modifier ou supprimer un fichier.
$ligne = "restrict,command=`"internal-sftp -R -d $dossierServeur`" $publique"
# Une seule ligne, terminée par « # » : le retour chariot ajouté par Windows tombe dans le commentaire.
$distant = "umask 077; mkdir -p ~/.ssh; f=~/.ssh/authorized_keys; touch `$f; grep -qF '$corps' `$f || echo '$ligne' >> `$f; echo CLE-INSTALLEE; exit 0 #"
$sortie = $distant | ssh -o StrictHostKeyChecking=accept-new "$Utilisateur@$Serveur" "bash -s"
if (-not ($sortie -match "CLE-INSTALLEE")) { throw "Dépôt de la clé impossible (adresse, mot de passe ou réseau ?)." }
Write-Host "Clé déposée (lecture seule des sauvegardes)."

Write-Host "3/4 Test du rapatriement avec la clé (sans mot de passe)"
& $rapatrier -Serveur $Serveur -Utilisateur $Utilisateur -Destination $Destination
if ($LASTEXITCODE -ne 0) { throw "Le test a échoué : voir le message ci-dessus." }

Write-Host "4/4 Tâche planifiée « $nomTache » (chaque jour à $Heure, rattrapée au démarrage si le PC était éteint)"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$rapatrier`" -Destination `"$Destination`""
$declencheur = New-ScheduledTaskTrigger -Daily -At $Heure
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName $nomTache -Action $action -Trigger $declencheur -Settings $reglages `
  -Description "Rapatrie les sauvegardes du serveur OVH de Vinted Helper (scripts\rapatrier-sauvegardes.ps1)." `
  -Force | Out-Null

Write-Host ""
Write-Host "Installé. Les sauvegardes arriveront chaque jour dans : $Destination" -ForegroundColor Green
Write-Host "Journal : $(Join-Path $Destination 'rapatriement.log')"
