#!/bin/bash
# Installation de Vinted Helper sur un VPS OVH (Ubuntu 24.04), à lancer UNE fois :
#   sudo bash /opt/vinted-helper/scripts/ovh/installer.sh
# Guide complet : docs/mise-en-ligne-ovh.md
# - installe Docker (paquets Ubuntu), le pare-feu (SSH, HTTP, HTTPS), fail2ban, les mises à jour de sécurité ;
# - crée le fichier .env (questions posées une par une) ;
# - démarre l'application.
# Relançable sans risque : ce qui est déjà fait n'est pas refait, le .env existant est conservé.
set -euo pipefail

PROJET="$(cd "$(dirname "$0")/../.." && pwd)"
etape() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
erreur() { printf '\n\033[1;31mERREUR : %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || erreur "lancez ce script avec sudo : sudo bash $0"
grep -q 'ID=ubuntu' /etc/os-release || erreur "ce script est prévu pour Ubuntu (24.04 recommandé)."

etape "1/6 Mise à jour du système et installation des outils (quelques minutes)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q docker.io docker-compose-v2 git ufw fail2ban unattended-upgrades openssl
systemctl enable --now docker
# L'utilisateur qui a lancé sudo (ex. « ubuntu ») peut utiliser Docker sans sudo (après reconnexion).
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then usermod -aG docker "$SUDO_USER"; fi

etape "2/6 Mises à jour de sécurité automatiques"
dpkg-reconfigure -f noninteractive unattended-upgrades

etape "3/6 Pare-feu : seuls SSH (22), HTTP (80) et HTTPS (443) sont ouverts"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
# fail2ban bloque une adresse après plusieurs mots de passe SSH erronés (protection active par défaut sur Ubuntu).
systemctl enable --now fail2ban

etape "4/6 Mémoire d'appoint (swap) pour la construction de l'application"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap de 2 Go créé."
else
  echo "Swap déjà présent."
fi

etape "5/6 Configuration (fichier .env)"
cd "$PROJET"
if [ -f .env ]; then
  echo "Le fichier .env existe déjà : il est conservé (modifiable avec : nano $PROJET/.env)."
else
  adresse_defaut="$(hostname -f)"
  read -r -p "Adresse de l'application [$adresse_defaut] : " domaine
  domaine="${domaine:-$adresse_defaut}"
  read -r -p "Identifiant de connexion à l'application : " identifiant
  while true; do
    read -r -s -p "Mot de passe de l'application (8 caractères minimum) : " mot_de_passe; echo
    read -r -s -p "Confirmez le mot de passe : " confirmation; echo
    [ "$mot_de_passe" = "$confirmation" ] && [ ${#mot_de_passe} -ge 8 ] && break
    echo "Les deux saisies diffèrent ou le mot de passe fait moins de 8 caractères : recommencez."
  done
  read -r -p "Clé Gemini (laisser vide pour plus tard) : " cle_gemini
  read -r -p "Modèle Gemini [gemini-2.5-flash] : " modele_gemini
  umask 077
  cat > .env <<FIN
# Configuration du serveur OVH — créée par scripts/ovh/installer.sh. Ne jamais partager ce fichier.
COMPOSE_FILE=docker-compose.yml:docker-compose.ovh.yml
DOMAINE=$domaine
POSTGRES_USER=vinted
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=vinted_helper
COMPTE_IDENTIFIANT=$identifiant
COMPTE_MOT_DE_PASSE_INITIAL=$mot_de_passe
GEMINI_API_KEY=${cle_gemini:-votre-cle-gemini}
GEMINI_MODELE=${modele_gemini:-gemini-2.5-flash}
SAUVEGARDE_HEURE=3
FIN
  chmod 600 .env
  echo "Fichier .env créé (lisible uniquement par l'administrateur)."
fi
mkdir -p data/photos sauvegardes
chown -R 1000:1000 data

etape "6/6 Construction et démarrage de l'application (5 à 10 minutes la première fois)"
docker compose up -d --build
docker compose ps

domaine_final="$(grep '^DOMAINE=' .env | cut -d= -f2)"
printf '\n\033[1;32mInstallation terminée.\033[0m\n'
echo "Ouvrez https://$domaine_final sur le téléphone (le certificat peut mettre une minute à arriver)."
echo "Journaux : docker compose -f $PROJET/docker-compose.yml logs -f app   (ou, après reconnexion : cd $PROJET && docker compose logs -f app)"
