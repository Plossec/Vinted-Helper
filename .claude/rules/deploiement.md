---
paths:
  - "docker-compose*.yml"
  - "Dockerfile"
  - "caddy/**"
  - "scripts/**"
  - "docs/guides/mise-en-ligne-ovh.md"
---

# Règles de déploiement, sauvegarde et scripts

Guides : `docs/guides/mise-en-ligne-ovh.md` (serveur OVH), `docs/guides/sauvegarde-restauration.md` (PC).

- **Aucune commande vers le VPS** sans demande explicite : c'est l'utilisateur qui lance les scripts sur le serveur,
  guidé pas à pas.
- Le même `docker-compose.yml` sert au PC et au serveur ; les différences du serveur sont dans
  `docker-compose.ovh.yml` (activé par `COMPOSE_FILE` dans le `.env` du serveur). Ne pas dupliquer les services.
- Ne jamais supprimer les volumes Docker (`base-donnees`, `certificats`), le dossier des photos ni les sauvegardes ;
  jamais `docker compose down -v`.
- Aucun script destructeur dans `package.json`. Une restauration reste une commande lancée à la main par
  l'utilisateur, documentée avec un avertissement.
- Scripts exécutés dans les conteneurs ou sur le serveur : `sh`/`bash` POSIX, fins de ligne LF, relançables sans
  risque. Scripts Windows : PowerShell, enregistrés en UTF-8 avec BOM (accents).
- Pas de script téléchargé puis exécuté (`curl | sh`) : paquets du système ou images Docker officielles.
- Aucun secret dans les fichiers versionnés : tout passe par `.env` (jamais lu ni affiché par Claude).
