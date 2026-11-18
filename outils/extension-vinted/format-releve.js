// Texte du fichier de relevé téléchargé (#253) : indenté, mais un élément de page par ligne (les relevés comptent des
// centaines d'éléments). Le contenu est inchangé : `JSON.parse` redonne exactement le relevé.
/* exported texteDuReleve */

/** Élément de page décrit par `decrire` (contenu.js), sans liste d'éléments à l'intérieur. */
const estElement = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && "balise" in v && !("elements" in v);

/**
 * @param {unknown} valeur
 * @param {string} [retrait]
 * @returns {string}
 */
function texteDuReleve(valeur, retrait = "") {
  const suivant = `${retrait}  `;
  if (Array.isArray(valeur)) {
    if (valeur.length === 0) return "[]";
    const lignes = valeur.map((v) => suivant + (estElement(v) ? JSON.stringify(v) : texteDuReleve(v, suivant)));
    return `[\n${lignes.join(",\n")}\n${retrait}]`;
  }
  if (valeur !== null && typeof valeur === "object") {
    const lignes = Object.entries(valeur).map(
      ([cle, v]) => `${suivant}${JSON.stringify(cle)}: ${texteDuReleve(v, suivant)}`,
    );
    return lignes.length === 0 ? "{}" : `{\n${lignes.join(",\n")}\n${retrait}}`;
  }
  return JSON.stringify(valeur) ?? "null";
}
