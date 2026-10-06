// Compteur « N éléments en attente d'envoi » (§2.2) et éléments refusés par le serveur.
import { Link } from "react-router";
import { abandonner, envoyerMaintenant, reessayer, useFile } from "../hors-ligne/index.js";

const LIBELLES = { sortie: "Sortie", essence: "Essence", photo: "Photo", achat: "Achat" } as const;

export function BandeauFile() {
  const { elements, bilan, envoiEnCours } = useFile();
  if (elements.length === 0) return null;
  const enAttente = elements.filter((e) => e.erreur === null);
  const refuses = elements.filter((e) => e.erreur !== null);

  return (
    <div className="bandeau" role="status">
      {enAttente.length > 0 && (
        <p>
          <strong>
            {enAttente.length} élément{enAttente.length > 1 ? "s" : ""} en attente d'envoi
          </strong>
          {envoiEnCours
            ? " — envoi…"
            : bilan === "connexion"
              ? " — session expirée : "
              : bilan === "reseau"
                ? " — pas de réseau, nouvel essai automatique."
                : ""}
          {bilan === "connexion" && !envoiEnCours && <Link to="/connexion">reconnectez-vous</Link>}
          {bilan === "reseau" && !envoiEnCours && (
            <button className="lien" type="button" onClick={() => void envoyerMaintenant()}>
              Réessayer
            </button>
          )}
        </p>
      )}
      {refuses.map((e) => (
        <p key={e.cle} className="bandeau__erreur">
          {LIBELLES[e.operation.type]} refusé(e) : {e.erreur}{" "}
          <button className="lien" type="button" onClick={() => void reessayer(e)}>
            Réessayer
          </button>{" "}
          <button
            className="lien"
            type="button"
            onClick={() => {
              if (window.confirm("Abandonner cet élément ? Il sera perdu.")) void abandonner(e);
            }}
          >
            Abandonner
          </button>
        </p>
      ))}
    </div>
  );
}
