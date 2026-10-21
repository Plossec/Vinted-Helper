# ADR-0105 — Tâches automatisées : réglages par tâche, état visible et journal de toutes les tâches

- **Date** : 21/10/2026
- **Statut** : Proposé — trois points « à relire » (voir Décision)
- **Décideurs** : utilisateur (réponses du 21/10/2026 et plan validé) ; points « à relire » proposés par Claude
- **Issue** : #232, #233 (refonte suivie dans #230)
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

Suite de la refonte des tâches automatisées (#230). Réglages → Tâches automatiques n'était qu'un long formulaire,
avec une plage horaire et un mode essai communs à toutes les tâches ; rien n'y montrait ce qu'une tâche avait fait ni
quand elle repasserait. Le journal (Publication Vinted) ne montrait que les actions des articles dormants, sans les
lectures des ventes finalisées.

## Décision

| Sujet | Décision |
|---|---|
| Écran | Une **carte repliable par tâche** : nom, « Activée » / « Désactivée », « Essai » / « Réel », dernier et prochain passage, actions du jour (avec les plafonds) toujours visibles. Ouverte : réglages principaux, **« Réglages avancés »** (pauses, plafonds), « Enregistrer » propre à la tâche, « Lancer maintenant », 10 dernières lignes de son journal. |
| Plage horaire | **Propre à chaque tâche** (remplace la plage commune d'[ADR-0078](0078-rythme-des-taches-automatisees.md)) ; 8 h – 22 h par défaut. |
| Mode essai | **Propre à chaque tâche** (remplace le mode commun d'[ADR-0094](0094-articles-dormants-realisation-cote-application.md) et d'[ADR-0096](0096-ventes-finalisees-realisation-etape-1.md)) ; à la mise à jour, chaque tâche reprend le réglage commun (essai). |
| Prochain passage | Le premier moment où la tâche, activée, passera à sa fréquence dans sa plage ; « aucun » si elle est désactivée. L'extension le fait à son passage suivant. |
| Journal | **Toutes les tâches** : une ligne par action des articles dormants, une ligne par **lecture** des ventes finalisées (« 12 commandes lues, 3 finalisées, 1 à rattacher »). **Filtres** par tâche, état et jour ; **raison des erreurs**. Affiché sous chaque tâche, en entier dans Réglages → Tâches automatiques et dans Publication Vinted. |
| Conservation | **3 mois** : les lignes plus anciennes sont effacées chaque jour. |
| *À relire* — relevé | Une ligne en erreur indique « Relevé enregistré : fenêtre de l'extension → Dernier relevé » ; le relevé **reste dans l'extension** (un lien direct obligerait à l'envoyer au serveur, alors qu'il peut contenir des données personnelles). |
| *À relire* — republications | Les **republications faites** sont gardées au-delà de 3 mois, sans être affichées : elles comptent pour les 3 republications avant « Invendu ». |
| *À relire* — lecture en erreur | Une lecture des ventes en erreur compte comme un passage : la suivante attend la fréquence réglée (sinon, elle recommencerait toutes les 5 minutes). |

## Conséquences

- Migration `0021_taches_reglages_par_tache_journal` : plage et mode essai par tâche (réglages communs recopiés, puis
  retirés), table `lecture_commandes`, `action_vinted.releve`.
- Extension 1.13.0 : elle signale à l'application l'échec d'une lecture des ventes et indique si un relevé a été
  enregistré lors d'une erreur.
- Cahier des charges §5.15, `regles-en-vigueur.md`, guides d'utilisation et de publication, architecture ;
  version 1.24.0.
