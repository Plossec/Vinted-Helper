// Erreurs « métier » : message en français destiné à l'utilisateur + code HTTP.
export class ErreurMetier extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message);
    this.name = "ErreurMetier";
  }
}

export const erreurSaisie = (message: string) => new ErreurMetier(400, message);
export const nonConnecte = () => new ErreurMetier(401, "Vous n'êtes pas connecté.");
export const introuvable = (quoi: string) => new ErreurMetier(404, `${quoi} introuvable.`);
export const conflit = (message: string) => new ErreurMetier(409, message);
