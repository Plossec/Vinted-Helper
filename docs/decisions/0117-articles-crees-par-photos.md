# ADR-0117 — Articles créés à partir de photos

- **Date** : 18/11/2026
- **Statut** : Accepté · modifié par [ADR-0118](0118-regroupement-des-photos-plus-fiable.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #276
- **Thème** : IA Gemini
- **À relire** : non (validé par l'utilisateur le 18/11/2026)

[← Index des décisions](README.md)

## Contexte

Demande de l'utilisateur (18/11/2026) : « déposer x photos de x articles et que l'application crée les articles en
conséquence automatiquement ; pour les articles où des informations sont manquantes, il faudra les compléter
manuellement, il faudra donc les détecter ». Réponses détaillées dans #276. Le §10 qui excluait l'import et la
suggestion de prix est retiré par #277 ([ADR-0116](0116-hors-perimetre-retire.md)).

## Décision

| Sujet | Décision |
|---|---|
| Où | Écran « Nouveaux articles par photos » (Articles → lien en bas), téléphone (galerie) et PC (choix de fichiers) (choix de l'utilisateur). |
| Regroupement | Un appel à l'IA avec toutes les photos réduites : elle propose un groupe par article ; l'utilisateur déplace une photo si besoin, puis crée (choix de l'utilisateur). Sans l'IA (quota, panne) : une photo par article, à regrouper à la main (choix de Claude, validé par l'utilisateur). |
| Création | Un **brouillon** par groupe, photos d'annonce (la première est la principale) ; pas de relecture des champs avant (choix de l'utilisateur). |
| Achat | Sortie, ou lieu et date, **une fois pour le lot** ; prix d'achat total facultatif : réparti comme un lot (§6.1) s'il y a plusieurs articles, sinon à compléter article par article (choix de l'utilisateur). |
| Remplissage | Un appel par article (photos et étiquette ensemble, 10 photos au plus envoyées) : nom, catégorie, marque (créée si nouvelle), état, couleurs (2 au plus), taille, matière, titre et description (« Réf. N »), **prix affiché proposé** (arrondi au 0,50 € au-dessus, `calculs/prix-propose.ts`) (choix de l'utilisateur). Seuls les champs encore vides sont remplis (choix de Claude, validé par l'utilisateur). |
| Quota | Même limite que les boutons (30 appels par heure) ; au-delà, l'article reste « en attente d'analyse » et passe au tour suivant (toutes les 10 minutes) (choix de l'utilisateur ; intervalle : choix de Claude, validé par l'utilisateur). Après **3 erreurs** de l'IA, l'article est « à remplir à la main » (choix de Claude, validé par l'utilisateur). |
| Ce qui manque | Écran « À faire », section « À traiter » : « Créé par photos — il manque : … » (analyse en attente, nom, prix d'achat, prix affiché, annonce, catégorie, marque, état, couleur, photos), lien « Compléter » ; un tel brouillon n'est pas aussi compté comme « brouillon ancien » (choix de Claude, validé par l'utilisateur). |
| Limites | 60 photos par lot (choix de Claude, validé par l'utilisateur) ; moins de 10 photos par article conseillées, avertissement au-delà (choix de l'utilisateur). |

## Conséquences

- Migration `0025_articles_par_photos` : colonnes `article.analyse_ia` (en attente, faite, échec) et
  `article.analyse_essais`.
- Toutes les photos du lot partent chez Google (comme « Générer l'annonce »).
- Le prix proposé par l'IA est indicatif : à vérifier sur la fiche avant la mise en ligne.
