# Décisions — Publication automatique sur Vinted

[← Index des décisions](README.md)

## 06/10/2026 — Publication des annonces par un programme sur le PC

**Décision (utilisateur)** : lever la règle « aucune automatisation de Vinted » pour **la seule publication des
annonces**. Risques expliqués et acceptés : les conditions d'utilisation de Vinted interdisent les outils
automatisés (suspension possible du compte, avec annonces, avis et porte-monnaie) ; le programme casse à chaque
changement du site Vinted.

| Sujet | Choix |
|---|---|
| Lancement | Programme en tâche de fond sur le PC (démarre avec Windows) ; le bouton de l'application suffit |
| Validation | Le programme remplit le formulaire **et clique lui-même « Ajouter »**, article après article |
| Champs ajoutés à la fiche | Couleur(s) (liste Vinted, 2 au plus) et format du colis (petit / moyen / grand, défaut réglable) |
| Navigateur | Profil Chrome dédié ; l'utilisateur s'y connecte à Vinted une fois |
| Après publication | Article passé En ligne (prix affiché, date du jour) ; lien de l'annonce gardé sur la fiche |
| Articles incomplets | Refusés, avec la liste de ce qui manque |

**Garde-fous (posés par Claude)**
- Aucun contournement de détection : pas de camouflage du navigateur, pas de résolution de captcha. Vérification
  Vinted, captcha, déconnexion ou champ introuvable → le programme s'arrête et l'article passe « en erreur » avec
  le motif.
- **Contrôle avant envoi** : chaque champ est relu dans la page ; s'il manque ou diffère, aucun clic.
- **Mode essai** (activé par défaut) : tout est rempli mais rien n'est publié, pour vérifier le remplissage.
- Le programme ne fait rien d'autre sur Vinted (ni lecture des ventes, ni messages, ni modification d'annonces).
- Les sélecteurs de la page Vinted sont regroupés dans un seul fichier, calibrés avec l'utilisateur sur son PC
  (Claude ne consulte jamais Vinted).

**Précisions de réalisation (06/10/2026, tranchées par Claude)**
- **Fréquence** : le programme demande à l'application **toutes les 5 minutes** s'il y a des articles à publier
  (changé le 06/10/2026 à la demande de l'utilisateur, au lieu de 10 s). Une sélection de plusieurs articles est
  publiée à raison d'**un seul article toutes les 10 minutes** (précisé le 06/10/2026 par l'utilisateur) ; les essais,
  qui ne publient rien, s'enchaînent. L'écran Publication Vinted affiche le programme « arrêté » après 16 minutes sans
  nouvelles.
- **Jeton** : un code d'accès réservé au programme (il commence par `vh_`), qui remplace le mot de passe puisque le
  programme tourne sans l'utilisateur. Il est créé dans Réglages → Publication Vinted et affiché une seule fois ; en
  créer un nouveau annule l'ancien. L'application n'en garde qu'une version brouillée (empreinte), qui permet de le
  reconnaître sans pouvoir le retrouver. Il ne permet que de lire les articles à publier et leurs photos, et de
  signaler « publié » ou « erreur ».
- Une seule publication à la fois. Une publication « en cours » depuis plus de 15 minutes passe en erreur et **n'est
  jamais relancée automatiquement** (risque d'annonce en double).
- La connexion à Vinted est vérifiée **avant** de prendre un article : un article ne reste jamais bloqué par une
  déconnexion.
- Mode essai mémorisé sur l'appareil (case de l'écran Publication Vinted) ; en essai, pause de relecture de 20 s,
  l'article reste À publier.
- Taille facultative (certaines catégories n'en ont pas) ; format du colis : celui de la fiche, sinon celui des
  Réglages (« petit » par défaut).

---

## 06/10/2026 — Blocage par Vinted : publication en pause

Au premier essai sur le PC, Vinted a affiché « Ta session a été bloquée » (activité automatisée détectée liée à
l'adresse IP). Conformément aux garde-fous, aucun contournement : le programme a été arrêté et retiré du démarrage
de Windows. Décision de l'utilisateur : **en pause**, rien n'est modifié pour l'instant. Piste proposée par Claude,
non retenue à ce jour : publication **assistée** (boutons « Copier » par champ et téléchargement des photos, sans
piloter le navigateur).

---

## 07/10/2026 — Nouvel essai par une extension Chrome (#54)

**Décision (utilisateur)** : retenter la publication automatique en s'inspirant des extensions payantes du marché
(Dotb, DressKare, Bleam, Friptadium) et des projets publics (`vinted-relist-extension` sur GitHub). Toutes
fonctionnent comme une **extension dans le Chrome habituel** de l'utilisateur, avec sa vraie session, une annonce à
la fois, avec des délais, et s'arrêtent sur captcha ou erreur d'accès.

| Sujet | Choix |
|---|---|
| Mécanisme | Extension Chrome (Manifest V3) `outils/extension-vinted/`, chargée « non empaquetée », au lieu du programme Playwright |
| Session Vinted | Celle de l'utilisateur, dans son Chrome ; aucun mot de passe saisi par l'extension |
| Action sur Vinted | Remplissage du formulaire visible « Vendre un article », puis clic « Ajouter » ; **aucun appel direct à l'API interne de Vinted** |
| Application | API et jeton inchangés (`/api/programme/…`) ; seuls les textes de l'écran Publication Vinted changent |
| Rythme | Vérification toutes les 5 min ; une annonce au plus toutes les 10 min, plus 0 à 3 min au hasard |
| Ancien programme | Conservé jusqu'à la validation de l'extension sur le PC, puis retiré |

**Garde-fous (posés par Claude)**
- Toujours **aucun contournement** : ni camouflage, ni résolution de captcha, ni changement d'adresse IP ou
  effacement des cookies (pourtant conseillés par certains outils du marché).
- Vérification (captcha), page « session bloquée » (nouveau repère texte), déconnexion, page illisible ou jeton
  refusé → **pause** : l'extension ne recharge plus Vinted et ne prend aucun article jusqu'au clic « Reprendre ».
- La page est vérifiée **avant** de prendre un article ; une publication interrompue n'est jamais relancée.
- Contrôle avant envoi et mode essai inchangés.
- CLAUDE.md, règle n° 4, mise à jour : la seule automatisation autorisée est la publication par cette extension.

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
- Relevé du 07/10/2026 (22:30) : catégorie, marque (« Macron ») et étapes précédentes passées ; la liste « État » est
  `[data-testid="category-condition-single-list-content"]`, chaque état une case `role="radio"` avec titre et
  description. Les options sont désormais cherchées dans tout conteneur « …-content » et comparées sur leur **titre**,
  à l'égalité d'abord (« Bon état » ≠ « Très bon état ») ; le contrôle avant envoi exige l'état exact.
- 07/10/2026 (#63, demande de l'utilisateur) : pause entre deux étapes ramenée à **5 secondes fixes** (au lieu de 15 à
  20 s). L'attente de 10 minutes entre deux annonces publiées est inchangée.
- 14/10/2026 (#185, demande de l'utilisateur) : la **règle n° 4** de `CLAUDE.md` (seule automatisation autorisée : la
  publication par l'extension ; Claude ne consulte jamais Vinted) est **supprimée entièrement**, pour récupérer les
  libellés réels des catégories (#177) et permettre les tâches automatisées (#147 à #151). L'interdiction
  `WebFetch` vers vinted.fr / vinted.com reste dans `.claude/settings.json` tant que l'utilisateur ne l'a pas retirée
  (fichier qu'il est seul à modifier). Les risques déjà acceptés (CGU de Vinted : suspension possible du compte)
  valent pour toute nouvelle automatisation.
- 14/10/2026 (#179, demande de l'utilisateur) : l'extension reprend le logo de l'application (sac « € » indigo,
  icônes générées depuis `client/public/icone.svg`) et ses couleurs ; ses trois fenêtres partagent `style.css`, avec
  un en-tête affichant la version. Aucun changement de comportement.
- Essais du 14/10/2026 (#176) :
  - prix : « NaN € » lu sur Vinted pour « 9,00 » saisi. Vinted reformate désormais le champ (« 9.00 € ») et ne lit
    pas la virgule. Le prix est saisi avec un point, puis relu à l'étape prix. Un contrôle avant envoi en échec joint
    maintenant un relevé.
  - catégorie : « Pulls col V » n'existe pas sur Vinted. Hommes › Vêtements › Sweats et pulls reprend la liste exacte
    de Vinted (journal d'erreur). Les articles déjà classés sont repris par la migration 0012 (Sweats à capuche →
    Pulls et pulls à capuche, Sweats zippés → Pulls à capuche avec zip, Pulls → Pulls ras de cou, Pulls col roulé →
    Pulls à col roulé, Pulls col V → Sweats à col V, Gilets → Cardigans). Les autres rayons seront rapprochés de
    Vinted à partir de relevés (#177).
- 14/10/2026 (#136, revue A6) : relecture des délais au regard de la règle n° 4. Ils servent à **espacer les
  publications** et à **laisser les pages se charger**, jamais à paraître humain ; tout tirage aléatoire est retiré.
  Inventaire (`service-worker.js`, `contenu.js`) :

  | Délai | Valeur | Rôle |
  |---|---|---|
  | Passage automatique | 5 min | demander à l'application s'il y a une annonce à publier |
  | Entre deux annonces publiées | **10 min fixes** (avant : + 0 à 3 min aléatoires, retirés) | espacer les publications |
  | Entre deux étapes du remplissage | **5 s fixes** (avant : tirées dans un intervalle) | laisser la page réagir |
  | Chargement de l'onglet | 30 s au plus | attendre la page « Vendre un article » |
  | Réponse du script de contenu | 20 × 0,5 s | attendre que le script soit chargé |
  | Après « Ajouter » | 60 s au plus | attendre la page de l'annonce créée |
  | Champs et listes (`contenu.js`) | 0,25 à 10 s au plus, puis 0,5 à 2 s | attendre qu'un élément apparaisse ou s'ouvre |

  En cas de vérification, de blocage ou de déconnexion : pause, reprise uniquement à la main (inchangé).
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

---

## 08/10/2026 — Extension validée, ancien programme retiré (#68)

Première annonce publiée par l'extension (doudoune #0006). Décision (utilisateur) : retirer l'ancien programme
Playwright (`outils/publication-vinted/`) et son installeur (`scripts/installer-publication.ps1`). Seule l'extension
Chrome publie désormais.

## 08/10/2026 — Statut « Erreur » (#72)

Décision (utilisateur) : une **vraie** publication en échec (erreur renvoyée par l'extension, publication
interrompue, article devenu incomplet) fait passer l'article **À publier → Erreur** ; en **mode essai**, rien ne
change. Le message de l'échec s'affiche sur la fiche et une alerte « Publications Vinted en erreur » apparaît sur
l'écran Articles. Sortie d'Erreur : « Publier sur Vinted » directement (l'article repasse À publier et entre dans la
file), « Revenir à « À publier » », « Publié à la main : mettre en ligne », Brouillon ou Sortie du stock. Le passage
vers Erreur n'est jamais proposé à la main. Cahier des charges §4.1 et §4.2 complétés ; migration 0009 (nouvelle
valeur `erreur_publication` du statut). Les filtres d'articles mémorisés avec les anciens statuts par défaut
reçoivent automatiquement « Erreur ».

## 13/10/2026 — Statut « Erreur » : précisions après la revue de code (#92, #93, #94)

- Une demande en **mode essai** depuis Erreur ne change pas le statut (cohérent avec la décision du 08/10/2026 : un
  essai ne change rien) ; une vraie demande repasse l'article À publier dans la même transaction que son ajout à la
  file.
- Coller le lien de l'annonce sur un article en Erreur (publiée à la main) le fait passer En ligne, comme pour un
  article À publier.
- Le message affiché sur la fiche est celui de la dernière **vraie** publication en échec.

## Format du relevé de l'extension (déplacé de l'agent `analyste-releve`, #115)

- `adresse`, `date`, `etat` (`pret`, `verification`, `bloque`, `deconnecte`).
- **Relevé automatique** (erreur pendant une publication) : `etape` (photos, titre, description, categorie, marque,
  taille, etat, couleurs, prix, colis), `erreur`, `selecteursTrouves`, `elements`.
- **Relevé à la demande** (bouton Diagnostic) : `selecteursTrouves`, `elements`, `apparusApresClicCategorie`,
  `options « Femmes »` (ancêtres des éléments dont le texte est « Femmes »).
- Chaque élément : `balise`, `type`, `name`, `id`, `testid`, `role`, `aria`, `ariaExpanded`, `placeholder`,
  `valeur` (ce que le champ contient, y compris ce que Vinted a pré-rempli), `coche`, `classe`, `texte` (80
  caractères, en minuscules, espaces regroupés), `visible`.
- `selecteursTrouves` : pour chaque champ de `SELECTEURS.champs`, le premier sélecteur présent, ou `null`. Un `null`
  n'est pas forcément une erreur (champ affiché seulement après le choix de la catégorie).
