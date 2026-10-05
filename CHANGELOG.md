# Journal des versions

Toutes les évolutions notables du projet. Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Lot 0 — mise en place : projet Node/TypeScript (serveur Fastify + interface React), base PostgreSQL et application
  lancées ensemble par Docker Compose, page d'accueil affichant la version et l'état de la base (clair / sombre).
- Module de calcul : fonction unique de répartition en centimes (règle d'arrondi), testée sur les cas 1 à 6, 9, 11, 12
  et 23 de l'annexe.
- Commandes `npm test`, `typecheck`, `lint`, `format`, `db:generate`, `db:migrate` et `db:sauvegarde` (copie datée
  de la base).
- Guide d'installation et d'utilisation pour Windows (`README.md`).
- Outillage Claude : sous-agent `relecteur` (relecture de fin de lot, à la demande), hook de formatage Prettier après
  chaque modification et hook de tests du module de calcul en fin de tour.
