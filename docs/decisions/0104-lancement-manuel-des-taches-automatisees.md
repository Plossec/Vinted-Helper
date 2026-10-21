# ADR-0104 — Lancement manuel des tâches automatisées, à toute heure

- **Date** : 21/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (réponses du 21/10/2026 et plan validé)
- **Issue** : #230
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

Première étape de la refonte des tâches automatisées (#230). Une tâche ne prévoyait ses actions qu'au passage de
l'extension, activée, dans la plage horaire et à sa fréquence ([ADR-0078](0078-rythme-des-taches-automatisees.md)) :
impossible de la lancer à la demande, par exemple pour tester. Demande : « pouvoir lancer manuellement chaque
tâche, qu'importe l'heure ».

## Décision

| Sujet | Décision |
|---|---|
| Bouton | « Lancer maintenant » par tâche, dans **Réglages → Tâches automatiques** et dans **« À faire »** (section « Lancer une tâche »). |
| Articles dormants | Le serveur prévoit tout de suite les actions, **quels que soient l'heure, la fréquence, les plafonds du jour et l'activation** de la tâche. Elles sont marquées « manuelles » : l'extension les exécute **à toute heure**. Mode manuel (liste à valider), pauses entre deux actions et mode essai inchangés. |
| Ventes finalisées | La lecture du « Porte-monnaie » est **demandée** : faite au prochain passage de l'extension, à toute heure, même tâche désactivée ; la demande s'efface une fois la lecture reçue. |
| Exécution | Au prochain passage de l'extension (5 minutes au plus, Chrome ouvert), ou tout de suite avec « Vérifier maintenant » dans l'extension. |
| Passages automatiques | Inchangés : activés, dans la plage horaire, à leur fréquence et dans les plafonds ; hors plage, l'extension ne reçoit que les actions manuelles. |

## Conséquences

- Migration `0020_taches_lancement_manuel` (ajouts seulement) : `action_vinted.manuelle`,
  `reglages.finalisation_lancement_demande`.
- Sans plafond, un lancement peut prévoir beaucoup d'actions d'un coup : en mode réel, risque de blocage par Vinted
  accepté par l'utilisateur.
- Cahier des charges §5.15, `regles-en-vigueur.md`, guide d'utilisation ; version 1.23.0.
