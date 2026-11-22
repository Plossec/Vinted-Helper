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

/** Conseil issu de l'historique des ventes comparables, sans stockage ni accès à la base. */
export function conseilPrixHistorique(prixVendus: number[], prixVenteMinimum: number | null): number | null {
  if (prixVendus.length < 10) return null;
  if (prixVendus.some((prix) => !Number.isInteger(prix) || prix <= 0)) {
    throw new Error("Les prix vendus doivent être des montants entiers en centimes.");
  }
  if (prixVenteMinimum !== null && (!Number.isInteger(prixVenteMinimum) || prixVenteMinimum < 0)) {
    throw new Error("Le prix vente minimum doit être un montant entier en centimes.");
  }

  const tries = [...prixVendus].sort((a, b) => a - b);
  const milieu = tries.length / 2;
  const mediane =
    tries.length % 2 === 1
      ? (tries[Math.floor(milieu)] ?? 0)
      : Math.floor(((tries[milieu - 1] ?? 0) + (tries[milieu] ?? 0)) / 2);
  const conseille = Math.ceil(mediane / PAS) * PAS;

  return Math.max(conseille, prixVenteMinimum ?? 0);
}
