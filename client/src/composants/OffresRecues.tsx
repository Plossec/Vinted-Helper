// Tâche « Offres reçues » (#302, ADR-0076, ADR-0126) dans l'écran « À faire » : offres lues dans la messagerie Vinted,
// avec ce que la règle propose (accepter, contre-offre, ou rien sans prix vente minimum). Lecture seule : rien n'est
// envoyé à Vinted tant que la lecture n'est pas calibrée ; la réponse se fait à la main sur Vinted.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type OffreRecueLigne } from "../api.js";
import { formatDate } from "../utilitaires/dates.js";
import { formatEuros } from "../utilitaires/montants.js";
import { formatReference } from "../statuts.js";

/** Ce que la règle propose pour une offre (ADR-0076). */
function proposition(l: OffreRecueLigne): string {
  if (l.message) return l.message;
  return l.prixContreOffre !== null ? `contre-offre à ${formatEuros(l.prixContreOffre)}` : "accepter l'offre";
}

export function OffresRecues() {
  const [lignes, setLignes] = useState<OffreRecueLigne[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<OffreRecueLigne[]>("/api/taches/offres-recues")
      .then(setLignes)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  }, []);

  if (erreur)
    return (
      <p className="message message--erreur" role="alert">
        {erreur}
      </p>
    );
  if (lignes === null || lignes.length === 0) return null;

  return (
    <section className="a-faire__section a-faire__section--a-traiter">
      <h2>
        Offres reçues <span className="pastille">{lignes.length}</span>
      </h2>
      <p className="secondaire">
        Proposition de la règle pour chaque offre : à faire vous-même sur Vinted pour l'instant (l'envoi automatique
        viendra après le calibrage).
      </p>
      <ul className="liste">
        {lignes.map((l) => (
          <li key={l.id}>
            <Link to={`/articles/${l.articleId}`}>
              {formatReference(l.reference)} {l.nom ?? "(sans nom)"}
            </Link>
            <br />
            <span className="secondaire">
              Offre reçue {formatEuros(l.prixOffre)} le {formatDate(l.depuis)} — {proposition(l)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
