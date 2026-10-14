// Alertes (§5.8), affichées sur l'écran d'accueil : à expédier, à récupérer, publications Vinted en erreur (#72),
// brouillons trop anciens, articles dormants. Une rangée de puces ; la puce touchée déplie sa liste (#100).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { chargerAlertes } from "../outils/alertesCache.js";
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
  /** Retours à aller chercher (issue #52). */
  aRecuperer?: Alerte[];
  /** Publications Vinted en échec (issue #72). */
  erreursPublication?: Alerte[];
}

export const nombreAlertes = (a: AlertesServeur | null) =>
  a
    ? a.brouillons.length +
      a.dormants.length +
      a.aExpedier.length +
      (a.aRecuperer?.length ?? 0) +
      (a.erreursPublication?.length ?? 0)
    : 0;

const GROUPES = [
  {
    cle: "aExpedier",
    titre: "À expédier",
    court: "À expédier",
    detail: (a: Alerte) => `vendu le ${formatDate(a.depuis)}`,
  },
  {
    cle: "aRecuperer",
    titre: "À récupérer",
    court: "À récupérer",
    detail: (a: Alerte) => `retour du ${formatDate(a.depuis)}`,
  },
  {
    cle: "erreursPublication",
    titre: "Publications Vinted en erreur",
    court: "Erreurs Vinted",
    detail: (a: Alerte) => `échec le ${formatDate(a.depuis)}`,
  },
  {
    cle: "brouillons",
    titre: "Brouillons à compléter",
    court: "Brouillons",
    detail: (a: Alerte) => `brouillon depuis ${a.jours} jour${a.jours > 1 ? "s" : ""}`,
  },
  {
    cle: "dormants",
    titre: "Articles dormants",
    court: "Dormants",
    detail: (a: Alerte) => `sans vente ni baisse de prix depuis ${a.jours} jours`,
  },
] as const;

export function Alertes() {
  const [alertes, setAlertes] = useState<AlertesServeur | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    chargerAlertes()
      .then(setAlertes)
      .catch(() => undefined);
  }, []);

  if (nombreAlertes(alertes) === 0 || alertes === null) return null;
  const groupes = GROUPES.filter((g) => (alertes[g.cle] ?? []).length > 0);
  const deplie = groupes.find((g) => g.cle === ouvert);
  return (
    <section className="alertes" aria-label="Alertes">
      <div className="alertes__puces">
        {groupes.map((g) => (
          <button
            key={g.cle}
            type="button"
            className={`alerte-puce alerte--${g.cle}`}
            aria-expanded={ouvert === g.cle}
            aria-controls="alertes-detail"
            title={g.titre}
            onClick={() => setOuvert((o) => (o === g.cle ? null : g.cle))}
          >
            <span className="pastille">{(alertes[g.cle] ?? []).length}</span>
            {g.court}
          </button>
        ))}
      </div>
      {deplie && (
        <div id="alertes-detail" className={`alerte alerte--${deplie.cle}`}>
          <h2 className="alerte__titre">{deplie.titre}</h2>
          <ul>
            {(alertes[deplie.cle] ?? []).map((a) => (
              <li key={a.id}>
                <Link to={`/articles/${a.id}`}>
                  {formatReference(a.reference)} {a.nom ?? "(sans nom)"}
                </Link>{" "}
                <span className="secondaire">— {deplie.detail(a)}</span>
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
        </div>
      )}
    </section>
  );
}
