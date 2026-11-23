// Pages Vinted Go (#262, #309) : chargé avant contenu.js, seulement sur vintedgo.com. L'extension n'y fait que le
// relevé de l'onglet : toute autre demande (remplissage, « Ajouter », prix, offres…) y est refusée par contenu.js.
globalThis.vhReleveSeul = true;
