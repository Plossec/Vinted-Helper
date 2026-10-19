# ADR-0100 — Données personnelles : minimisation, conservation et non-indexation

- **Date** : 19/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (réponses du 19/10/2026 et plan validé)
- **Issue** : #216
- **Thème** : Photos et sauvegardes

[← Index des décisions](README.md)

## Contexte

Inventaire des données du 18/10/2026 (#216) : aucun nom ni adresse d'acheteur en base, mais les photos d'origine
gardaient leurs métadonnées EXIF (dont la **position GPS**, souvent celle du domicile) sur le serveur, dans les
sauvegardes et jusque sur Vinted ; le lien de la conversation et les commandes Vinted étaient gardés sans limite ;
rien n'empêchait l'indexation de l'application par les moteurs de recherche. L'achat pour revente avec bénéfice
étant probablement une activité commerciale, l'exemption « usage strictement personnel » du RGPD pourrait ne pas
s'appliquer : d'où l'intérêt de ne garder que le nécessaire.

## Décision

| Sujet | Décision |
|---|---|
| Photos envoyées | Réenregistrées en **JPEG** (qualité 90) à l'envoi, orientation appliquée, **sans aucune métadonnée** (choix de l'utilisateur), comme la rotation (ADR-0024). |
| Photos déjà enregistrées | Commande `npm run photos:sans-metadonnees -w server`, **en essai par défaut**, `-- --appliquer` pour nettoyer ; lancée une fois par l'utilisateur sur le serveur (guide OVH). La base est mise à jour avant d'effacer l'ancien fichier. |
| Conservation | Lien de la conversation (`article.url_conversation`) et commandes Vinted (`commande_vinted`) **effacés 6 mois après la finalisation** (choix de l'utilisateur), dans la purge quotidienne ; une commande plus ancienne relue sur Vinted est ignorée. La vente et ses montants restent. |
| Indexation | `robots.txt` (`Disallow: /`), balise `noindex` et en-tête `X-Robots-Tag: noindex, nofollow` sur toutes les réponses. |
| Mentions légales | Page `/mentions-legales` accessible sans connexion, liée sous l'écran de connexion : éditeur particulier non professionnel (identité communiquée à l'hébergeur, LCEN art. 1-1), hébergeur OVH, cookie de connexion seul, Gemini (choix de l'utilisateur). |
| Non traités ici | Rotation des journaux du serveur : issue #127. Purge des sauvegardes manuelles : contraire à la règle « ne jamais supprimer les sauvegardes ». Masquage des relevés de l'extension : un masquage automatique empêcherait le calibrage ; la consigne de l'agent `analyste-releve` (ne recopier aucune donnée personnelle) reste. |

## Conséquences

- Code : `server/src/photos/stockage.ts` et `service.ts`, `server/src/outils/photos-sans-metadonnees.ts`,
  `server/src/ventes/conservation.ts` (purge quotidienne dans `index.ts`, réception des commandes), en-tête dans
  `app.ts`, `client/public/robots.txt`, écran `MentionsLegales.tsx`. Aucune migration.
- Les archives de photos des sauvegardes déjà faites gardent les anciennes métadonnées jusqu'à leur expiration
  (7 jours, dimanches 30 jours).
- Cahier des charges §2.1, §5.6 et §5.10, `regles-en-vigueur.md`, guide OVH mis à jour ; version 1.20.0.
