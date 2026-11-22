# ADR-0107 — Audit des dépendances : seuil bloquant et suivi hebdomadaire

- **Date** : 17/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #242
- **Thème** : Serveur

[← Index des décisions](README.md)

## Contexte

[ADR-0043](0043-ci-completee.md) rendait `npm audit --omit=dev` bloquant dans le check « Vérifier », quel que soit le
niveau de l'alerte. Le 09/11/2026, une alerte **modérée** sur une dépendance indirecte (`fast-uri`) a rendu rouge la PR
Dependabot #241 ; au 13/11/2026, cinq alertes (une faible, quatre modérées) rendaient rouge toute PR : plus rien ne
pouvait partir en production, correctif urgent compris (#239). De plus, `npm run verifier` ne lançait pas l'audit :
vert sur le PC, rouge sur GitHub.

## Décision

| Sujet | Décision |
|---|---|
| Seuil bloquant | Seules les alertes **élevées et critiques** des dépendances de production bloquent (`npm audit --omit=dev --audit-level=high`) (choix de l'utilisateur). |
| Autres alertes | Audit complet **chaque lundi** (`.github/workflows/audit.yml`) ; une alerte ouvre une issue « Alertes de sécurité des dépendances » (choix de l'utilisateur), ou complète celle qui est déjà ouverte (choix de Claude, *à relire*). |
| `npm run verifier` | L'audit en fait partie (même seuil) : vert sur le PC = vert sur GitHub. Sans réseau, **avertissement sans échec** sur le PC (choix de l'utilisateur) ; en CI, un audit impossible est un échec (choix de Claude, *à relire*). |
| Correction | Toujours par une PR, avec `npm audit fix` (jamais `--force`) ; les alertes du 13/11/2026 sont corrigées ainsi (#242). |
| Nom du check | « Vérifier (types, lint, format, tests, construction) » inchangé, pour ne pas casser la future protection de `main` (#201) (choix de Claude, *à relire*). |

## Conséquences

- Une alerte faible ou modérée ne bloque plus une mise en production ; elle est suivie par l'issue hebdomadaire.
- Risque accepté : une alerte modérée peut rester en production jusqu'à sa correction (quelques jours au plus si
  l'issue est traitée).
- ADR-0043 : la partie « audit bloquant » est modifiée par cette décision.
- `docs/regles-en-vigueur.md` (ligne « Vérification ») et `/verifier` mis à jour dans la même PR.
