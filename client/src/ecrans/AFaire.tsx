// Écran d'accueil « À faire » (#191) : tout ce qui demande l'attention, par urgence (Urgent, À traiter, Pour info).
// Chaque ligne mène à la fiche de l'article et porte son action directe : Republier, Envoyé, Récupéré, Compléter,
// Remettre en ligne (invendu), Vu.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";
import { ActionsAValider } from "../composants/ActionsTaches.js";
import { CommandesVinted } from "../composants/CommandesVinted.js";
import {
  type AlertesServeur,
  type LigneAFaire,
  nombreCommandes,
  type SectionAFaire,
  sectionsAFaire,
} from "../outils/alertes.js";
import { chargerAlertes } from "../outils/alertesCache.js";
import { formatDate } from "../outils/dates.js";
import { demanderPublication } from "../publication.js";
import { formatReference } from "../statuts.js";

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Nature et ancienneté de la ligne, sous le nom de l'article. */
function detail(l: LigneAFaire): string {
  switch (l.type) {
    case "erreursPublication":
      return `Publication Vinted en erreur le ${formatDate(l.depuis)}`;
    case "aExpedier":
      return `À expédier — vendu le ${formatDate(l.depuis)}`;
    case "aRecuperer":
      return `À récupérer — retour du ${formatDate(l.depuis)}`;
    case "incomplets":
      return `À publier mais incomplet — il manque : ${(l.manques ?? []).join(", ")}`;
    case "invendus":
      return `Invendu depuis le ${formatDate(l.depuis)} — republié 3 fois sans vente, l'annonce reste en ligne`;
    case "dormants":
      return `Dormant — sans vente ni baisse de prix depuis ${pluriel(l.jours, "jour")}`;
    case "brouillons":
      return `Brouillon à compléter depuis ${pluriel(l.jours, "jour")}`;
  }
}

export function AFaire() {
  const [alertes, setAlertes] = useState<AlertesServeur | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(
    () =>
      chargerAlertes()
        .then((a) => {
          setAlertes(a);
          setErreur(null);
        })
        .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible.")),
    [],
  );
  useEffect(() => {
    void charger();
  }, [charger]);

  /** Action directe : une seule à la fois ; la liste est rechargée ensuite (le cache est vidé par l'appel). */
  async function agir(cle: string, action: () => Promise<{ ok: boolean; texte: string } | null>) {
    setEnCours(cle);
    setRetour(null);
    try {
      setRetour(await action());
    } catch (e) {
      setRetour({ ok: false, texte: e instanceof Error ? e.message : "Action impossible." });
    } finally {
      setEnCours(null);
      await charger();
    }
  }

  function actions(l: LigneAFaire) {
    const cle = `${l.type}:${l.id}`;
    const occupe = enCours !== null;
    // Nom accessible complet (#215) : le même bouton se répète sur chaque ligne.
    const bouton = (libelle: string, action: () => Promise<{ ok: boolean; texte: string } | null>) => (
      <button
        type="button"
        className="bouton"
        disabled={occupe}
        aria-label={`${libelle.replace(" → ", " : ")} (${formatReference(l.reference)})`}
        onClick={() => void agir(cle, action)}
      >
        {enCours === cle ? "…" : libelle}
      </button>
    );
    switch (l.type) {
      case "erreursPublication":
        return bouton("Republier", () => demanderPublication([l.id]));
      case "aExpedier":
        return (
          <>
            {l.venteId &&
              bouton("Envoyé", async () => {
                await api.post(`/api/ventes/${l.venteId}/envoi`, {});
                return { ok: true, texte: `${formatReference(l.reference)} marqué « Envoyé ».` };
              })}
            {l.urlConversation && (
              <a
                href={l.urlConversation}
                target="_blank"
                rel="noreferrer"
                className="bouton"
                aria-label={`Conversation Vinted de ${formatReference(l.reference)}`}
                title="Ouvrir la conversation Vinted"
              >
                💬
              </a>
            )}
          </>
        );
      case "aRecuperer":
        return bouton("Récupéré → À publier", async () => {
          await api.post(`/api/articles/${l.id}/statut`, { vers: "a_publier" });
          return { ok: true, texte: `${formatReference(l.reference)} repassé « À publier ».` };
        });
      case "invendus":
        return bouton("Remettre en ligne", async () => {
          await api.post(`/api/articles/${l.id}/statut`, { vers: "en_ligne" });
          return { ok: true, texte: `${formatReference(l.reference)} remis « En ligne » : la tâche reprend.` };
        });
      case "incomplets":
        return (
          <Link to={`/articles/${l.id}`} className="bouton">
            Compléter
          </Link>
        );
      case "dormants":
      case "brouillons":
        return bouton("Vu", async () => {
          await api.post("/api/alertes/vu", { type: l.type, articleId: l.id, depuis: l.depuis });
          return null;
        });
    }
  }

  const sections: SectionAFaire[] = alertes ? sectionsAFaire(alertes) : [];
  return (
    <main className="page">
      <h1>À faire</h1>
      {retour && (
        <p
          className={retour.ok ? "message message--ok" : "message message--erreur"}
          role={retour.ok ? "status" : "alert"}
        >
          {retour.texte}
        </p>
      )}
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      {alertes === null && !erreur && <p className="statut">Chargement…</p>}
      {/* Tâches automatisées en mode manuel (#147) : actions prévues, à valider avant que l'extension les fasse. */}
      {alertes !== null && (alertes.aValider ?? 0) > 0 && <ActionsAValider onChangement={() => void charger()} />}
      {/* Tâche « Vérification vente finalisée » (#148) : commandes lues sur Vinted. */}
      {alertes !== null && nombreCommandes(alertes) > 0 && <CommandesVinted onChangement={() => void charger()} />}
      {alertes !== null && sections.length === 0 && (alertes.aValider ?? 0) === 0 && nombreCommandes(alertes) === 0 && (
        <p className="a-faire__vide">Rien à faire 🎉</p>
      )}
      {sections.map((s) => (
        <section
          key={s.titre}
          className={`a-faire__section a-faire__section--${s.titre === "Urgent" ? "urgent" : s.titre === "À traiter" ? "a-traiter" : "info"}`}
        >
          <h2>
            {s.titre} <span className="pastille">{s.lignes.length}</span>
          </h2>
          <ul className="a-faire__liste">
            {s.lignes.map((l) => (
              <li key={`${l.type}:${l.id}`} className={`a-faire__ligne alerte--${l.type}`}>
                <div className="a-faire__texte">
                  <Link to={`/articles/${l.id}`}>
                    {formatReference(l.reference)} {l.nom ?? "(sans nom)"}
                  </Link>
                  <span className="secondaire">{detail(l)}</span>
                </div>
                <div className="a-faire__actions">{actions(l)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
