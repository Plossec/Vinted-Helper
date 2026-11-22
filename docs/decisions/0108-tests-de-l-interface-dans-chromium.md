# ADR-0108 — Tests de l'interface dans Chromium

- **Date** : 17/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #243
- **Thème** : Méthode

[← Index des décisions](README.md)

## Contexte

Revue du projet du 13/11/2026 : l'interface (`client/src/ecrans/` et `client/src/composants/`) n'a aucun test
automatique ; seuls les utilitaires et la file hors ligne du client sont testés. [ADR-0062](0062-tests-couverture-base-de-test-plus-rapide.md)
prévoyait des tests d'écrans « si besoin plus tard, avec Playwright » et écartait, pour l'instant, les tests de bout en
bout de Terrain et de la vente (coût dans la CI).

## Décision

Réponses de l'utilisateur (17/11/2026, #243) :

| Sujet | Décision |
|---|---|
| Dépendance | `playwright-core` en dépendance de développement à la racine (déjà utilisée par l'extension) |
| Parcours | Les quatre : saisie terrain (sortie, achat, lot, essence) ; fiche jusqu'à « À publier » ; vente groupée, envoi, finalisation ; tableau de bord |
| CI | Check séparé « Interface » (`.github/workflows/interface.yml`), lancé seulement quand `client/`, `server/` ou les dépendances changent |

Points tranchés par Claude (*à relire*) :
- **Où** : `server/navigateur/*.test.ts`, lancés par Vitest (`server/vitest.navigateur.config.ts`) ; le serveur de
  test réutilise les outils de `server/src/test/` (base PGlite en mémoire migrée, compte de test, IA simulée).
- **Quoi** : l'interface **construite** (`client/dist`) servie par le vrai serveur sur `127.0.0.1`, port libre ; une
  base vide par test ; vraie horloge (le tableau de bord montre le mois en cours) ; écran de téléphone 360 px,
  `fr-FR`, Europe/Paris ; service worker bloqué (pas de cache d'un test à l'autre). Aucun appel vers l'extérieur.
- **Données de départ** : le parcours Terrain passe entièrement par l'écran ; les trois autres préparent leurs articles
  par l'API (comme la file du téléphone) puis pilotent l'écran étudié.
- **Contrôles** : montants affichés comparés aux calculs du serveur (parts du lot et de l'essence, prix vendus et
  bénéfices d'une vente groupée §8, tuiles du tableau de bord) ; aucun calcul d'argent dans les tests.
- **Commande** : `npm run test:navigateur` (construit l'interface puis lance les parcours), **hors** de
  `npm run verifier` pour garder la vérification courante rapide. Chromium : `VH_CHROME_TEST` s'il est indiqué, sinon
  celui de Playwright (`npx playwright-core install chromium` une fois).
- **Échec** : l'écran au moment de l'échec est décrit dans la sortie (arbre d'accessibilité), pour comprendre sans
  rejouer le test.

## Conséquences

- ADR-0062 modifié : les tests d'écrans et les parcours Terrain et vente existent désormais.
- Durée : une quinzaine de secondes pour les quatre parcours (hors installation de Chromium dans la CI).
- Un écran dont un libellé change (bouton, champ) doit mettre à jour son parcours dans la même PR.
- D'autres parcours (retour, publication Vinted, hors réseau) pourront s'ajouter sur le même modèle.
