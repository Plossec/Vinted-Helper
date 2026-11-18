// Mise en forme d'un montant pour un champ de saisie (#133) : 1250 → « 12,50 » (prix tapé par l'extension sur Vinted).
// Conversion d'affichage seulement : aucun calcul d'argent (règle n° 1).
export function centimesVersSaisie(centimes: number): string {
  return `${Math.floor(centimes / 100)},${String(centimes % 100).padStart(2, "0")}`;
}
