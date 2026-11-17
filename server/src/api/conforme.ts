// Contrôle, à la compilation, qu'une réponse de l'API respecte le type attendu par l'interface (#244).
// Les dates (`Date`) partent en JSON sous forme de texte ISO : là où le contrat attend un texte, une `Date` est admise.
// Usage : `conforme<Article>()(await lireArticleBrut(…))`. Rien n'est fait à l'exécution.

/** Ce que le serveur peut fournir pour un champ du contrat avant l'envoi en JSON (texte ISO ← Date). */
export type AvantJson<T> = T extends string
  ? T | Date
  : T extends readonly (infer U)[]
    ? readonly AvantJson<U>[]
    : T extends object
      ? { [K in keyof T]: AvantJson<T[K]> }
      : T;

/**
 * Renvoie la valeur telle quelle ; erreur de compilation, qui nomme le champ en cause, si elle ne correspond pas au
 * contrat. Des champs en plus sont admis (l'interface les ignore) ; un champ manquant, renommé ou d'un autre type ne
 * l'est pas.
 */
export const conforme =
  <Contrat>() =>
  <V extends AvantJson<Contrat>>(valeur: V): V =>
    valeur;
