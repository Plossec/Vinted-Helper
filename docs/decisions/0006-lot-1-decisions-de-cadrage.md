# ADR-0006 — Lot 1 : décisions de cadrage

- **Date** : 05/10/2026
- **Statut** : Accepté · « À publier » sans contrôle : remplacé par [ADR-0093](0093-completude-des-le-passage-a-publier.md)
- **Décideurs** : utilisateur
- **Issue** : —
- **Thème** : Socle

[← Index des décisions](README.md)

## Décision

| Sujet | Décision |
|---|---|
| Statuts | Le tableau complet des transitions (§4.2) est codé et testé côté serveur dès le lot 1 ; l'interface et l'API ne proposent que Brouillon ↔ À publier ↔ En ligne. Les autres passages (vente, colis, sortie du stock) arrivent au lot 3. |
| Photos d'annonce | Au lot 2, avec les photos terrain. La fiche du lot 1 est sans photo. |
| Listes de référence | Pré-remplies au premier démarrage avec les valeurs du tableur de l'utilisateur ; modifiables ; nouvelles valeurs créées à la volée. Unicité sans tenir compte des majuscules. |
| Session | 30 jours sans utilisation, prolongée à chaque usage ; déconnexion dans les Réglages. |
| Prix affiché | Historique enregistré dès le lot 1 (chaque saisie ou modification datée) ; affichage de l'historique sur la fiche au lot 3. |
| Champs obligatoires (création manuelle) | Nom, lieu, prix d'achat, date d'achat (aujourd'hui par défaut). Lieu « Maison » : prix d'achat proposé à 0 €. |
| À publier | Aucun contrôle de complétude (non défini au cahier des charges). Seul « En ligne » exige un prix affiché. |
| Dépendances ajoutées | `@fastify/cookie` (cookie de session), `react-router` (navigation), `@electric-sql/pglite` en dév. (PostgreSQL en mémoire pour les tests, sans Docker). |
