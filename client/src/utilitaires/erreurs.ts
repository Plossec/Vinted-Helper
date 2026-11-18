// Message d'erreur d'une réponse de l'API (#133) : champ « erreur » du corps JSON, sinon « Erreur 500 ».
export function messageErreur(contenu: unknown, statut: number): string {
  return typeof contenu === "object" && contenu !== null && "erreur" in contenu && typeof contenu.erreur === "string"
    ? contenu.erreur
    : `Erreur ${statut}`;
}
