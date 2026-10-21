// Journal des tâches automatisées (#233) : actions des articles dormants et lectures des ventes finalisées, le plus
// récent d'abord, sur 3 mois ; filtres par tâche, état et jour ; raison des erreurs et relevé de l'extension.
// Utilisé sous chaque tâche (Réglages → Tâches automatiques), en entier dans Réglages et dans Publication Vinted.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type EtatJournal, type LigneJournal, type TacheAutomatique } from "../api.js";
import { formatDateHeure } from "../outils/dates.js";
import { formatReference } from "../statuts.js";
import { CLASSES, ETATS, libelleAction } from "./ActionsTaches.js";
import { NouvelOnglet } from "./NouvelOnglet.js";

export const NOMS_TACHES: Record<TacheAutomatique, string> = {
  dormants: "Articles dormants",
  finalisation: "Ventes finalisées",
};

const ETATS_FILTRE: EtatJournal[] = ["faite", "essai", "erreur", "en_attente", "en_cours", "refusee", "annulee"];

/** « 12 commandes lues, 3 finalisées, 1 à valider, 1 à rattacher ». */
function libelleLecture(l: Extract<LigneJournal, { tache: "finalisation" }>["lecture"], essai: boolean): string {
  const lues = `${l.lues} commande(s) lue(s)`;
  if (essai) return `Lecture du « Porte-monnaie » : ${lues}, rien n'est enregistré (essai)`;
  const details = [
    `${l.nouvelles} nouvelle(s)`,
    `${l.finalisees} finalisée(s)`,
    l.aValider > 0 ? `${l.aValider} à valider` : null,
    l.aRattacher > 0 ? `${l.aRattacher} à rattacher` : null,
  ].filter((x) => x !== null);
  return `Lecture du « Porte-monnaie » : ${lues}, ${details.join(", ")}`;
}

export function JournalTaches({
  tache,
  limite,
  filtres = false,
  version = 0,
}: {
  /** Journal d'une seule tâche (sans filtre de tâche). */
  tache?: TacheAutomatique;
  /** Lignes affichées au plus. */
  limite?: number;
  /** Filtres par tâche, état et jour. */
  filtres?: boolean;
  /** Change après un enregistrement ou un lancement : le journal est relu. */
  version?: number;
}) {
  const [filtreTache, setFiltreTache] = useState<TacheAutomatique | "">(tache ?? "");
  const [filtreEtat, setFiltreEtat] = useState<EtatJournal | "">("");
  const [filtreJour, setFiltreJour] = useState("");
  const [lignes, setLignes] = useState<LigneJournal[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const parametres = new URLSearchParams();
    if (filtreTache) parametres.set("tache", filtreTache);
    if (filtreEtat) parametres.set("etat", filtreEtat);
    if (filtreJour) parametres.set("jour", filtreJour);
    let actif = true;
    api
      .get<{ lignes: LigneJournal[] }>(`/api/taches/journal?${parametres.toString()}`)
      .then((r) => {
        if (!actif) return;
        setLignes(r.lignes);
        setErreur(null);
      })
      .catch((e: unknown) => {
        if (actif) setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      });
    return () => {
      actif = false;
    };
  }, [filtreTache, filtreEtat, filtreJour, version]);

  const affichees = limite === undefined ? lignes : lignes?.slice(0, limite);
  return (
    <div className="journal-taches">
      {filtres && (
        <div className="champs-ligne journal-taches__filtres">
          {!tache && (
            <label className="champ">
              <span>Tâche</span>
              <select value={filtreTache} onChange={(e) => setFiltreTache(e.target.value as TacheAutomatique | "")}>
                <option value="">Toutes</option>
                <option value="dormants">{NOMS_TACHES.dormants}</option>
                <option value="finalisation">{NOMS_TACHES.finalisation}</option>
              </select>
            </label>
          )}
          <label className="champ">
            <span>État</span>
            <select value={filtreEtat} onChange={(e) => setFiltreEtat(e.target.value as EtatJournal | "")}>
              <option value="">Tous</option>
              {ETATS_FILTRE.map((x) => (
                <option key={x} value={x}>
                  {ETATS[x]}
                </option>
              ))}
            </select>
          </label>
          <label className="champ">
            <span>Jour</span>
            <input type="date" value={filtreJour} onChange={(e) => setFiltreJour(e.target.value)} />
          </label>
        </div>
      )}
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      {affichees && affichees.length === 0 && <p className="vide">Aucune ligne dans le journal.</p>}
      <ul className="historique">
        {affichees?.map((l) => (
          <li key={`${l.tache}-${l.id}`}>
            <span>
              {!tache && <strong>{NOMS_TACHES[l.tache]} </strong>}
              {l.tache === "dormants" && (
                <Link to={`/articles/${l.action.article.id}`}>
                  {formatReference(l.action.article.reference)} {l.action.article.nom ?? "(sans nom)"}
                </Link>
              )}{" "}
              <span className={`etiquette-publication etiquette-publication--${CLASSES[l.etat] ?? l.etat}`}>
                {ETATS[l.etat]}
                {l.essai && l.etat !== "essai" ? " (essai)" : ""}
              </span>
              <br />
              <span className="secondaire">
                {formatDateHeure(l.date)} —{" "}
                {l.tache === "dormants" ? libelleAction(l.action) : libelleLecture(l.lecture, l.essai)}
                {l.manuelle ? " — lancée à la main" : ""}
              </span>
              {l.message && (
                <>
                  <br />
                  <span className={l.etat === "erreur" ? "journal-taches__erreur" : "secondaire"}>
                    {l.etat === "erreur" ? "Raison : " : ""}
                    {l.message}
                  </span>
                </>
              )}
              {l.releve && (
                <>
                  <br />
                  <span className="secondaire">Relevé enregistré : fenêtre de l'extension → « Dernier relevé ».</span>
                </>
              )}
              {l.tache === "dormants" && l.action.url && (
                <>
                  {" "}
                  <a href={l.action.url} target="_blank" rel="noreferrer">
                    Voir l'annonce
                    <NouvelOnglet />
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {limite !== undefined && lignes && lignes.length > limite && (
        <p className="secondaire">Lignes plus anciennes : journal complet en bas de cette page.</p>
      )}
    </div>
  );
}
