// Pages Vinted Go (#262, #309) : chargé avant contenu.js, seulement sur vintedgo.com. L'extension n'y fait que lire
// (état de la page, relevé de l'onglet, relevé d'un point relais) : toute autre demande (remplissage, « Ajouter »,
// prix, offres…) y est refusée par contenu.js.
globalThis.vhReleveSeul = true;
