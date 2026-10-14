# ADR-0045 — Une version par PR, tag automatique

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #114
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : « Est-il possible que tu fasses le versionnage à chaque fois ? » → chaque PR qui part
en production porte sa version (procédure `/version`, appliquée par `/lot` et `/calibrer-vinted`) ; plus de PR
« Version X.Y.Z » séparée. Règle 1.x : un « Ajouté » → chiffre du milieu ; seulement « Corrigé » / « Modifié » →
dernier chiffre ; rupture → premier chiffre avec l'accord de l'utilisateur. La session ne pouvant pas pousser de tags,
le job « Créer le tag de version » de `.github/workflows/deploiement.yml` crée `vX.Y.Z` après une mise en production
réussie (droit `contents: write` limité à ce job ; pas de tag si le déploiement échoue ou est annulé).
