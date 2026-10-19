# ADR-0098 — Cahier des charges tenu à jour, règles en vigueur par thème

- **Date** : 19/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (choix du 19/10/2026 et plan validé)
- **Issue** : #217
- **Thème** : Méthode

[← Index des décisions](README.md)

## Contexte

Le croisement de tous les `.md` du 19/10/2026 (#217) a montré que le cahier des charges, qui fait foi, n'avait pas
suivi une quinzaine d'ADR (statut « en attente de validation », import, OVH et HTTPS « à faire », règle n° 4,
§12 périmé…), et qu'une douzaine d'ADR modifiés ne le signalaient pas. Pour connaître la règle en vigueur, il
fallait relire toute la chaîne des décisions d'un sujet : source d'erreurs et de lecture inutile pour Claude.
Choix de l'utilisateur : « Le remettre à jour » (le cahier reste la référence).

## Décision

| Sujet | Décision |
|---|---|
| Cahier des charges | **Remis à jour** et toujours la référence : statut, §2.4, glossaire, §5 (catégories, lieux, fiche, liste, À faire, tableau de bord, sauvegarde, nouvelles sections §5.14 Publication sur Vinted et §5.15 Tâches automatisées), §7, §8, §9 (historique), §10 ; §12 remplacé par un tableau de renvois (`CLAUDE.md`, `.claude/`, ADR). |
| Tenue à jour | Une décision qui modifie le cahier des charges ou une règle en vigueur met à jour, **dans la même PR**, le cahier et `docs/regles-en-vigueur.md`. |
| Règles en vigueur | Nouveau fichier `docs/regles-en-vigueur.md` : une ligne par sujet, ADR de référence, état décidé ou réalisé (avec l'issue). |
| ADR modifiés | Statut « modifié / remplacé par » ajouté aux ADR 0002, 0003, 0019, 0028, 0034, 0037, 0039, 0043, 0055, 0056, 0079 et 0086 (contenu inchangé). |
| Index des ADR | Colonne « À relire », vide partout, retirée : la mention « à relire » passe en fin de statut. |
| CHANGELOG | Versions 0.0.1 à 1.5.0 déplacées dans `CHANGELOG-archive.md` (le `CHANGELOG.md` ne garde que les versions récentes). |

## Conséquences

- Documentation seulement ; aucun changement de l'application.
- Restent à trancher par l'utilisateur, signalés dans la PR : ADR 0007, 0034, 0035, 0070 et 0071, choix de Claude
  jamais relus ; §10 « Pas de mode d'envoi » face à ADR-0077 (bordereau, transporteur, suivi).
- Les consignes de Claude (`CLAUDE.md`, skills) sont revues dans une seconde PR de #217.
