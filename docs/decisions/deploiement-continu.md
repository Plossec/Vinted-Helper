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

## 13/10/2026 — CI complétée (issue #124)

| Sujet | Décision |
|---|---|
| Audit | `npm audit --omit=dev` dans le check « Vérifier » (bloquant) : seules les dépendances embarquées en production comptent ; les 4 alertes modérées de `drizzle-kit` (outil de développement) ne bloquent pas. Jamais `npm audit fix --force`. |
| Image Docker | Job « Construire l'image Docker » sur chaque pull request (pas sur `main` : le serveur construit lui-même l'image et revient en arrière si besoin, #119). |
| Extension | Workflow `extension.yml` : tests de l'extension sur la fausse page Vinted, seulement quand `outils/extension-vinted/` change, avec le Chromium de Playwright (Chrome du commerce n'accepte plus `--load-extension`). |
| CodeQL | Analyse de sécurité GitHub (gratuite, dépôt public) à chaque PR, à chaque fusion et chaque lundi ; alertes dans l'onglet « Security ». |
| Dependabot | Une PR par semaine et par écosystème npm (mineures et correctives regroupées), actions et images Docker chaque mois ; rien n'est fusionné automatiquement. |
| Non fait | Images Docker et actions épinglées à une version exacte : Dependabot suffit pour être prévenu, sans risque de casser la mise en production par une étiquette inexistante. Secret scanning : réglage GitHub à activer par l'utilisateur. |

## 13/10/2026 — Dependabot : TypeScript 7 ignoré pour l'instant (issue #169)

**Décision (utilisateur)** : la PR Dependabot #162 (TypeScript 7) est fermée, `typescript-eslint` 8.x n'acceptant
que `typescript < 6.1`. Dependabot ignore les versions majeures de TypeScript jusqu'à ce que typescript-eslint suive
(règle à retirer alors). Mises à jour Dependabot : les **mineures** sont fusionnées quand la CI est verte ; les
**majeures** (Node 26 dans l'image Docker, `@types/node` 26) attendent d'être faites ensemble, avec un essai sur le
serveur. Une PR qui touche `.github/` ou le `Dockerfile` reste soumise à l'accord de l'utilisateur.
