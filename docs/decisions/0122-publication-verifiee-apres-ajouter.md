# ADR-0122 — Publication vérifiée après « Ajouter » et prix saisi comme au clavier

- **Date** : 21/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #288
- **Thème** : Publication Vinted
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Journal du 20-21/11/2026 : 9 publications en « Erreur — Après « Ajouter » : pas de page d'annonce » alors que les
annonces sont en ligne (vérifié pour #0185 et #0041) : Vinted n'ouvre plus toujours la page de l'annonce après
« Ajouter ». Capture du 21/11/2026 : le champ prix affiche « 4.00 » mais Vinted ne l'a pas retenu (« Le champ prix doit
être supérieur ou égal à 1.0 »).

## Décision

| Sujet | Décision |
|---|---|
| Page de l'annonce non ouverte | L'extension **relève la page vue** (« Dernier relevé ») et **cherche l'annonce sur le profil** (les 20 annonces les plus récentes, même titre exactement) ; retrouvée : publiée avec son lien (choix de l'utilisateur). |
| Annonce non retrouvée | L'article **reste en Erreur**, avec un message clair : adresse de la page vue et raison (choix de l'utilisateur). |
| Attente | 60 s sur le formulaire comme avant ; sur une autre page que l'annonce, recherche après 5 s (choix de Claude, *à relire*). |
| Lecture du profil | Numéro du membre pris dans l'adresse ou un lien `/member/…` de la page, puis la liste des annonces du profil demandée à Vinted comme le fait la page du profil (`/api/v2/wardrobe/{id}/items`). **Pas encore relevée** sur Vinted : à confirmer avec le premier relevé (choix de Claude, *à relire*). |
| Prix | Saisi **comme au clavier** (texte sélectionné puis remplacé, puis sortie du champ) ; relu avec le **message d'erreur** sous le champ ; second essai par saisie directe ; refusé : erreur avant « Ajouter », jamais de clic (choix de Claude, *à relire*). Le contrôle avant envoi vérifie aussi ce message. |

## Conséquences

- Extension 1.16.0 (`contenu.js`, `service-worker.js`, `selecteurs.js`), faux Vinted des tests complété.
- Le premier « Dernier relevé » pris après « Ajouter » (étape `apres-ajouter`) servira à reconnaître la page vue.
- Les autres erreurs du même journal (marque « Autre », marque absente de Vinted, taille « 16A », catégories) relèvent
  du calibrage des listes et sont traitées à part.
