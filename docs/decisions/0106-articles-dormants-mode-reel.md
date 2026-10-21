# ADR-0106 — Articles dormants : mode réel (étape 3 sur 3)

- **Date** : 21/10/2026
- **Statut** : Proposé — vérifications et refus « à relire » (voir Décision)
- **Décideurs** : utilisateur (demande de passage au mode réel, plan validé le 21/10/2026) ; vérifications proposées par Claude
- **Issue** : #147
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

Étape 3 de la tâche « Articles dormants » ([ADR-0073](0073-tache-articles-dormants.md),
[ADR-0095](0095-articles-dormants-execution-en-mode-essai.md)) : passer du mode essai au mode réel. Relevés de
l'utilisateur du 21/10/2026 : fenêtre de confirmation de la suppression (`item-delete-modal`, boutons
`item-delete-confirmation-button` « Supprimer » et `item-delete-cancelation-button` « Annuler ») et page
« Modifier l'annonce » (prix `price-input--input`, bouton « Valider » `upload-form-save-button`, case « Pousser »).

## Décision

| Sujet | Décision |
|---|---|
| Activation | Case **« Mode essai »** décochée sur la carte « Articles dormants » (extension 1.14 au moins) ; cochée, rien ne change. |
| Baisse réelle | « Modifier l'annonce » ouvert, nouveau prix saisi (avec un point, #176) puis relu ; **seul « Valider » est cliqué** (jamais « Pousser », ni les photos). |
| Republication réelle | Ordre d'ADR-0073 : « Supprimer » de l'annonce, puis « Supprimer » **cherché dans la fenêtre de confirmation** (le bouton de la page, de même texte, reste dessous ; jamais « Annuler », sauf si la confirmation n'est pas reconnue) ; puis nouvelle annonce publiée comme une publication (contrôle, « Ajouter »), nouveau lien enregistré. Échec de la recréation → article « Erreur », à republier d'un clic (#72). |
| *À relire* — refus | Prix affiché sur Vinted **différent** de celui de l'application : **rien n'est modifié**, erreur au journal. |
| *À relire* — vérification de la baisse | « Modifier l'annonce » est rouvert et le prix relu ; différent du nouveau prix → erreur et relevé. |
| *À relire* — vérification de la suppression | L'annonce est rouverte ; ses boutons « Modifier » / « Supprimer » encore présents → erreur, **rien n'est republié** (l'article reste En ligne). |

## Conséquences

- Extension 1.14.0 ; fausse page Vinted alignée sur les relevés du 21/10/2026 (tests du mode réel).
- Ce que Vinted affiche juste après « Valider » ou après la suppression n'a pas été relevé : à confirmer au premier
  essai réel, sur un seul article (une page inattendue arrête l'action, avec un relevé).
- Cahier des charges §5.15, `regles-en-vigueur.md`, guides ; version 1.25.0.
