# ADR-0039 — `/lot` en mode issues / PR

- **Date** : 08/10/2026
- **Statut** : Accepté · « une décision va dans le fichier de son sujet » : remplacé par un fichier par décision (#197, index ci-dessous) ; plusieurs issues par PR : précisé par [ADR-0099](0099-consignes-de-claude-autonomie-et-decisions.md)
- **Décideurs** : utilisateur
- **Issue** : #82
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : les lots du §9 étant terminés, `/lot` ne démarre plus un lot mais **réalise une issue**
de bout en bout : `/lot <numéro>` (ou une demande en texte libre, qui crée d'abord l'issue). Étapes : point de départ,
lecture de l'issue et des sources, questions, plan (validation demandée pour une migration, le calcul, le cahier des
charges, une règle, une dépendance ou plusieurs écrans), réalisation avec tests, `/verifier`, documentation, PR
`#N — …` fusionnée quand la CI est verte. Une nouvelle décision va dans le fichier de son sujet.
