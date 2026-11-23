// Contre-offre à une offre reçue (#302, ADR-0076) : à mi-chemin entre l'offre et le prix affiché, arrondie vers le haut
// au 0,50 €, jamais sous le prix vente minimum ni au-dessus du prix affiché. Montants en centimes.

export function contreOffreMiChemin(prixOffre: number, prixAffiche: number, minimum: number): number {
  const milieu = Math.ceil((prixOffre + prixAffiche) / 2 / 50) * 50;
  return Math.min(Math.max(milieu, minimum), prixAffiche);
}
