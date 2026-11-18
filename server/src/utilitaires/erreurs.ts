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
/** Statut changé par une autre requête entre la lecture et l'écriture (double tape, nouvel envoi) : issue #120. */
export const conflitStatutChange = () =>
  conflit(
    "Cet article vient de changer de statut (action déjà faite ?) : rechargez l'écran pour voir son état actuel.",
  );
