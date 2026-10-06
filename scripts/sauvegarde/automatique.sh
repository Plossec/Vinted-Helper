#!/bin/sh
# Sauvegarde automatique quotidienne (§5.13) : base (pg_dump) + photos.
# Conservation : base 30 jours ; archives des photos 7 jours, sauf celles du dimanche gardées 30 jours
# (une archive complète des photos par jour pendant 30 jours prendrait trop de place sur le disque).
# Lancée par le service « sauvegarde » de docker-compose.yml. Fichiers : sauvegardes/auto/ sur le PC.
# Une sauvegarde par jour, faite dès que le PC est allumé après l'heure prévue (SAUVEGARDE_HEURE, 3 h par défaut).
set -eu

DOSSIER=/sauvegardes/auto
HEURE="${SAUVEGARDE_HEURE:-3}"
CONSERVATION_JOURS=30
CONSERVATION_PHOTOS_JOURS=7
mkdir -p "$DOSSIER"

journal() {
  echo "$(date '+%d/%m/%Y %H:%M') — $*"
}

sauvegarder() {
  jour="$1"
  journal "Sauvegarde du $jour…"
  # Base : --clean pour pouvoir la restaurer par-dessus la base existante.
  pg_dump --clean --if-exists --no-owner | gzip > "$DOSSIER/$jour-base.sql.gz.partiel"
  mv "$DOSSIER/$jour-base.sql.gz.partiel" "$DOSSIER/$jour-base.sql.gz"
  tar czf "$DOSSIER/$jour-photos.tar.gz.partiel" -C /photos .
  mv "$DOSSIER/$jour-photos.tar.gz.partiel" "$DOSSIER/$jour-photos.tar.gz"
  # Conservation : 30 jours (base et photos du dimanche), 7 jours (photos des autres jours).
  find "$DOSSIER" -name '*.gz' -mtime +"$CONSERVATION_JOURS" -exec rm -f {} \;
  for archive in $(find "$DOSSIER" -name '*-photos.tar.gz' -mtime +"$CONSERVATION_PHOTOS_JOURS"); do
    date_archive=$(basename "$archive" | cut -c1-10)
    [ "$(date -d "$date_archive" +%u 2>/dev/null || echo 0)" = "7" ] || rm -f "$archive"
  done
  find "$DOSSIER" -name '*.partiel' -exec rm -f {} \;
  journal "Sauvegarde terminée : $jour-base.sql.gz et $jour-photos.tar.gz"
}

journal "Sauvegarde automatique active (chaque jour à partir de ${HEURE} h ; base ${CONSERVATION_JOURS} jours, photos ${CONSERVATION_PHOTOS_JOURS} jours + dimanches ${CONSERVATION_JOURS} jours)."
while true; do
  jour=$(date +%Y-%m-%d)
  heure=$(date +%H | sed 's/^0//')
  if [ "${heure:-0}" -ge "$HEURE" ] && [ ! -f "$DOSSIER/$jour-base.sql.gz" ]; then
    sauvegarder "$jour" || journal "ÉCHEC de la sauvegarde du $jour : nouvel essai dans 10 minutes."
  fi
  sleep 600
done
