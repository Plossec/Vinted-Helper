// Couleurs d'un article : liste calquée sur celle de Vinted (rédigée de mémoire, à vérifier lors du calibrage de la
// publication automatique). 2 couleurs au plus, comme sur Vinted. Formats de colis Vinted.
export const COULEURS = [
  { code: "noir", libelle: "Noir" },
  { code: "gris", libelle: "Gris" },
  { code: "blanc", libelle: "Blanc" },
  { code: "creme", libelle: "Crème" },
  { code: "beige", libelle: "Beige" },
  { code: "abricot", libelle: "Abricot" },
  { code: "orange", libelle: "Orange" },
  { code: "corail", libelle: "Corail" },
  { code: "rouge", libelle: "Rouge" },
  { code: "bordeaux", libelle: "Bordeaux" },
  { code: "rose", libelle: "Rose" },
  { code: "violet", libelle: "Violet" },
  { code: "lila", libelle: "Lila" },
  { code: "bleu_clair", libelle: "Bleu clair" },
  { code: "bleu", libelle: "Bleu" },
  { code: "marine", libelle: "Marine" },
  { code: "turquoise", libelle: "Turquoise" },
  { code: "menthe", libelle: "Menthe" },
  { code: "vert", libelle: "Vert" },
  { code: "vert_fonce", libelle: "Vert foncé" },
  { code: "kaki", libelle: "Kaki" },
  { code: "marron", libelle: "Marron" },
  { code: "moutarde", libelle: "Moutarde" },
  { code: "jaune", libelle: "Jaune" },
  { code: "argente", libelle: "Argenté" },
  { code: "dore", libelle: "Doré" },
  { code: "multicolore", libelle: "Multicolore" },
] as const;

export type CodeCouleur = (typeof COULEURS)[number]["code"];
export const COULEURS_MAX = 2;
export const estCouleur = (valeur: unknown): valeur is CodeCouleur =>
  typeof valeur === "string" && COULEURS.some((c) => c.code === valeur);
export const libelleCouleur = (code: string) => COULEURS.find((c) => c.code === code)?.libelle ?? code;

export const FORMATS_COLIS = [
  { code: "petit", libelle: "Petit" },
  { code: "moyen", libelle: "Moyen" },
  { code: "grand", libelle: "Grand" },
] as const;

export type FormatColis = (typeof FORMATS_COLIS)[number]["code"];
export const CODES_FORMAT_COLIS = FORMATS_COLIS.map((f) => f.code) as [FormatColis, ...FormatColis[]];
export const estFormatColis = (valeur: unknown): valeur is FormatColis =>
  typeof valeur === "string" && (CODES_FORMAT_COLIS as readonly string[]).includes(valeur);
