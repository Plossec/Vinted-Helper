# ADR-0091 — Prix vente minimum : verrou dans la base

- **Date** : 15/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #195
- **Thème** : Socle

[← Index des décisions](README.md)

## Contexte

[ADR-0048](0048-prix-vente-minimum.md) (#146) impose « prix vente minimum ≤ prix affiché », contrôlé par le serveur à
la création, à la modification et à la mise en ligne. Les futures tâches automatiques (#147, #149, #150) baisseront
des prix sans intervention : un oubli de contrôle dans un nouveau chemin laisserait passer un minimum au-dessus du prix.
Choix de l'utilisateur : « Verrou dans la base ».

## Décision

| Sujet | Décision |
|---|---|
| Verrou | Contrainte de la base `article_prix_minimum_inferieur_prix_affiche` : minimum vide, prix vide ou minimum ≤ prix affiché. Toute écriture contraire est refusée, quel que soit le chemin. |
| Contrôle du serveur | Gardé : il donne le message clair à l'utilisateur ; le verrou est le filet de sécurité. |
| Données existantes | Un minimum déjà au-dessus du prix affiché est ramené au prix affiché par la migration, juste avant de poser le verrou (sinon le déploiement échouerait). |
| Baisse refusée | Une tâche automatique qui voudrait descendre sous le minimum ne baisse pas et le signale dans « À faire » (réalisé avec #147). |

## Conséquences

- Migration `0017_prix_minimum_verrou` ; test sur des données existantes (`server/src/base/migrations.test.ts`).
- [ADR-0048](0048-prix-vente-minimum.md) : contrôle complété par cet ADR.
