# Décisions — Déploiement continu

[← Index des décisions](README.md)

## 07/10/2026 — Déploiement à chaque fusion dans main (demande de l'utilisateur)

| Sujet | Décision |
|---|---|
| Principe | GitHub Actions (`.github/workflows/deploiement.yml`) : **vérification** à chaque pull request et fusion (types, lint, format, tests, construction) ; **déploiement** après une fusion dans `main` si la vérification est verte, en lançant `scripts/ovh/mettre-a-jour.sh` (sauvegarde de la base, `git pull`, reconstruction). Choisi par l'utilisateur plutôt qu'une vérification périodique par le serveur. |
| Accès de GitHub au serveur | Utilisateur dédié `deploiement`, clé SSH dont la seule commande possible est le lanceur `/usr/local/sbin/vinted-helper-deployer` (`restrict,command=…`), autorisé par une règle `sudo` limitée à ce lanceur. Ni terminal, ni autre commande. Clé privée uniquement dans les secrets GitHub (pas gardée sur le serveur). |
| Sûreté | Un déploiement à la fois (verrou côté serveur et `concurrency` côté GitHub). Échec de construction : l'ancienne version reste en ligne ; e-mail d'échec de GitHub. Journal : `/var/log/vinted-helper-deploiement.log`. Secrets absents : déploiement ignoré (avertissement), la vérification reste faite. |
| Risque accepté | Le code fusionné dans `main` est exécuté sur le serveur avec les droits d'administrateur (c'est le principe de la mise à jour) : seul l'utilisateur fusionne dans `main`. |

## 13/10/2026 — Vérification après déploiement et retour automatique (issue #119, choix de l'utilisateur)

| Sujet | Décision |
|---|---|
| Vérification | Après `docker compose up -d --build`, `scripts/ovh/mettre-a-jour.sh` attend jusqu'à 3 minutes que `/api/sante` réponde avec la base connectée (vérifié dans le conteneur `app`), puis le confirme 15 s plus tard (pas de redémarrage en boucle). Un `healthcheck` Docker du service `app` affiche aussi cet état dans `docker compose ps`. |
| Retour automatique | Si la nouvelle version ne répond pas : retour du code à la **dernière version qui a répondu** (`sauvegardes/avant-mise-a-jour/version-en-ligne`, à défaut celle d'avant `git pull`), reconstruction, nouvelle vérification. Le job GitHub échoue dans tous les cas (e-mail) : code 1 si l'ancienne version est en ligne, 2 si le site est à réparer. |
| Base de données | **Jamais restaurée automatiquement** (effacerait les saisies faites depuis la sauvegarde) : étape à la main du guide « Si une mise à jour échoue », avec la sauvegarde `avant-mise-a-jour` nommée dans le message d'échec. |
| Script modifié pendant son exécution | `git pull` remplace le fichier mais le script déjà lancé continue avec l'**ancienne** version (constaté au déploiement de #141) : une modification de `mettre-a-jour.sh` ne s'applique qu'au déploiement **suivant**. Simulé (faux `git` et `docker`) : nouvelle version saine, cassée, retour impossible. |
| Service « sauvegarde » | Il garde en mémoire son script et `docker compose up` ne le redémarre pas quand seul `scripts/sauvegarde/` change (constaté : correctif #117 pas encore actif après le déploiement de #141). Après un déploiement réussi, le service est redémarré si le contenu de ce dossier a changé depuis son dernier redémarrage par le script (empreinte Git du dossier, `sauvegardes/avant-mise-a-jour/scripts-sauvegarde`). |
