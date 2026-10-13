#!/bin/bash
# Mise à jour de Vinted Helper sur le serveur OVH :
#   cd /opt/vinted-helper && sudo bash scripts/ovh/mettre-a-jour.sh
# Sauvegarde de la base, récupération de la nouvelle version, reconstruction, redémarrage.
# Les migrations de la base s'appliquent automatiquement au démarrage, sans perte de données.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Sauvegarde de la base avant mise à jour"
mkdir -p sauvegardes/avant-mise-a-jour
chmod 755 sauvegardes # lisible par « ubuntu » (rapatriement sur le PC), corrige les installations antérieures
fichier="sauvegardes/avant-mise-a-jour/$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
docker compose exec -T sauvegarde sh -c 'pg_dump --clean --if-exists --no-owner' | gzip > "$fichier"
echo "Sauvegarde : $fichier"

echo "==> Récupération de la nouvelle version"
git pull --ff-only

# ⚠️ « git pull » remplace ce fichier, mais le script déjà lancé continue avec l'ancienne version (constaté au
# déploiement du 13/10/2026) : une modification de ce script ne s'applique qu'au déploiement suivant. La suite est
# faite de fonctions appelées en dernière ligne (lues en entier avant d'être exécutées).
# Issue #119 : la nouvelle version doit répondre (/api/sante, base connectée), sinon retour automatique à la dernière
# version qui a répondu ; si ce retour échoue aussi : guide docs/guides/mise-en-ligne-ovh.md, « Si une mise à jour
# échoue ». Code de sortie : 0 en ligne ; 1 nouvelle version refusée, ancienne remise en ligne ; 2 site à réparer.

VERSION_SAINE=sauvegardes/avant-mise-a-jour/version-en-ligne
SCRIPTS_SAUVEGARDE=sauvegardes/avant-mise-a-jour/scripts-sauvegarde

# Le service « sauvegarde » garde en mémoire le script lu à son démarrage, et « docker compose up » ne le redémarre
# pas quand seul scripts/sauvegarde/ change : il est redémarré quand le contenu de ce dossier a changé depuis son
# dernier démarrage par ce script (première fois comprise).
relancer_sauvegarde_si_besoin() {
  local actuel
  actuel="$(git rev-parse HEAD:scripts/sauvegarde)"
  if [ "$(cat "$SCRIPTS_SAUVEGARDE" 2> /dev/null)" != "$actuel" ]; then
    echo "==> Nouveau script de sauvegarde : redémarrage du service « sauvegarde »"
    if docker compose restart sauvegarde; then
      echo "$actuel" > "$SCRIPTS_SAUVEGARDE"
    else
      echo "!!! Redémarrage du service « sauvegarde » impossible : nouvel essai au prochain déploiement."
    fi
  fi
}

# L'application répond-elle, base connectée ? (vérifié dans le conteneur : marche aussi pour les anciennes versions)
repond() {
  docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/sante').then(async (r) => process.exit(r.ok && (await r.json()).base === 'connectée' ? 0 : 1)).catch(() => process.exit(1))" > /dev/null 2>&1
}

# Attend une réponse pendant 3 minutes au plus, puis la confirme 15 s plus tard (pas de redémarrage en boucle).
attendre_reponse() {
  local essai
  for essai in $(seq 36); do # 36 × 5 s
    if repond; then
      sleep 15
      repond && return 0
    fi
    sleep 5
  done
  return 1
}

reconstruire() {
  docker compose up -d --build && attendre_reponse
}

mettre_en_ligne() {
  local nouvelle saine
  nouvelle="$(git rev-parse HEAD)"
  # Dernière version qui a répondu ; à défaut (premier passage), celle d'avant « git pull ».
  saine="$(cat "$VERSION_SAINE" 2> /dev/null || git rev-parse 'HEAD@{1}')"

  echo "==> Reconstruction et redémarrage"
  if reconstruire; then
    docker image prune -f > /dev/null
    relancer_sauvegarde_si_besoin
    docker compose ps
    echo "$nouvelle" > "$VERSION_SAINE"
    echo "Version en ligne : $(grep '"version"' package.json | head -1 | cut -d'"' -f4)"
    return 0
  fi

  echo "!!! La nouvelle version ne répond pas. Derniers journaux de l'application :"
  docker compose logs --tail 40 app || true
  if [ "$saine" = "$nouvelle" ]; then
    echo "!!! Aucune version précédente connue : voir docs/guides/mise-en-ligne-ovh.md, « Si une mise à jour échoue »."
    return 2
  fi
  echo "==> Retour automatique à la version précédente (${saine:0:7})"
  git reset --hard "$saine"
  if reconstruire; then
    docker compose ps
    echo "$saine" > "$VERSION_SAINE"
    echo "Retour effectué : la version précédente est en ligne. La nouvelle (${nouvelle:0:7}) n'est PAS en ligne :"
    echo "corrigez-la, puis fusionnez le correctif (nouveau déploiement)."
    return 1
  fi
  echo "!!! Le retour automatique a échoué : le site ne répond pas."
  echo "!!! Suivez docs/guides/mise-en-ligne-ovh.md, « Si une mise à jour échoue » (sauvegarde : $fichier)."
  return 2
}

mettre_en_ligne
