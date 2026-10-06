#!/bin/bash
# Mise à jour de Vinted Helper sur le serveur OVH :
#   cd /opt/vinted-helper && sudo bash scripts/ovh/mettre-a-jour.sh
# Sauvegarde de la base, récupération de la nouvelle version, reconstruction, redémarrage.
# Les migrations de la base s'appliquent automatiquement au démarrage, sans perte de données.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Sauvegarde de la base avant mise à jour"
mkdir -p sauvegardes/avant-mise-a-jour
fichier="sauvegardes/avant-mise-a-jour/$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
docker compose exec -T sauvegarde sh -c 'pg_dump --clean --if-exists --no-owner' | gzip > "$fichier"
echo "Sauvegarde : $fichier"

echo "==> Récupération de la nouvelle version"
git pull --ff-only

echo "==> Reconstruction et redémarrage"
docker compose up -d --build
docker image prune -f > /dev/null
docker compose ps
echo "Version en ligne : $(grep '"version"' package.json | head -1 | cut -d'"' -f4)"
