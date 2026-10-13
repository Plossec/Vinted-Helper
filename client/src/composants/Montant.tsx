// Montant affiché partout de la même façon (#105) : format français, vrai signe moins, négatif en rouge.
import { formatEuros } from "../outils/montants.js";

export function Montant({ centimes, signe = false }: { centimes: number; signe?: boolean }) {
  return <span className={centimes < 0 ? "negatif" : undefined}>{formatEuros(centimes, { signe })}</span>;
}
