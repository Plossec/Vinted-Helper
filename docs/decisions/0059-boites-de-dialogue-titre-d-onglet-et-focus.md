# ADR-0059 — Boîtes de dialogue, titre d'onglet et focus

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #132
- **Thème** : Interface
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : tout #132.
- `window.confirm` / `window.prompt` remplacés partout par les boîtes de l'application
  (`client/src/composants/Dialogue.tsx`, élément `<dialog>` modal) : `confirmer(texte, { action, danger })` et
  `demanderMontant(texte)` (virgule ou point, clavier numérique). Échap = Annuler ; « Annuler » à gauche, action à
  droite ; pour une action destructrice (bouton rouge), le focus part sur « Annuler » (choix de Claude, *à relire*).
- Titre d'onglet = titre de l'écran (« #0012 Robe Sézane — Vinted Helper »), mis à jour quand l'écran finit de
  charger ; le titre reçoit le focus à chaque changement d'écran, sauf si un champ l'a déjà (saisie terrain).
- Focus visible global déjà en place (`:focus-visible`) ; animations réduites si le téléphone le demande.
- Textes alternatifs vérifiés : les vignettes des listes restent décoratives (`alt=""`, le nom de l'article est dans
  le lien) ; les photos de la fiche ont un texte.
