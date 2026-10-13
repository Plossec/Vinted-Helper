// Écran affiché quand un écran plante pendant son affichage (issue #126) : plutôt qu'une page blanche, un message
// et de quoi repartir. Les achats terrain en attente restent enregistrés sur le téléphone (IndexedDB).
import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErreurAffichage() {
  const erreur = useRouteError();
  if (isRouteErrorResponse(erreur) && erreur.status === 404) {
    return (
      <main className="page">
        <h1>Page introuvable</h1>
        <p>Cette adresse ne correspond à aucun écran de l'application.</p>
        <a className="lien" href="/">
          Revenir à l'accueil
        </a>
      </main>
    );
  }
  const detail = isRouteErrorResponse(erreur)
    ? `${erreur.status} ${erreur.statusText}`
    : erreur instanceof Error
      ? erreur.message
      : String(erreur);
  return (
    <main className="page">
      <h1>Un problème est survenu</h1>
      <p className="message message--erreur" role="alert">
        Cet écran n'a pas pu s'afficher.
      </p>
      <p>
        Vos achats en attente d'envoi sont gardés sur le téléphone : rien n'est perdu. Rechargez l'application ; si le
        problème revient, revenez à l'accueil.
      </p>
      <button className="bouton bouton--principal" type="button" onClick={() => window.location.reload()}>
        Recharger
      </button>
      <a className="lien" href="/">
        Revenir à l'accueil
      </a>
      <details>
        <summary>Détail technique</summary>
        <p>{detail}</p>
      </details>
    </main>
  );
}
