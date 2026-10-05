// États d'un article : ceux de Vinted + « Abîmé » (décision du 05/10/2026). Liste fixe, dans cet ordre.
export const ETATS = [
  { code: "neuf_avec_etiquette", libelle: "Neuf avec étiquette" },
  { code: "neuf_sans_etiquette", libelle: "Neuf sans étiquette" },
  { code: "tres_bon_etat", libelle: "Très bon état" },
  { code: "bon_etat", libelle: "Bon état" },
  { code: "satisfaisant", libelle: "Satisfaisant" },
  { code: "abime", libelle: "Abîmé" },
] as const;

export type CodeEtat = (typeof ETATS)[number]["code"];

export const CODES_ETAT = ETATS.map((e) => e.code) as [CodeEtat, ...CodeEtat[]];

export const estEtat = (valeur: unknown): valeur is CodeEtat =>
  typeof valeur === "string" && (CODES_ETAT as readonly string[]).includes(valeur);
