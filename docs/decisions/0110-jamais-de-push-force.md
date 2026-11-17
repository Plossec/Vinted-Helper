# ADR-0110 — Jamais de push forcé

- **Date** : 17/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #266
- **Thème** : Méthode

[← Index des décisions](README.md)

## Contexte

Le 17/11/2026, Claude a tenté un `git push -f` sur sa branche de travail, alors qu'un push normal suffisait (avance
rapide). La commande a été bloquée par `.claude/settings.json` et n'a rien changé au dépôt. L'interdiction existait
techniquement (et `CLAUDE.md` interdit de réécrire l'historique), mais la conduite à tenir n'était pas écrite.

Demande de l'utilisateur : « Désormais : jamais de -f. Si un push est refusé, je fais un git fetch puis une fusion, et
je vous préviens. Écris ça dans les règles et garde fou etc ».

## Décision

- **Jamais de push forcé** (`-f`, `--force`, `--force-with-lease`), sur aucune branche, y compris une branche de
  travail de Claude.
- **Push refusé** : `git fetch` de la branche distante, **fusion** dans la branche locale (jamais de rebase ni de
  réécriture de l'historique), nouveau push normal, puis **prévenir l'utilisateur** de ce qui s'est passé.
- Garde-fou technique inchangé : `.claude/settings.json` refuse déjà `git push --force` et `git push -f`.

## Conséquences

- Règle écrite dans `CLAUDE.md` (Garde-fous, Git), dans la procédure `/lot` (étape Livrer) et dans
  `docs/regles-en-vigueur.md`.
