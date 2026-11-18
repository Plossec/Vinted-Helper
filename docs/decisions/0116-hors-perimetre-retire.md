# ADR-0116 — « Hors périmètre » (§10) retiré du cahier des charges

- **Date** : 18/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #277 (cadrage de #276)
- **Thème** : Méthode

[← Index des décisions](README.md)

## Contexte

Le §10 du cahier des charges excluait l'import et l'export de données, le mode d'envoi, le pseudo acheteur, l'alerte
DAC7, la suggestion de prix, les notifications sur le téléphone, l'inscription et le « mot de passe oublié », les
croquis d'écrans ; la règle n° 4 de `CLAUDE.md` interdisait d'y toucher sans demande. Lors du cadrage de #276
(création d'articles à partir de photos, prix proposé par l'IA), l'utilisateur a demandé : « Supprime le 10 »,
confirmé par « Tout le §10 ».

## Décision

| Sujet | Décision |
|---|---|
| §10 | **Retiré** : plus aucune exclusion de principe. Le titre reste (« retiré ») pour garder la numérotation (annexe §11). |
| Règle n° 4 de `CLAUDE.md` | **Retirée**, ainsi que les renvois au §10 dans `/lot` et l'agent `relecteur`. |
| Nouvelles idées | Inchangé : chacune est une issue, décidée avec l'utilisateur avant tout développement (méthode de `CLAUDE.md`). |
| Import du tableur | Réalisé une fois ([ADR-0023](0023-import-du-tableur-compte-2026-vinted.md)) ; « aucun autre import » ne tient plus. |

## Conséquences

- Les décisions qui citaient le §10 (ADR-0078, ADR-0079, ADR-0109) restent telles quelles (historique).
- Rien n'est développé du fait de ce retrait.
