# ADR-0102 — Accessibilité de l'interface : contrastes, lecteurs d'écran, contrôle automatique

- **Date** : 19/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (réponses du 19/10/2026 et plan validé)
- **Issue** : #215
- **Thème** : Interface

[← Index des décisions](README.md)

## Contexte

Audit du 18/10/2026 (#215) : textes alternatifs et structure déjà corrects, 119 associations de couleurs sur 150
conformes (WCAG 2.2 AA). Restaient 11 contrastes insuffisants (articles incomplets de la sélection Vinted grisés à
55 %, texte d'aide des champs en thème sombre), des emojis et flèches lus à voix haute, des boutons répétés sans
contexte, des messages non annoncés, un graphique ignoré des lecteurs d'écran. Pas d'obligation légale (projet
personnel) : lisibilité pour l'utilisateur et pour les agents IA, qui lisent la même structure.

## Décision

| Sujet | Décision |
|---|---|
| Articles incomplets | Couleurs normales, **cadre en pointillés** et mention « **Incomplet** » avant ce qui manque ; case toujours non cochable (choix de l'utilisateur). |
| Texte d'aide des champs | Couleur du texte secondaire (contraste ≥ 4,5:1), dans l'application et l'extension (choix de l'utilisateur ; extension 1.11.2). |
| Emojis et flèches | Masqués aux lecteurs d'écran ; un lien qui ouvre un nouvel onglet l'annonce (« nouvel onglet ») ; repère ↗ placé dans une carte réservé à la souris (l'annonce reste accessible depuis la fiche). |
| Boutons répétés | Nom complet : « Supprimer la photo 2 », « Renommer « Levi's » », « Restaurer #0012 »… |
| Formulaires | Champs obligatoires signalés (`aria-required`, légende « * champ obligatoire » sur la fiche) ; champ de correction de date nommé. Les erreurs restent un message général, désormais annoncé. |
| Messages | Résultats et erreurs annoncés (`role="status"` / `role="alert"`), bandeaux « Hors ligne » et « Nouvelle version » compris. |
| Boutons de choix | État « choisi » annoncé (`aria-pressed`) et groupe nommé (tableau de bord, marques et lieux). |
| Graphique | Chaque mois lu avec son année et ses montants, cadre visible au clavier, mois avec l'année dans la bulle et le tableau, axes en 12 px ; tuiles regroupées sous leur nom. |
| Focus | Un élément atteint au clavier ne passe jamais sous les barres fixes du bas. |
| Contrôle automatique | `eslint-plugin-jsx-a11y-x` (règles recommandées) dans `npm run lint`, donc à chaque PR (choix de l'utilisateur). Variante maintenue de `eslint-plugin-jsx-a11y`, qui n'accepte pas ESLint 10. Exceptions justifiées dans `eslint.config.js` : `autoFocus` voulu (terrain, boîtes de dialogue) et options de la liste déroulante (clavier géré par le champ). |

## Conséquences

- Nouvelle dépendance de développement (rien n'est ajouté à l'application installée).
- Cahier des charges §2.2 et `regles-en-vigueur.md` complétés ; version 1.21.0 ; extension 1.11.2 (`git pull`, puis
  ↻ dans `chrome://extensions`).
