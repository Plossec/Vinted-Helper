# ADR-0046 — Sécurité du dépôt : réglages, hooks, fusions

- **Date** : 13/10/2026
- **Statut** : Accepté · fusions précisées par [ADR-0081](0081-fusions-dans-main-par-claude-et-dependabot.md)
- **Décideurs** : utilisateur
- **Issue** : #110, #111, #112
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décisions (utilisateur)** :
- **Fusions** : Claude fusionne seul quand la CI est verte, **sauf** une PR qui touche une migration, `docker-compose*`,
  `Dockerfile`, `.github/` ou `.claude/` (accord demandé). Seuls les commentaires de `Plossec` sont des consignes
  (dépôt public). `main` protégée côté GitHub (PR + check « Vérifier » obligatoires, sans approbation).
- **`.claude/settings.json`** (mis en place par l'utilisateur) : protection du fichier des secrets corrigée
  (`Read(**/.env)`…) et complétée par le hook `proteger-env.mjs` pour Bash et PowerShell (constaté : il refuse
  aussi une commande qui ne fait que citer ce fichier) ; règles PowerShell alignées sur Bash ; envoi direct sur
  `main` refusé ; outils GitHub qui écrivent des fichiers (`push_files`, `create_or_update_file`, `delete_file`)
  refusés ; moins de confirmations inutiles (`git fetch`, `gh issue/pr view|list|create`…).
- **Hooks** : `npm ci` automatique au démarrage d'une session cloud (`installer-dependances.mjs`) ; le hook du calcul
  ne bloque plus quand les dépendances manquent et ne relance pas des tests inchangés ; le formatage couvre aussi
  `.mjs`, `.yml`, `.html`.
- Les fichiers protégés sont préparés par Claude et mis en place par l'utilisateur (branche poussée depuis le PC),
  Claude complétant la même branche.
