# ADR-0047 — Qualité du code : doublons retirés

- **Date** : 13/10/2026
- **Statut** : Proposé
- **Décideurs** : Claude
- **Issue** : #133
- **Thème** : Méthode
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décision (Claude, *à relire*)**, sans refonte :
- un seul `messageErreur` côté client, un seul `idDe` pour les routes, un seul `centimesVersSaisie` côté serveur ;
- `react`, `react-dom`, `react-router` passent en dépendances de développement (embarqués par Vite) : l'image
  Docker de production ne les installe plus ;
- `docs/categories-vinted.md` est **généré** depuis `catalogue/categories.ts` (`npm run doc:categories -w server`) ;
  un test échoue si l'annexe n'est plus à jour.
- **Non faits** : la réécriture de `annulerDernierChangement` en table (Q4), jugée sans gain réel (lisible, testée)
  et risquée ; le découpage des gros fichiers (Q5), à faire seulement quand on y touche.
