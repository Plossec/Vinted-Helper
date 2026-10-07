// Alertes (§5.8), affichées sur l'écran d'accueil : à expédier, brouillons trop anciens, articles dormants.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";
import { formatDate } from "../outils/dates.js";
import { formatReference } from "../statuts.js";

interface Alerte {
  id: string;
  reference: number;
  nom: string | null;
  depuis: string;
  jours: number;
  /** Articles à expédier : lien de la conversation Vinted avec l'acheteur (issue #48). */
  urlConversation?: string | null;
}

export interface AlertesServeur {
  brouillons: Alerte[];
  dormants: Alerte[];
  aExpedier: Alerte[];
}

export const nombreAlertes = (a: AlertesServeur | null) =>
  a ? a.brouillons.length + a.dormants.length + a.aExpedier.length : 0;

const GROUPES = [
  { cle: "aExpedier", titre: "À expédier", detail: (a: Alerte) => `vendu le ${formatDate(a.depuis)}` },
  {
    cle: "brouillons",
    titre: "Brouillons à compléter",
    detail: (a: Alerte) => `brouillon depuis ${a.jours} jour${a.jours > 1 ? "s" : ""}`,
  },
  {
    cle: "dormants",
    titre: "Articles dormants",
    detail: (a: Alerte) => `sans vente ni baisse de prix depuis ${a.jours} jours`,
  },
] as const;

export function Alertes() {
  const [alertes, setAlertes] = useState<AlertesServeur | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AlertesServeur>("/api/alertes")
      .then(setAlertes)
      .catch(() => undefined);
  }, []);

  if (nombreAlertes(alertes) === 0 || alertes === null) return null;
  return (
    <section className="alertes" aria-label="Alertes">
      {GROUPES.filter((g) => alertes[g.cle].length > 0).map((g) => (
        <div key={g.cle} className={`alerte alerte--${g.cle}`}>
          <button
            type="button"
            className="alerte__titre"
            aria-expanded={ouvert === g.cle}
            onClick={() => setOuvert((o) => (o === g.cle ? null : g.cle))}
          >
            <span className="pastille">{alertes[g.cle].length}</span> {g.titre}
            <span aria-hidden="true">{ouvert === g.cle ? "▴" : "▾"}</span>
          </button>
          {ouvert === g.cle && (
            <ul>
              {alertes[g.cle].map((a) => (
                <li key={a.id}>
                  <Link to={`/articles/${a.id}`}>
                    {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
                  </Link>{" "}
                  <span className="secondaire">— {g.detail(a)}</span>
                  {a.urlConversation && (
                    <>
                      {" "}
                      <a
                        href={a.urlConversation}
                        target="_blank"
                        rel="noreferrer"
                        className="lien-conversation"
                        aria-label={`Conversation Vinted de ${formatReference(a.reference)}`}
                        title="Ouvrir la conversation Vinted"
                      >
                        💬
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
