# Décisions — Mise en ligne OVH

[← Index des décisions](README.md)

## 06/10/2026 — Mise en ligne OVH (issue #2)

**Choix de l'utilisateur** : VPS d'entrée de gamme ; adresse OVH gratuite pour commencer (nom de domaine possible
plus tard) ; sauvegardes rapatriées sur le PC ; le serveur démarre vide ; connexion SSH par mot de passe.

**Choix techniques** *à relire*
| Sujet | Décision |
|---|---|
| Système | Ubuntu 24.04 ; Docker installé depuis les paquets Ubuntu (`docker.io`, `docker-compose-v2`), sans script téléchargé. |
| Réglages serveur | `docker-compose.ovh.yml` ajouté à `docker-compose.yml` via `COMPOSE_FILE` dans le `.env` du serveur : les commandes `docker compose` habituelles fonctionnent telles quelles. Base et application sans port ouvert ; seul Caddy écoute (80, 443) avec un certificat Let's Encrypt automatique. |
| Sécurité | Pare-feu ufw (22, 80, 443), fail2ban (protection du mot de passe SSH), mises à jour de sécurité automatiques, swap de 2 Go pour la construction, `.env` lisible par l'administrateur seulement, mot de passe PostgreSQL aléatoire. |
| Adresse OVH gratuite | Risque : Let's Encrypt peut refuser un certificat si la limite hebdomadaire du domaine `ovh.net` est atteinte. Solution de repli documentée : un nom de domaine (≈ 10 €/an). |
| Sauvegardes | Archives de photos réduites à 7 jours + dimanches 30 jours (une archive complète par jour pendant 30 jours remplirait le disque du VPS). Rapatriement : `sftp get -a` (une seule demande de mot de passe, seuls les fichiers nouveaux sont téléchargés), testé ; automatique seulement avec une clé SSH. |
| Mise à jour | `scripts/ovh/mettre-a-jour.sh` : sauvegarde de la base, `git pull --ff-only`, reconstruction. |
| Version | 1.0.0 après validation de la mise en ligne par l'utilisateur. |

---

## 06/10/2026 — Rapatriement automatique des sauvegardes (demande de l'utilisateur)

| Sujet | Décision |
|---|---|
| Principe | Clé SSH dédiée créée sur le PC (`%USERPROFILE%\.ssh\vinted-helper-sauvegardes`, sans phrase secrète pour tourner seule), déposée sur le serveur par `scripts/installer-sauvegarde-auto.ps1` (mot de passe SSH demandé une dernière fois). |
| Limitation de la clé | `restrict,command="internal-sftp -R -d /opt/vinted-helper/sauvegardes/auto"` : uniquement sftp en **lecture seule** ; ni terminal, ni commande, ni modification ou suppression. La connexion par mot de passe reste inchangée. |
| Planification | Tâche planifiée Windows « Vinted Helper - sauvegardes », chaque jour à 12 h, rattrapée au démarrage si le PC était éteint, seulement avec réseau. Journal : `rapatriement.log` dans le dossier des sauvegardes. |
| Risque accepté | Quelqu'un qui a accès au PC peut lire les sauvegardes du serveur, qui sont de toute façon déjà copiées sur ce PC. |
