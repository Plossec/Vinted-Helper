// Nouveaux articles par photos (#276, ADR-0117) : choisir un lot de photos (téléphone ou PC) et ce qui vaut pour tout
// le lot (sortie, ou lieu et date ; prix d'achat total facultatif), puis l'IA propose un groupe de photos par article ;
// l'utilisateur corrige les groupes et crée les brouillons, que l'IA remplit ensuite (ce qui manque : « À faire »).
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, envoyerPhoto, type Referentiels, type ResumeSortie, urlVignette } from "../api.js";
import { aujourdhui, formatDate } from "../utilitaires/dates.js";
import { lireMontant } from "../utilitaires/montants.js";

/** Au-delà, le lot est refusé par le serveur (environ 15 à 20 articles). */
const PHOTOS_MAX_LOT = 60;
/** Au-delà, un avertissement (sans refus) : moins de 10 photos par article, sauf exception. */
const PHOTOS_CONSEILLEES = 10;

type Etape =
  | { nom: "choix" }
  | { nom: "envoi"; faites: number; total: number }
  | { nom: "groupes"; groupes: string[][]; avertissement: string | null }
  | { nom: "fini"; nombre: number };

export function ArticlesParPhotos() {
  const [refs, setRefs] = useState<Referentiels | null>(null);
  const [sorties, setSorties] = useState<ResumeSortie[]>([]);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [sortieId, setSortieId] = useState("");
  const [lieuId, setLieuId] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [prix, setPrix] = useState("");
  const [etape, setEtape] = useState<Etape>({ nom: "choix" });
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Referentiels>("/api/referentiels")
      .then(setRefs)
      .catch(() => undefined);
    api
      .get<ResumeSortie[]>("/api/sorties")
      .then(setSorties)
      .catch(() => undefined);
  }, []);

  async function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    setErreur(null);
    if (fichiers.length === 0) return setErreur("Choisissez au moins une photo.");
    if (fichiers.length > PHOTOS_MAX_LOT) return setErreur(`${PHOTOS_MAX_LOT} photos au plus par lot.`);
    if (sortieId === "" && lieuId === "") return setErreur("Choisissez une sortie, ou un lieu d'achat.");
    if (lireMontant(prix) === "invalide") return setErreur("Prix d'achat : montant invalide (ex. 12,50).");
    const ids: string[] = [];
    try {
      for (const [i, f] of fichiers.entries()) {
        setEtape({ nom: "envoi", faites: i, total: fichiers.length });
        ids.push(await envoyerPhoto(f, "annonce"));
      }
    } catch (e) {
      setEtape({ nom: "choix" });
      return setErreur(e instanceof Error ? e.message : "Envoi des photos impossible.");
    }
    setEtape({ nom: "envoi", faites: ids.length, total: ids.length });
    try {
      const r = await api.post<{ groupes: string[][] }>("/api/articles-par-photos/regroupement", { photoIds: ids });
      setEtape({ nom: "groupes", groupes: r.groupes, avertissement: null });
    } catch (e) {
      // Sans l'IA (quota, panne) : une photo par article, à regrouper à la main.
      setEtape({
        nom: "groupes",
        groupes: ids.map((id) => [id]),
        avertissement: `${e instanceof Error ? e.message : "Regroupement impossible."} Regroupez les photos à la main.`,
      });
    }
  }

  /** Déplace une photo dans un autre groupe (ou un nouveau) ; les groupes vides disparaissent. */
  function deplacer(groupes: string[][], photoId: string, vers: number): string[][] {
    const sans = groupes.map((g) => g.filter((id) => id !== photoId));
    if (vers >= sans.length) sans.push([photoId]);
    else sans[vers]?.push(photoId);
    return sans.filter((g) => g.length > 0);
  }

  async function creer(groupes: string[][]) {
    setErreur(null);
    const montant = lireMontant(prix);
    try {
      const r = await api.post<{ articleIds: string[] }>("/api/articles-par-photos", {
        groupes,
        sortieId: sortieId || null,
        lieuId: sortieId ? null : lieuId,
        date: sortieId ? null : date,
        prixTotal: montant === "invalide" ? null : montant,
      });
      setEtape({ nom: "fini", nombre: r.articleIds.length });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    }
  }

  const message = erreur && (
    <p className="message message--erreur" role="alert">
      {erreur}
    </p>
  );

  if (etape.nom === "fini")
    return (
      <main className="page">
        <h1>Nouveaux articles par photos</h1>
        <p className="message message--ok" role="status">
          {etape.nombre} brouillon(s) créé(s). L'IA les remplit (nom, catégorie, marque, état, couleurs, annonce, prix)
          ; au-delà de la limite d'appels par heure, ils attendent l'heure suivante. Ce qui manque apparaît dans « À
          faire ».
        </p>
        <p className="actions">
          <Link to="/" className="bouton bouton--principal">
            Voir « À faire »
          </Link>
          <button type="button" className="bouton" onClick={() => setEtape({ nom: "choix" })}>
            Autre lot
          </button>
        </p>
      </main>
    );

  if (etape.nom === "groupes") {
    const { groupes } = etape;
    return (
      <main className="page">
        <h1>Vérifier les articles</h1>
        <p className="secondaire">
          L'IA propose {groupes.length} article(s). Déplacez une photo si elle n'est pas dans le bon article, puis créez
          les brouillons.
        </p>
        {etape.avertissement && (
          <p className="message message--erreur" role="alert">
            {etape.avertissement}
          </p>
        )}
        {groupes.map((g, i) => (
          <section className="section" key={g[0]}>
            <h2>
              Article {i + 1} ({g.length} photo{g.length > 1 ? "s" : ""})
            </h2>
            {g.length > PHOTOS_CONSEILLEES && (
              <p className="secondaire">
                Plus de {PHOTOS_CONSEILLEES} photos : vérifiez qu'il s'agit d'un seul article.
              </p>
            )}
            <ul className="photos">
              {g.map((id, n) => (
                <li key={id} className="photos__element">
                  <img src={urlVignette(id)} alt={`Article ${i + 1}, vue ${n + 1}`} loading="lazy" />
                  <label className="champ">
                    <span>Article</span>
                    <select
                      value={i}
                      onChange={(e) => setEtape({ ...etape, groupes: deplacer(groupes, id, Number(e.target.value)) })}
                    >
                      {groupes.map((_, j) => (
                        <option key={j} value={j}>
                          Article {j + 1}
                        </option>
                      ))}
                      <option value={groupes.length}>Nouvel article</option>
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {message}
        <p className="actions">
          <button type="button" className="bouton bouton--principal" onClick={() => void creer(groupes)}>
            Créer {groupes.length} brouillon(s)
          </button>
        </p>
      </main>
    );
  }

  const envoi = etape.nom === "envoi";
  return (
    <main className="page">
      <h1>Nouveaux articles par photos</h1>
      <p className="secondaire">
        Choisissez les photos de plusieurs articles (moins de {PHOTOS_CONSEILLEES} par article) : l'IA les regroupe par
        article et remplit les fiches. Ce qui vaut pour tout le lot se saisit une fois ici.
      </p>
      <form className="formulaire" onSubmit={(e) => void envoyer(e)} noValidate>
        <label className="champ">
          <span>Photos ({PHOTOS_MAX_LOT} au plus)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={envoi}
            onChange={(e) => setFichiers([...(e.target.files ?? [])])}
          />
        </label>
        {fichiers.length > 0 && <p className="secondaire">{fichiers.length} photo(s) choisie(s).</p>}
        <label className="champ">
          <span>Sortie</span>
          <select value={sortieId} onChange={(e) => setSortieId(e.target.value)} disabled={envoi}>
            <option value="">Aucune (lieu et date ci-dessous)</option>
            {sorties.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.date)} — {s.lieu}
              </option>
            ))}
          </select>
        </label>
        {sortieId === "" && (
          <div className="champs-ligne">
            <label className="champ">
              <span>Lieu d'achat</span>
              <select value={lieuId} onChange={(e) => setLieuId(e.target.value)} disabled={envoi}>
                <option value="">Choisir…</option>
                {refs?.lieux.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              <span>Date d'achat</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={envoi} />
            </label>
          </div>
        )}
        <label className="champ">
          <span>Prix d'achat total (facultatif, réparti entre les articles)</span>
          <input inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} disabled={envoi} />
        </label>
        {message}
        <button className="bouton bouton--principal" type="submit" disabled={envoi}>
          {envoi
            ? etape.faites < etape.total
              ? `Envoi des photos… ${etape.faites}/${etape.total}`
              : "Regroupement par l'IA…"
            : "Envoyer et regrouper"}
        </button>
      </form>
    </main>
  );
}
