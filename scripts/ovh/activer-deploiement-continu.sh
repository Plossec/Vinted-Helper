#!/bin/bash
# Active le déploiement continu : à chaque fusion dans main, GitHub Actions lance la mise à jour du serveur.
# À lancer une seule fois sur le serveur (relançable : crée une nouvelle clé et invalide l'ancienne) :
#   sudo bash /opt/vinted-helper/scripts/ovh/activer-deploiement-continu.sh
# Crée l'utilisateur « deploiement » ; sa clé SSH ne peut que lancer scripts/ovh/mettre-a-jour.sh (commande imposée,
# ni terminal ni autre commande). Affiche les deux secrets à coller dans GitHub. Guide : docs/guides/mise-en-ligne-ovh.md.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Lancez ce script avec sudo." >&2; exit 1; }

PROJET=/opt/vinted-helper
UTILISATEUR=deploiement
LANCEUR=/usr/local/sbin/vinted-helper-deployer
JOURNAL=/var/log/vinted-helper-deploiement.log

echo "==> Utilisateur « $UTILISATEUR » (sans mot de passe)"
id "$UTILISATEUR" >/dev/null 2>&1 || useradd --create-home --shell /bin/sh "$UTILISATEUR"

echo "==> Lanceur de la mise à jour"
cat > "$LANCEUR" <<FIN
#!/bin/bash
# Lancé par GitHub Actions (utilisateur « $UTILISATEUR », via sudo) : mise à jour du serveur, une à la fois.
set -euo pipefail
exec 9>/run/vinted-helper-deploiement.lock
flock 9
echo "=== Déploiement du \$(date '+%d/%m/%Y %H:%M') ===" >> $JOURNAL
bash $PROJET/scripts/ovh/mettre-a-jour.sh 2>&1 | tee -a $JOURNAL
FIN
chown root:root "$LANCEUR"
chmod 755 "$LANCEUR"

regle=/etc/sudoers.d/vinted-helper-deploiement
echo "$UTILISATEUR ALL=(root) NOPASSWD: $LANCEUR" > "$regle.tmp"
chmod 440 "$regle.tmp"
visudo -cf "$regle.tmp" >/dev/null
mv "$regle.tmp" "$regle"

echo "==> Clé SSH de GitHub (limitée au lancement de la mise à jour)"
dossier="$(mktemp -d)"
ssh-keygen -q -t ed25519 -N "" -C "github-actions-vinted-helper" -f "$dossier/cle"
install -d -m 700 -o "$UTILISATEUR" -g "$UTILISATEUR" "/home/$UTILISATEUR/.ssh"
echo "restrict,command=\"sudo -n $LANCEUR\" $(cat "$dossier/cle.pub")" > "/home/$UTILISATEUR/.ssh/authorized_keys"
chown "$UTILISATEUR:$UTILISATEUR" "/home/$UTILISATEUR/.ssh/authorized_keys"
chmod 600 "/home/$UTILISATEUR/.ssh/authorized_keys"

hote="$(grep '^DOMAINE=' "$PROJET/.env" | cut -d= -f2)"
hote="${hote:-$(hostname -f)}"
cle_hote="$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"

echo
echo "================ Secrets à coller dans GitHub ================"
echo "Dépôt → Settings → Secrets and variables → Actions → New repository secret"
echo
echo "Nom : DEPLOIEMENT_HOTE_CONNU      Valeur (une ligne) :"
echo "$hote $cle_hote"
echo
echo "Nom : DEPLOIEMENT_CLE             Valeur (toutes les lignes, de BEGIN à END comprises) :"
cat "$dossier/cle"
echo "==============================================================="
rm -rf "$dossier"
echo "La clé privée n'est pas gardée sur le serveur. Journal des déploiements : $JOURNAL"
