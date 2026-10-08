// Tableau de bord (§5.9) : CA, bénéfice réalisé, trésorerie (mois et année) + graphique mensuel, stock,
// rentabilité par sortie et par lieu (Maison à part), analyse par catégorie / marque / gamme.
// Tous les montants sont calculés par le serveur.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api.js";
import { GraphiqueMensuel } from "../composants/GraphiqueMensuel.js";
import { formatDate } from "../outils/dates.js";
import { formatEuros } from "../outils/montants.js";
import { LIBELLES_STATUT, type Statut } from "../statuts.js";

interface Periode {
  chiffreAffaires: number;
  beneficeRealise: number;
  tresorerie: number;
  fraisGeneraux: number;
}

interface Rentabilite {
  cle: string;
  libelle?: string;
  date?: string | null;
  realise: number;
  provisoire: number;
  nombreArticles: number;
  restants: number;
}

interface Analyse {
  cle: string;
  libelle: string;
  nombreVendus: number;
  margeMoyenne: number;
  tauxMarge: number | null;
  delaiMiseEnLigneVente: number | null;
  delaiAchatVente: number | null;
}

interface EnCours {
  chiffreAffaires: number;
  benefice: number;
}

/** Mesure en cours correspondant à une tuile (CA, bénéfice) ; la trésorerie n'en a pas. */
const MESURE_EN_COURS = { chiffreAffaires: "chiffreAffaires", beneficeRealise: "benefice" } as const;

interface Tableau {
  annee: number;
  mois: string;
  duMois: Periode;
  deLAnnee: Periode;
  /** Ventes pas encore finalisées (À expédier, Envoyé), à la date de vente (issue #85). */
  enCours: { duMois: EnCours; deLAnnee: EnCours };
  /** Réalisé + en cours, calculé par le serveur. */
  theorique: { duMois: EnCours; deLAnnee: EnCours };
  serie: (Periode & { mois: string })[];
  stock: { coutTotal: number; prixAffiche: number; parStatut: Partial<Record<Statut, number>> };
  rentabiliteSorties: { classement: Rentabilite[]; maison: Rentabilite | null };
  rentabiliteLieux: { classement: Rentabilite[]; maison: Rentabilite | null };
  analyse: { categories: Analyse[]; marques: Analyse[]; gammes: Analyse[] };
}

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const MESURES = {
  chiffreAffaires: "Chiffre d'affaires",
  beneficeRealise: "Bénéfice réalisé",
  tresorerie: "Trésorerie",
} as const;
type Mesure = keyof typeof MESURES;

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * « Théorique X € · dont en cours Y € » (issue #85) : réalisé + ventes À expédier ou Envoyé, pour le mois et
 * l'année. Montants calculés par le serveur ; rien n'est affiché sans vente en cours.
 */
function LigneEnCours({ tableau, mesure }: { tableau: Tableau; mesure: keyof typeof MESURE_EN_COURS }) {
  const cle = MESURE_EN_COURS[mesure];
  const ligne = (periode: "duMois" | "deLAnnee", libelle: string) =>
    tableau.enCours[periode][cle] === 0 ? null : (
      <span className="tuile__detail">
        {libelle} : théorique {formatEuros(tableau.theorique[periode][cle])} · dont en cours{" "}
        {formatEuros(tableau.enCours[periode][cle])}
      </span>
    );
  return (
    <>
      {ligne("duMois", majuscule(MOIS[Number(tableau.mois.slice(5, 7)) - 1] ?? ""))}
      {ligne("deLAnnee", "Année")}
    </>
  );
}

const pourcentage = (taux: number | null) =>
  taux === null ? "—" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(taux * 100)} %`;
const jours = (n: number | null) =>
  n === null ? "—" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n)} j`;

export function TableauDeBord() {
  const maintenant = new Date();
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [mois, setMois] = useState(maintenant.getMonth() + 1);
  const [niveau, setNiveau] = useState(3);
  const [mesure, setMesure] = useState<Mesure>("beneficeRealise");
  const [analyse, setAnalyse] = useState<"categories" | "marques" | "gammes">("categories");
  const [rentaPar, setRentaPar] = useState<"sorties" | "lieux">("sorties");
  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api
      .get<Tableau>(`/api/tableau-de-bord?annee=${annee}&mois=${mois}&niveau=${niveau}`)
      .then((t) => actif && setTableau(t))
      .catch((e: unknown) => actif && setErreur(e instanceof Error ? e.message : "Chargement impossible."));
    return () => {
      actif = false;
    };
  }, [annee, mois, niveau]);

  const annees = Array.from({ length: 5 }, (_, i) => maintenant.getFullYear() - i);
  const renta = tableau ? (rentaPar === "sorties" ? tableau.rentabiliteSorties : tableau.rentabiliteLieux) : null;

  return (
    <main className="page">
      <h1>Tableau de bord</h1>
      <div className="champs-ligne">
        <label className="champ">
          <span>Mois</span>
          <select value={mois} onChange={(e) => setMois(Number(e.target.value))}>
            {MOIS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="champ">
          <span>Année</span>
          <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erreur && <p className="message message--erreur">{erreur}</p>}
      {!tableau && !erreur && <p className="statut">Chargement…</p>}
      {tableau && (
        <>
          <div className="tuiles">
            {(Object.keys(MESURES) as Mesure[]).map((m) => (
              <div key={m} className="tuile">
                <span className="tuile__titre">{MESURES[m]}</span>
                <strong className="tuile__valeur">{formatEuros(tableau.duMois[m])}</strong>
                <span className="tuile__detail">
                  {MOIS[mois - 1]} · année {formatEuros(tableau.deLAnnee[m])}
                </span>
                {m !== "tresorerie" && <LigneEnCours tableau={tableau} mesure={m} />}
              </div>
            ))}
          </div>
          <p className="secondaire">
            Frais généraux du mois (frais divers + essence des sorties sans achat) :{" "}
            {formatEuros(tableau.duMois.fraisGeneraux)}. <Link to="/frais">Frais divers</Link>
          </p>

          <section className="section">
            <div className="segments">
              {(Object.keys(MESURES) as Mesure[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={m === mesure ? "bouton bouton--principal" : "bouton"}
                  onClick={() => setMesure(m)}
                >
                  {MESURES[m]}
                </button>
              ))}
            </div>
            <GraphiqueMensuel
              titre={`${MESURES[mesure]} ${annee}`}
              points={tableau.serie.map((p) => ({ mois: p.mois, valeur: p[mesure] }))}
            />
          </section>

          <section className="section">
            <h2>Stock</h2>
            <div className="tuiles">
              <div className="tuile">
                <span className="tuile__titre">Au coût total</span>
                <strong className="tuile__valeur">{formatEuros(tableau.stock.coutTotal)}</strong>
              </div>
              <div className="tuile">
                <span className="tuile__titre">Au prix affiché</span>
                <strong className="tuile__valeur">{formatEuros(tableau.stock.prixAffiche)}</strong>
              </div>
            </div>
            <ul className="historique">
              {(Object.keys(LIBELLES_STATUT) as Statut[])
                .filter((s) => tableau.stock.parStatut[s])
                .map((s) => (
                  <li key={s}>
                    <span className={`badge badge--${s}`}>{LIBELLES_STATUT[s]}</span>
                    <strong>{tableau.stock.parStatut[s]}</strong>
                  </li>
                ))}
            </ul>
          </section>

          <section className="section">
            <h2>Rentabilité</h2>
            <div className="segments">
              {(["sorties", "lieux"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={r === rentaPar ? "bouton bouton--principal" : "bouton"}
                  onClick={() => setRentaPar(r)}
                >
                  Par {r === "sorties" ? "sortie" : "lieu"}
                </button>
              ))}
            </div>
            <p className="secondaire">
              Réalisé : articles vendus (finalisés) ou sortis du stock. Provisoire : réalisé moins le coût des articles
              encore en stock.
            </p>
            <TableRentabilite lignes={renta?.classement ?? []} parSortie={rentaPar === "sorties"} />
            {renta?.maison && (
              <>
                <h3>Maison (hors classement)</h3>
                <TableRentabilite lignes={[{ ...renta.maison, libelle: "Maison" }]} parSortie={false} />
              </>
            )}
          </section>

          <section className="section">
            <h2>Analyse des ventes</h2>
            <div className="segments">
              {(
                [
                  ["categories", "Catégorie"],
                  ["marques", "Marque"],
                  ["gammes", "Gamme"],
                ] as const
              ).map(([cle, libelle]) => (
                <button
                  key={cle}
                  type="button"
                  className={cle === analyse ? "bouton bouton--principal" : "bouton"}
                  onClick={() => setAnalyse(cle)}
                >
                  {libelle}
                </button>
              ))}
            </div>
            {analyse === "categories" && (
              <label className="champ">
                <span>Niveau de détail</span>
                <select value={niveau} onChange={(e) => setNiveau(Number(e.target.value))}>
                  <option value={1}>Femmes / Hommes / Enfants…</option>
                  <option value={2}>+ Vêtements / Chaussures…</option>
                  <option value={3}>+ Jeans / Pulls…</option>
                  <option value={4}>Catégorie précise</option>
                </select>
              </label>
            )}
            {tableau.analyse[analyse].length === 0 ? (
              <p className="vide">Aucun article finalisé.</p>
            ) : (
              <div className="defilement">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Vendus</th>
                      <th>Marge moy.</th>
                      <th>Marge %</th>
                      <th>En ligne → vente</th>
                      <th>Achat → vente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tableau.analyse[analyse]]
                      .sort((a, b) => b.nombreVendus - a.nombreVendus)
                      .map((a) => (
                        <tr key={a.cle}>
                          <td>{a.libelle}</td>
                          <td>{a.nombreVendus}</td>
                          <td>{formatEuros(a.margeMoyenne)}</td>
                          <td>{pourcentage(a.tauxMarge)}</td>
                          <td>{jours(a.delaiMiseEnLigneVente)}</td>
                          <td>{jours(a.delaiAchatVente)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function TableRentabilite({ lignes, parSortie }: { lignes: Rentabilite[]; parSortie: boolean }) {
  if (lignes.length === 0) return <p className="vide">Aucune donnée.</p>;
  return (
    <div className="defilement">
      <table className="tableau">
        <thead>
          <tr>
            <th></th>
            <th>Réalisé</th>
            <th>Provisoire</th>
            <th>Restants</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((r) => (
            <tr key={r.cle}>
              <td>
                {parSortie && r.cle !== "maison" ? (
                  <Link to={`/sorties/${r.cle}`}>
                    {r.libelle} {r.date ? formatDate(r.date) : ""}
                  </Link>
                ) : (
                  r.libelle
                )}
              </td>
              <td className={r.realise < 0 ? "negatif" : ""}>{formatEuros(r.realise)}</td>
              <td className={r.provisoire < 0 ? "negatif" : ""}>{formatEuros(r.provisoire)}</td>
              <td>
                {r.restants} / {r.nombreArticles}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
