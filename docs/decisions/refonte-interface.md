# Refonte de l'interface (issue #138)

Décisions du 13/10/2026. Elles complètent le cahier des charges (§2.2, §2.3, §5) et `.claude/rules/interface.md`.
Les trois variantes comparées (A Sobre, B Chaleureux, C Techno, en clair et en sombre, avec leurs états) sont dans
[`refonte-interface-options.html`](refonte-interface-options.html) : à ouvrir dans un navigateur.

## Choix de l'utilisateur

| Sujet | Décision |
|---|---|
| Direction | **C — Techno** (indigo). A — Sobre avait d'abord été retenue, puis remplacée par C. |
| Palette | Indigo, contrastes mesurés (WCAG) : voir le tableau ci-dessous. |
| Typographie | **Polices du système uniquement** (aucune police embarquée, aucune dépendance ajoutée). Montants, références et quantités en police à chasse fixe du système, chiffres alignés. L'association Space Grotesk + IBM Plex Sans + JetBrains Mono, vue dans la maquette, n'est pas retenue. |
| Boutons | Plein (principal), contour (par défaut), fantôme ; hauteur 48 px ; rayon 6 px. |
| Densité | Standard : marge de page 16 px, écart de 12 px entre éléments. |
| Mode sombre | Automatique (réglage du téléphone) **+ réglage manuel** Auto / Clair / Sombre dans les Réglages, mémorisé sur l'appareil (`localStorage`, clé `vh-theme`). |

## Design tokens (`client/src/styles.css`, bloc `:root`)

Chaque couleur est déclarée **une seule fois** avec `light-dark(clair, sombre)` ; l'attribut `data-theme` de `<html>`
(posé par `client/src/theme.ts`) force `color-scheme` sur `light` ou `dark`.

| Token | Clair | Sombre |
|---|---|---|
| `--fond` | `#F6F7FB` | `#0A0C1A` |
| `--surface` (cartes, champs) | `#FFFFFF` | `#14172E` |
| `--texte` | `#10132A` (17,1:1) | `#E9EBFA` (16,4:1) |
| `--texte-secondaire` | `#4B5070` (7,3:1) | `#A0A6CC` (8,2:1) |
| `--bordure` | `#D8DBEB` | `#272B4D` |
| `--bordure-champ` | `#7C82A8` (3,5:1) | `#5C6392` (3,4:1) |
| `--accent` | `#4338CA` (7,4:1) | `#9AA2FF` (8,3:1) |
| `--accent-survol` | `#3730A3` | `#B7BCFF` |
| `--accent-doux` | `#E8E7FB` | `#20244A` |
| `--accent-texte` | `#FFFFFF` (7,9:1 sur l'accent) | `#0B0D26` (8,2:1 sur l'accent) |
| `--erreur` | `#C11A33` (5,7:1) | `#FF8D9C` (8,8:1) |
| `--erreur-doux` | `#FDE7EA` | `#3C1220` |
| `--ok` | `#12794A` (5,1:1) | `#5BD79B` (10,8:1) |
| `--pastille` (texte blanc dessus) | `#C11A33` (6,1:1) | `#B01B33` (6,9:1) |

Badges de statut (texte `--fond` dessus, tous ≥ 5,1:1) : brouillon `#5F6485` / `#A0A6CC`, à publier `#8A5A00` /
`#E3B341`, en ligne `#4338CA` / `#9AA2FF`, vente `#8E2FA8` / `#D58BFF`, finalisé `#12794A` / `#5BD79B`, à récupérer
`#B04A00` / `#FFA657`, erreur `#C11A33` / `#FF8D9C`. La couleur des graphiques est l'accent.

- **Tailles de texte (6)** : `--t-petit` 0,8 rem · `--t-secondaire` 0,9 · `--t-corps` 1 · `--t-h2` 1,2 · `--t-h1` 1,6 ·
  `--t-chiffre` 2 (gros chiffres du tableau de bord, une tuile par ligne). Poids 600 pour titres, boutons et libellés.
- **Rayons** : `--rayon` 6 px (boutons, champs, vignettes) · `--rayon-carte` 8 px · `--rayon-badge` 4 px ·
  `--rayon-rond` seulement pour la pastille du compteur.
- **Ombre** : aucune par défaut (bordures d'1 px) ; `--ombre-flottante` réservée aux listes déroulantes, bulles et
  barre de sélection.
- **Espacements** (échelle de 4 px) : `--e-1` 4 · `--e-2` 8 · `--e-3` 12 · `--e-4` 16 · `--e-6` 24 · `--e-8` 32.
- **Zone tactile** : `--hauteur-tactile` 48 px.

## États (boutons et champs)

- **Survol** : bouton plein → `--accent-survol` ; contour / fantôme → fond `--accent-doux` ; champ → bordure `--texte-secondaire`.
- **Focus** : contour de 3 px (`--accent`) ; champ : bordure `--accent` + halo.
- **Désactivé** : couleurs grisées (jamais une simple opacité), curseur interdit ; champ : bordure en pointillés.
- **Erreur** : couleur `--erreur` + icône ⚠ (jamais la couleur seule) ; champ `aria-invalid="true"` : bordure de 2 px
  + fond `--erreur-doux`.

## Icône et barre d'état (13/10/2026)

- **Icône** redessinée : tuile indigo `#4338CA` (coins 88/512), sac blanc plein avec le € découpé dans la couleur de la
  tuile (lisible même à 48 px). Fichiers : `client/public/icone.svg` (source) et les PNG `icone-192`, `icone-512`,
  `icone-masquable-512` (pleine page, glyphe dans la zone sûre) et `apple-touch-icon` (pleine page, sans transparence).
- **Barre d'état** : couleur du fond de page — `#F6F7FB` en clair, `#0A0C1A` en sombre (deux balises `theme-color` selon
  `prefers-color-scheme` ; un thème forcé dans les Réglages les remplace, voir `theme.ts`). Manifeste : `theme_color` et
  `background_color` `#4338CA` (écran de lancement aux couleurs de l'icône).

## Hors périmètre de cette refonte

- Aucune dépendance ajoutée ; aucune règle de calcul, de données ni d'API modifiée.

## 13/10/2026 — Fiche article : avertissement des saisies non enregistrées (issue #99)

**Décision (utilisateur)** : les boutons d'enregistrement séparés restent ; seul un **avertissement** est ajouté
(ni enregistrement automatique, ni bouton unique). Quitter la fiche (lien, navigation, retour), fermer ou recharger
l'onglet, ou ouvrir un changement de statut avec une saisie non enregistrée demande confirmation, en nommant ce qui
serait perdu : la fiche, l'annonce, les liens Vinted, le boost. Créer ou supprimer l'article quitte la fiche sans
question. Boîte de confirmation du navigateur pour l'instant (boîtes accessibles : #132).
