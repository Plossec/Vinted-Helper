// Prix affiché proposé par l'IA pour un article créé à partir de photos (#276). Fonction pure : la réponse de l'IA
// (nombre ou texte en euros) est lue chiffre par chiffre, sans calcul à virgule, puis arrondie vers le haut au
// 0,50 € (même pas que les baisses des articles dormants). Montant en centimes entiers.

const PAS = 50;
/** Au-delà, la proposition est jugée absurde (100 000 €, comme le garde-fou des saisies). */
const MAXIMUM = 10_000_000;

/** Centimes d'un texte « 12 », « 12,5 », « 9.90 € » ; null s'il n'est pas lisible. */
function centimesDe(texte: string): number | null {
  const m = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(texte.replace(/€/g, "").replace(/\s/g, ""));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/** Prix proposé en centimes (arrondi au 0,50 € au-dessus), ou null : absent, illisible, nul ou absurde. */
export function prixPropose(valeur: unknown): number | null {
  const texte = typeof valeur === "number" && Number.isFinite(valeur) ? valeur.toFixed(2) : valeur;
  if (typeof texte !== "string") return null;
  const centimes = centimesDe(texte.trim());
  if (centimes === null || centimes <= 0 || centimes > MAXIMUM) return null;
  return Math.ceil(centimes / PAS) * PAS;
}
