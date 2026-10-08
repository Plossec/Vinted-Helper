// Tableau de bord (§5.9) : CA, bénéfice réalisé (réalisé et théorique du mois), trésorerie et son calcul, graphique
// mensuel réalisé + théorique, stock par statut, rentabilité par sortie et par lieu (Maison à part), analyse par
// catégorie / marque / gamme. Affichage revu le 08/10/2026 (issue #88).
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

/** Mesure théorique correspondant à une tuile (CA, bénéfice) ; la trésorerie a son calcul détaillé. */
const MESURE_EN_COURS = { chiffreAffaires: "chiffreAffaires", beneficeRealise: "benefice" } as const;

interface PostesTresorerie {
  encaisse: number;
  achats: number;
  essence: number;
  emballages: number;
  boosts: number;
  fraisDivers: number;
}

const POSTES_TRESORERIE: [keyof PostesTresorerie, string][] = [
  ["encaisse", "+ Encaissé (crédits Vinted, reventes)"],
  ["achats", "− Achats"],
  ["essence", "− Essence"],
  ["emballages", "− Emballages"],
  ["boosts", "− Boosts"],
  ["fraisDivers", "− Frais divers"],
];

interface Tableau {
  annee: number;
  /** Années d'activité, de la plus récente à la plus ancienne (issue #88). */
  annees: number[];
  mois: string;
  tresorerieDuMois: PostesTresorerie;
  duMois: Periode;
  deLAnnee: Periode;
  /** Ventes pas encore finalisées (À expédier, Envoyé), à la date de vente (issue #85). */
  enCours: { duMois: EnCours; deLAnnee: EnCours };
  /** Réalisé + en cours, calculé par le serveur. */
  theorique: { duMois: EnCours; deLAnnee: EnCours };
  serie: (Periode & {
    mois: string;
    enCours: EnCours;
    theorique: { chiffreAffaires: number; beneficeRealise: number; tresorerie: number };
  })[];
  stock: {
    coutTotal: number;
    prixAffiche: number;
    detail: Partial<Record<Statut, { nombre: number; coutTotal: number; prixAffiche: number }>>;
  };
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
  const [aideFrais, setAideFrais] = useState(false);
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

  // Années d'activité fournies par le serveur ; l'année en cours tant que le tableau n'est pas chargé.
  const annees = tableau?.annees ?? [annee];
  const libelleMois = `${MOIS[mois - 1] ?? ""} ${annee}`;
  const libelleMoisMajuscule = libelleMois.charAt(0).toUpperCase() + libelleMois.slice(1);
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
          <div className="tuiles tuiles--larges">
            {(["chiffreAffaires", "beneficeRealise"] as const).map((m) => (
              <div key={m} className="tuile">
                <span className="tuile__titre">{MESURES[m]}</span>
                <strong className="tuile__valeur">{formatEuros(tableau.duMois[m])}</strong>
                <span className="tuile__detail">
                  {libelleMoisMajuscule} réalisé : {formatEuros(tableau.duMois[m])}
                </span>
                <span className="tuile__detail">
                  {libelleMoisMajuscule} théorique : {formatEuros(tableau.theorique.duMois[MESURE_EN_COURS[m]])}
                </span>
              </div>
            ))}
            <div className="tuile">
              <span className="tuile__titre">{MESURES.tresorerie}</span>
              <strong className="tuile__valeur">{formatEuros(tableau.duMois.tresorerie)}</strong>
              <span className="tuile__detail">{libelleMoisMajuscule} :</span>
              <table className="tuile__calcul">
                <tbody>
                  {POSTES_TRESORERIE.filter(([cle]) => cle === "encaisse" || tableau.tresorerieDuMois[cle] !== 0).map(
                    ([cle, libelle]) => (
                      <tr key={cle}>
                        <td>{libelle}</td>
                        <td>{formatEuros(tableau.tresorerieDuMois[cle])}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="frais-generaux">
            <p>
              Frais généraux du mois : <strong>{formatEuros(tableau.duMois.fraisGeneraux)}</strong>{" "}
              <button
                type="button"
                className="info"
                aria-expanded={aideFrais}
                aria-label="Qu'est-ce que les frais généraux ?"
                onClick={() => setAideFrais((v) => !v)}
              >
                ⓘ
              </button>
            </p>
            {aideFrais && (
              <p className="info__texte" role="note">
                Frais divers (étiquettes, sachets…) et essence des sorties sans achat. Ils sont déduits du bénéfice
                réalisé et de la trésorerie du mois.
              </p>
            )}
            <Link to="/frais" className="bouton">
              Ajouter des frais divers
            </Link>
          </div>

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
              points={tableau.serie.map((p) => ({
                mois: p.mois,
                valeur: p[mesure],
                // Complément : ventes en cours (bénéfice en cours ; crédits attendus = CA en cours pour la trésorerie).
                complement: mesure === "beneficeRealise" ? p.enCours.benefice : p.enCours.chiffreAffaires,
                theorique: p.theorique[mesure],
              }))}
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
            <div className="defilement">
              <table className="tableau tableau--serre">
                <thead>
                  <tr>
                    <th>Statut</th>
                    <th>Coût total</th>
                    <th>Prix affiché</th>
                    <th>Qté</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(LIBELLES_STATUT) as Statut[]).map((s) => {
                    const ligne = tableau.stock.detail[s];
                    return (
                      ligne && (
                        <tr key={s}>
                          <td>
                            <span className={`badge badge--${s}`}>{LIBELLES_STATUT[s]}</span>
                          </td>
                          <td>{formatEuros(ligne.coutTotal)}</td>
                          <td>{ligne.prixAffiche === 0 ? "—" : formatEuros(ligne.prixAffiche)}</td>
                          <td>{ligne.nombre}</td>
                        </tr>
                      )
                    );
                  })}
                </tbody>
              </table>
            </div>
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
