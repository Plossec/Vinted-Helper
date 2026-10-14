# ADR-0019 — Rapatriement automatique des sauvegardes

- **Date** : 06/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #2
- **Thème** : Serveur

[← Index des décisions](README.md)

## Décision

| Sujet | Décision |
|---|---|
| Principe | Clé SSH dédiée créée sur le PC (`%USERPROFILE%\.ssh\vinted-helper-sauvegardes`, sans phrase secrète pour tourner seule), déposée sur le serveur par `scripts/installer-sauvegarde-auto.ps1` (mot de passe SSH demandé une dernière fois). |
| Limitation de la clé | `restrict,command="internal-sftp -R -d /opt/vinted-helper/sauvegardes/auto"` : uniquement sftp en **lecture seule** ; ni terminal, ni commande, ni modification ou suppression. La connexion par mot de passe reste inchangée. |
| Planification | Tâche planifiée Windows « Vinted Helper - sauvegardes », chaque jour à 12 h, rattrapée au démarrage si le PC était éteint, seulement avec réseau. Journal : `rapatriement.log` dans le dossier des sauvegardes. |
| Risque accepté | Quelqu'un qui a accès au PC peut lire les sauvegardes du serveur, qui sont de toute façon déjà copiées sur ce PC. |
