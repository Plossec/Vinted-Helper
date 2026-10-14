# ADR-0007 — Lot 1 : choix pendant le développement

- **Date** : 05/10/2026
- **Statut** : Accepté
- **Décideurs** : Claude
- **Issue** : —
- **Thème** : Socle

[← Index des décisions](README.md)

## Décision

- **Tests sans Docker** : les tests de l'API tournent sur une vraie base PostgreSQL en mémoire (PGlite) avec les
  migrations du projet ; `npm test` ne touche jamais la base de l'utilisateur.
- **`vitest` déclaré aussi dans le client** (même outil que le serveur, pas de nouvelle bibliothèque) pour tester la
  lecture des montants saisis (virgule ou point → centimes entiers, sans calcul à virgule).
- **Mot de passe** : haché avec scrypt (intégré à Node). Jeton de session aléatoire dans un cookie inaccessible au
  JavaScript ; seule son empreinte est stockée. Changer le mot de passe déconnecte les autres appareils.
- **Dates de statut** : une date dans le futur est refusée (tolérance 5 minutes pour l'écart d'horloge). Aucune autre
  contrainte (une date antérieure à la création est acceptée ; l'historique est trié par date).
- **API** : les transitions proposées sont calculées par le serveur (source unique) ; l'interface ne les recopie pas.
- **Audit npm** : 4 alertes « modérées » sur une ancienne version d'`esbuild` utilisée en interne par `drizzle-kit`
  (outil de développement, absent de l'application livrée). La « correction » proposée (`npm audit fix --force`)
  rétrograderait `drizzle-kit` : non appliquée. À revoir quand `drizzle-kit` publiera une mise à jour.
