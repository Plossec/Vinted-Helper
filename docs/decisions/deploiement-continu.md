# Décisions — Déploiement continu

[← Index des décisions](README.md)

## 07/10/2026 — Déploiement à chaque fusion dans main (demande de l'utilisateur)

| Sujet | Décision |
|---|---|
| Principe | GitHub Actions (`.github/workflows/deploiement.yml`) : **vérification** à chaque pull request et fusion (types, lint, format, tests, construction) ; **déploiement** après une fusion dans `main` si la vérification est verte, en lançant `scripts/ovh/mettre-a-jour.sh` (sauvegarde de la base, `git pull`, reconstruction). Choisi par l'utilisateur plutôt qu'une vérification périodique par le serveur. |
| Accès de GitHub au serveur | Utilisateur dédié `deploiement`, clé SSH dont la seule commande possible est le lanceur `/usr/local/sbin/vinted-helper-deployer` (`restrict,command=…`), autorisé par une règle `sudo` limitée à ce lanceur. Ni terminal, ni autre commande. Clé privée uniquement dans les secrets GitHub (pas gardée sur le serveur). |
| Sûreté | Un déploiement à la fois (verrou côté serveur et `concurrency` côté GitHub). Échec de construction : l'ancienne version reste en ligne ; e-mail d'échec de GitHub. Journal : `/var/log/vinted-helper-deploiement.log`. Secrets absents : déploiement ignoré (avertissement), la vérification reste faite. |
| Risque accepté | Le code fusionné dans `main` est exécuté sur le serveur avec les droits d'administrateur (c'est le principe de la mise à jour) : seul l'utilisateur fusionne dans `main`. |
