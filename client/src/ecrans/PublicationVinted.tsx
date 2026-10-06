// Publication Vinted (décision du 06/10/2026) : mode essai, état du programme du PC, file de publication, jeton.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type EtatPublication, type Publication } from "../api.js";
import { formatDateHeure } from "../outils/dates.js";
import { ecrireModeEssai, lireModeEssai } from "../publication.js";
import { formatReference } from "../statuts.js";

const LIBELLES: Record<EtatPublication, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  publie: "Publié",
  essai: "Essai réussi",
  erreur: "Erreur",
  annule: "Annulé",
};

interface Suivi {
  publications: Publication[];
  programmeVuLe: string | null;
  jetonCree: boolean;
}

/** Le programme interroge l'application toutes les 5 minutes et attend 10 minutes entre deux publications :
 * au-delà de 16 minutes sans contact, il est considéré arrêté. */
const programmeActif = (vuLe: string | null) => vuLe !== null && Date.now() - new Date(vuLe).getTime() < 16 * 60_000;

export function PublicationVinted() {
  const [suivi, setSuivi] = useState<Suivi | null>(null);
  const [essai, setEssai] = useState(lireModeEssai);
  const [jeton, setJeton] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(
    () =>
      api
        .get<Suivi>("/api/publications")
        .then(setSuivi)
        .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible.")),
    [],
  );

  useEffect(() => {
    void charger();
    const minuterie = window.setInterval(() => void charger(), 5000);
    return () => window.clearInterval(minuterie);
  }, [charger]);

  async function creerJeton() {
    if (suivi?.jetonCree && !window.confirm("Remplacer le jeton actuel ? Le programme devra être reconfiguré.")) return;
    setJeton((await api.post<{ jeton: string }>("/api/publication/jeton")).jeton);
    void charger();
  }

  async function annuler(id: string) {
    await api
      .delete(`/api/publications/${id}`)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Erreur"));
    void charger();
  }

  return (
    <main className="page">
      <Link to="/reglages" className="lien-retour">
        ← Réglages
      </Link>
      <h1>Publication Vinted</h1>

      <section className="encadre">
        <p>
          Programme du PC :{" "}
          {suivi === null ? (
            "…"
          ) : programmeActif(suivi.programmeVuLe) ? (
            <strong className="positif">actif</strong>
          ) : (
            <strong className="negatif">
              arrêté{suivi.programmeVuLe ? ` (dernier contact ${formatDateHeure(suivi.programmeVuLe)})` : ""}
            </strong>
          )}
        </p>
        <label className="case">
          <input
            type="checkbox"
            checked={essai}
            onChange={(e) => {
              setEssai(e.target.checked);
              ecrireModeEssai(e.target.checked);
            }}
          />{" "}
          Mode essai : remplir l'annonce sans la publier (pour les prochaines demandes)
        </label>
        <p className="secondaire">
          Pour publier : filtrez la liste des articles sur « À publier », touchez « Sélectionner », cochez les articles
          puis « Publier sur Vinted ». Guide : docs/guides/publication-vinted.md.
        </p>
      </section>

      {erreur && <p className="message message--erreur">{erreur}</p>}

      <section className="section">
        <h2>File de publication</h2>
        {suivi?.publications.length === 0 && <p className="vide">Aucune demande pour l'instant.</p>}
        <ul className="historique">
          {suivi?.publications.map((p) => (
            <li key={p.id}>
              <span>
                <Link to={`/articles/${p.articleId}`}>
                  {formatReference(p.reference)} {p.nom ?? "(sans nom)"}
                </Link>{" "}
                <span className={`etiquette-publication etiquette-publication--${p.etat}`}>
                  {LIBELLES[p.etat]}
                  {p.essai && p.etat !== "essai" ? " (essai)" : ""}
                </span>
                <br />
                <span className="secondaire">
                  Demandé le {formatDateHeure(p.demandeLe)}
                  {p.message ? ` — ${p.message}` : ""}
                </span>
                {p.etat === "publie" && p.urlVinted && (
                  <>
                    {" "}
                    <a href={p.urlVinted} target="_blank" rel="noreferrer">
                      Voir l'annonce ↗
                    </a>
                  </>
                )}
              </span>
              {p.etat === "en_attente" && (
                <button type="button" className="lien" onClick={() => void annuler(p.id)}>
                  Annuler
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Jeton du programme</h2>
        <p className="secondaire">
          Le programme du PC s'identifie avec ce jeton (à saisir lors de son installation). Il ne peut que lire la file
          de publication et les photos.
        </p>
        {jeton ? (
          <p className="message message--ok">
            Jeton (affiché une seule fois, copiez-le maintenant) : <code className="jeton">{jeton}</code>
          </p>
        ) : (
          <button type="button" className="bouton" onClick={() => void creerJeton()}>
            {suivi?.jetonCree ? "Remplacer le jeton" : "Créer un jeton"}
          </button>
        )}
      </section>
    </main>
  );
}
