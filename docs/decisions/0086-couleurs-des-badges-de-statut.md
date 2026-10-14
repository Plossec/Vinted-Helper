# ADR-0086 — Couleurs des badges de statut

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : Interface

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q12) : [ADR-0053](0053-refonte-de-l-interface-design-tokens-techno.md) listait 7 couleurs ; [ADR-0057](0057-statuts-distincts-montants-homogenes-benefice-attendu.md) et [ADR-0067](0067-statut-en-stock.md) en ont ajouté.

## Décision

Dix statuts, dix apparences (`client/src/styles.css`, texte `--fond` sur le fond du badge) :

| Statut | Clair | Sombre |
|---|---|---|
| Brouillon | `#5F6485` | `#A0A6CC` |
| À publier | `#8A5A00` | `#E3B341` |
| En ligne | `#4338CA` | `#9AA2FF` |
| À expédier | `#8E2FA8` | `#D58BFF` |
| Envoyé | `#0E7490` | `#67E8F9` |
| Finalisé | `#12794A` | `#5BD79B` |
| À récupérer | `#B04A00` | `#FFA657` |
| Erreur | `#C11A33` | `#FF8D9C` |
| Sortie du stock | contour plein `--bordure-champ`, texte `--texte-secondaire` | idem |
| En stock | contour pointillé `--bordure-champ`, texte `--texte-secondaire` | idem |
