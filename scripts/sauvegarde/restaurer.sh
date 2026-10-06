#!/bin/sh
# Restauration d'une sauvegarde automatique (README §6). À lancer application ARRÊTÉE :
#   docker compose stop app
#   docker compose exec sauvegarde sh /scripts/restaurer.sh AAAA-MM-JJ
#   docker compose start app
# La base est remplacée par celle de la sauvegarde ; les photos de la sauvegarde sont remises en place
# (les photos plus récentes déjà présentes sont conservées).
set -eu

jour="${1:-}"
DOSSIER=/sauvegardes/auto
if [ -z "$jour" ]; then
  echo "Indiquez la date de la sauvegarde, par exemple : sh /scripts/restaurer.sh 2026-10-06"
  echo "Sauvegardes disponibles :"
  ls "$DOSSIER" | sed -n 's/-base\.sql\.gz$//p'
  exit 1
fi
base="$DOSSIER/$jour-base.sql.gz"
photos="$DOSSIER/$jour-photos.tar.gz"
[ -f "$base" ] || { echo "Sauvegarde introuvable : $base"; exit 1; }

echo "Restauration de la base du $jour…"
gunzip -c "$base" | psql --quiet -v ON_ERROR_STOP=1 > /dev/null
if [ -f "$photos" ]; then
  echo "Restauration des photos du $jour…"
  tar xzf "$photos" -C /photos
fi
echo "Restauration terminée. Relancez l'application : docker compose start app"
