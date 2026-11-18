// Montants : centimes (entiers) côté données, euros au format français uniquement à l'affichage et à la saisie.

const FORMAT_EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const FORMAT_EUROS_SIGNE = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  signDisplay: "exceptZero",
});

/**
 * 333 → « 3,33 € » ; −808 → « −8,08 € » (vrai signe moins partout, #105). `signe` : « +6,92 € » pour un écart ou un
 * bénéfice attendu.
 */
export function formatEuros(centimes: number, { signe = false }: { signe?: boolean } = {}): string {
  return (signe ? FORMAT_EUROS_SIGNE : FORMAT_EUROS).format(centimes / 100).replace("-", "\u2212");
}

/** 350 → « 3,50 » (valeur d'un champ de saisie). */
export function centimesVersSaisie(centimes: number | null): string {
  if (centimes === null) return "";
  return `${Math.floor(centimes / 100)},${String(centimes % 100).padStart(2, "0")}`;
}

/**
 * Lit un montant saisi (« 3,5 », « 3.50 », « 3 € », « 1 200,00 ») et le convertit en centimes,
 * sans calcul à virgule (on découpe la chaîne). Champ vide → null ; saisie incorrecte → "invalide".
 */
export function lireMontant(saisie: string): number | null | "invalide" {
  const texte = saisie.replace(/[\s\u00a0\u202f\u20ac]/g, "");
  if (texte === "") return null;
  const correspondance = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(texte);
  if (!correspondance) return "invalide";
  const euros = Number(correspondance[1]);
  const centimes = Number((correspondance[2] ?? "").padEnd(2, "0"));
  return euros * 100 + centimes;
}
