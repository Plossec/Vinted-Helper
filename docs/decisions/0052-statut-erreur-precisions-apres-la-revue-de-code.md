# ADR-0052 — Statut « Erreur » : précisions après la revue de code

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #92, #93, #94
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

- Une demande en **mode essai** depuis Erreur ne change pas le statut (cohérent avec [ADR-0037](0037-statut-erreur-de-publication.md) : un
  essai ne change rien) ; une vraie demande repasse l'article À publier dans la même transaction que son ajout à la
  file.
- Coller le lien de l'annonce sur un article en Erreur (publiée à la main) le fait passer En ligne, comme pour un
  article À publier.
- Le message affiché sur la fiche est celui de la dernière **vraie** publication en échec.
