# ADR-0035 — Premiers essais et calibrage de l'extension

- **Date** : 07/10/2026
- **Statut** : Accepté · délais remplacés par [ADR-0071](0071-delais-de-l-extension.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #56, #57, #61, #63
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

**Précisions du 07/10/2026 (#56, #57)**
- Premier essai réel : photos, titre et description remplis ; arrêt sur la liste des catégories (« Femmes »
  introuvable). Ajout d'un bouton **Diagnostic** dans l'extension : il relève la structure du formulaire (sans les
  saisies) et ouvre la liste des catégories sans rien choisir, pour calibrer `selecteurs.js` sans que Claude consulte
  Vinted.
- À la demande de l'utilisateur, **pause de 15 à 20 s** (au hasard) entre chaque étape du remplissage ; le service
  worker pilote les étapes une à une et vérifie la page (captcha, blocage) avant chacune. Ce ralentissement ne
  masque pas l'automatisation : le risque de blocage reste le même.
- Diagnostic du 07/10/2026 : la liste des catégories est `[data-testid="catalog-select-dropdown-content"]`, chaque
  catégorie une case `role="button"` ; le menu du haut du site porte les mêmes libellés (« Femmes »…). Les options ne
  sont donc cherchées **que dans les listes ouvertes**, jamais dans l'en-tête ni la navigation. En cas d'erreur
  d'étape, l'extension enregistre un **relevé automatique** de la page (bouton « Dernier relevé »).
- Relevé du 07/10/2026 (essai « Doudoune FC Nantes ») : Femmes › Vêtements › Manteaux et vestes est bien parcouru,
  mais « Doudounes et vestes matelassées » n'existe pas à ce niveau sur Vinted (Capes et ponchos, Manteaux, Vestes sans
  manches, Vestes). Vinted peut aussi **remplir lui-même la catégorie** (suggestion). Décision (utilisateur) : vérifier
  d'abord si le champ est déjà rempli avec la bonne valeur et n'y toucher que sinon (étendu par Claude à la marque,
  la taille, l'état et aux couleurs : recliquer une couleur la décocherait). Si un niveau du chemin manque, la
  catégorie finale est cherchée avec « Trouver une catégorie » ; en dernier recours, erreur listant les choix
  proposés par Vinted. Le format du colis est une série de cases (« Petit », « Recommandé Moyen »…), pas une liste.
- Relevé du 07/10/2026 (22:18) : Vinted avait suggéré « Doudounes » dans le rayon **Hommes** pour un article Femmes ;
  sa recherche renvoie des cases « nom + chemin » (« Doudounes — Femmes > Vêtements > Manteaux et vestes > Vestes »).
  La catégorie est donc désormais choisie **par la recherche**, en exigeant le même rayon que l'article, puis le nom
  identique ou le plus proche (nom de Vinted par lequel commence celui de l'application). Si le bon résultat est déjà
  coché, rien n'est touché (demande de l'utilisateur) ; le contrôle avant envoi relit le nom retenu. L'arbre des
  catégories de l'application (`server/src/catalogue/`) reste à rapprocher de celui de Vinted (sujet à part).
  Fait le 14/10/2026 (#177, [ADR-0065](0065-categories-recopiees-de-vinted.md)) ; les articles de catégorie « Autre » ne sont pas publiés automatiquement.
- Relevé du 07/10/2026 (22:30) : catégorie, marque (« Macron ») et étapes précédentes passées ; la liste « État » est
  `[data-testid="category-condition-single-list-content"]`, chaque état une case `role="radio"` avec titre et
  description. Les options sont désormais cherchées dans tout conteneur « …-content » et comparées sur leur **titre**,
  à l'égalité d'abord (« Bon état » ≠ « Très bon état ») ; le contrôle avant envoi exige l'état exact.
- 07/10/2026 (#63, demande de l'utilisateur) : pause entre deux étapes ramenée à **5 secondes fixes** (au lieu de 15 à
  20 s). L'attente de 10 minutes entre deux annonces publiées est inchangée.
- 07/10/2026 (#61) : « Vérifier maintenant » semblait ne rien faire (file vide, ou attente de 10 min après une
  **erreur**). L'attente de 10 minutes ne suit plus qu'une **publication réelle** ; un passage demandé à la main écrit
  toujours son résultat dans le journal (les passages automatiques restent silencieux quand il n'y a rien à faire).
- Essai du 07/10/2026 (22:50) : formulaire complet sauf la **taille** (« S » sur la fiche, restée vide sur Vinted,
  sans erreur). Cause probable : la recherche « contient » acceptait n'importe quelle option contenant un « s », et la
  taille n'était pas relue. Désormais : « contient » seulement pour un texte d'au moins 3 lettres, puces `button`
  cherchées dans les listes ouvertes, taille relue à l'identique par le contrôle (erreur + relevé sinon).
- Première vraie publication (08/10/2026, 01:03) : arrêtée par le contrôle avant envoi, rien de publié. Vinted
  affiche le prix saisi « 9,00 » sous la forme « 9.00 » (comparaison désormais en nombre) ; les photos déposées sont
  des `[data-testid="image-wrapper-N"]` (le repère supposé `image-grid` ne trouvait rien, d'où « 0 sur 5 »).
