# ADR-0115 — Vocabulaire « extension » et dossiers utilitaires / commandes

- **Date** : 18/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #246
- **Thème** : Méthode

[← Index des décisions](README.md)

## Contexte

Revue du 13/11/2026 : le mot « programme » (programme de publication du PC, retiré par ADR-0036) restait dans le code
et la base ; « outils » désignait à la fois le dossier racine de l'extension et les fonctions utilitaires du serveur et
de l'interface ; `server/src/outils/` mélangeait utilitaires et commandes lancées à la main.

## Décision

Réponses de l'utilisateur (18/11/2026, #246) :

| Sujet | Décision |
|---|---|
| Routes `/api/programme/*` | **Gardées** (sinon la publication casse entre la mise à jour du serveur et celle de l'extension) |
| Colonne `programme_vu_le` | **Renommée** (migration) |
| Dossiers | `server/src/outils` et `client/src/outils` → **`utilitaires/`** ; commandes du serveur → **`server/src/commandes/`** ; dossier racine `outils/` (extension) inchangé |
| Vocabulaire | « Extension », seul nom, dans les commentaires, la documentation et le glossaire |

Points tranchés par Claude (*à relire*) :
- Nouveau nom de la colonne : **`extension_vue_le`** (champ `extensionVueLe` dans l'API et l'écran Publication Vinted).
  Migration 0024 : simple `RENAME COLUMN`, les données sont gardées.
- Noms internes : `ResultatProgramme` → `ResultatExtension` ; variables `programme` des tests → `extension`.
- `server/src/test/outils.ts` et `server/navigateur/outils.ts` (outils des tests) gardent leur nom.
- Scripts npm de l'utilisateur inchangés (`npm run reset-password -w server`…) ; seuls leurs chemins internes changent.

## Conséquences

- `docs/architecture.md` explique les noms des dossiers ; glossaire (§3) précisé.
- Les décisions passées qui citent `server/src/outils/…` ne sont pas réécrites.
