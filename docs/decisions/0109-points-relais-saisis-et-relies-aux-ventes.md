# ADR-0109 — Points relais saisis et reliés aux ventes

- **Date** : 17/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #210
- **Thème** : Ventes

[← Index des décisions](README.md)

## Contexte

Pour déposer un colis ou récupérer un retour, il faut chercher le bon point relais sur le site de chaque transporteur.
Demande de l'utilisateur : « centraliser les points relais (laposte, vintedgo, mondialrelay,...) les plus proches de
chez soi, pour récupérer le statut du point relais si possible ». Le §10 du cahier des charges excluait le « mode
d'envoi ». Aucun transporteur n'offre d'API publique sans compte professionnel.

## Décision

Réponses de l'utilisateur (17/11/2026, #210) :

| Sujet | Décision |
|---|---|
| Usage | Liste des points relais **et** lien avec les ventes : point de dépôt du colis, point de retrait d'un retour |
| §10 | Ajusté : le point relais de dépôt ou de retrait d'une vente entre dans le périmètre ; le reste du « mode d'envoi » (choix du transporteur, bordereau, suivi) reste exclu |
| Transporteurs | Vinted Go, Mondial Relay, La Poste / Colissimo, Relais Colis / Chronopost |
| Statut voulu | Ouvert / fermé et horaires, fermeture exceptionnelle, point plein, point désactivé |
| Source du statut | Lecture des sites par l'extension Chrome, **une issue par transporteur**, réglée à partir de relevés |
| Découpage | D'abord les points saisis à la main et le lien avec les ventes (#210) ; la lecture par l'extension ensuite |

Points tranchés par Claude (*à relire*) :
- **Saisie** : transporteur, nom, adresse, numéro du point, page officielle (https), horaires de la semaine, notes.
  Écran « Points relais » dans le menu des Réglages.
- **Horaires** : jusqu'à 4 plages par jour (« 9h-12h, 14h-19h » ; vide ou « Fermé » = jour de fermeture), heure de
  Paris. L'état « Ouvert — ferme à 19 h » / « Fermé — ouvre demain à 9 h » est calculé par l'écran d'après ces horaires
  ; une fermeture exceptionnelle se vérifie sur la page officielle en attendant la lecture par l'extension.
- **Archivage** plutôt que suppression : un point archivé n'est plus proposé, mais reste sur les ventes passées.
- **Lien avec les ventes** : deux colonnes facultatives de `vente`, point de dépôt et point de retrait. Choix sur la
  fiche de l'article : « Point de dépôt du colis » (À expédier, Envoyé), « Point de retrait du retour » (À récupérer,
  vente d'où l'article revient). Le point vaut pour tout le colis.
- **Itinéraire** : lien vers Google Maps à partir de l'adresse saisie (ouvert seulement quand l'utilisateur le touche).
- **Position « chez soi »** et rayon de recherche : sans objet tant que les points sont saisis à la main.

## Conséquences

- Migration 0022 : table `point_relais` (type `transporteur`), colonnes `point_depot_id` et `point_retrait_id` de
  `vente` (ajouts seulement).
- Cahier des charges : §5.6 (points relais), §7 (modèle de données), §10 (mode d'envoi précisé).
- À suivre : une issue par transporteur pour la lecture du statut par l'extension (nouveaux champs du point relais à
  ce moment-là).
