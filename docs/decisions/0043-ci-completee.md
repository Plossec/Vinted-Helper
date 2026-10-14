# ADR-0043 — CI complétée

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #124
- **Thème** : Serveur

[← Index des décisions](README.md)

## Décision

| Sujet | Décision |
|---|---|
| Audit | `npm audit --omit=dev` dans le check « Vérifier » (bloquant) : seules les dépendances embarquées en production comptent ; les 4 alertes modérées de `drizzle-kit` (outil de développement) ne bloquent pas. Jamais `npm audit fix --force`. |
| Image Docker | Job « Construire l'image Docker » sur chaque pull request (pas sur `main` : le serveur construit lui-même l'image et revient en arrière si besoin, #119). |
| Extension | Workflow `extension.yml` : tests de l'extension sur la fausse page Vinted, seulement quand `outils/extension-vinted/` change, avec le Chromium de Playwright (Chrome du commerce n'accepte plus `--load-extension`). |
| CodeQL | Analyse de sécurité GitHub (gratuite, dépôt public) à chaque PR, à chaque fusion et chaque lundi ; alertes dans l'onglet « Security ». |
| Dependabot | Une PR par semaine et par écosystème npm (mineures et correctives regroupées), actions et images Docker chaque mois ; rien n'est fusionné automatiquement. |
| Non fait | Images Docker et actions épinglées à une version exacte : Dependabot suffit pour être prévenu, sans risque de casser la mise en production par une étiquette inexistante. Secret scanning : réglage GitHub à activer par l'utilisateur. |
