# Décisions — Lot 7 — alertes et sauvegarde

[← Index des décisions](README.md)

## 06/10/2026 — Lot 7 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Alertes | Calculées à chaque affichage (rien n'est stocké). Brouillon : depuis la dernière arrivée en Brouillon. Dormant : depuis la dernière baisse du prix affiché après la mise en ligne (une hausse ne relance pas le décompte). Jours comptés en dates de Paris. |
| Réduction des photos | Faite tout de suite au passage Finalisé / Sortie du stock (colis entier à la finalisation). Irréversible : annuler une sortie du stock ne fait pas revenir les photos supprimées. JPEG qualité 85, 1600 px au plus. |
| Sauvegarde automatique | Service Docker `sauvegarde` (image PostgreSQL déjà utilisée, rien à installer) : une fois par jour à partir de 3 h, ou au démarrage du PC si l'heure est passée ; base compressée + archive complète des photos ; 30 jours gardés. |
| Copie hors serveur | En attente de l'issue #2 (OVH) : en local, copie manuelle du dossier `sauvegardes/auto` (clé USB, cloud), expliquée dans le README. |
| Restauration | Script lancé dans le service `sauvegarde`, application arrêtée ; base remplacée (`pg_dump --clean`), photos remises sans effacer les plus récentes. Testée le 06/10/2026 sur la base de test. |

## 14/10/2026 — Photos d'un article revendu hors Vinted (issue #194)

**Décision (utilisateur)** : un article sorti « À vendre hors Vinted » (#180) garde ses photos en pleine taille ;
dès qu'il change de motif (**Revendu hors Vinted**, ou Donné, Jeté…), ses photos sont réduites comme pour une vente
Vinted finalisée (principale et terrain réduites, autres photos supprimées, irréversible). Comportement déjà en
place depuis #180 (même route que la sortie du stock) : il est désormais couvert par un test
(`server/src/photos/reduction.test.ts`).
