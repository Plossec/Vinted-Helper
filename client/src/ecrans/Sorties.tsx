// Liste des sorties d'achat (§5.1) et fiche d'une sortie : date, lieu, essence, notes, articles.
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { api, type Referentiels, type ResumeSortie, type Sortie, urlVignette } from "../api.js";
import { ListeDeroulante, normaliser, type OptionListe } from "../composants/ListeDeroulante.js";
import { chargerReferentiels } from "../hors-ligne/cache.js";
import { formatDate } from "../outils/dates.js";
import { centimesVersSaisie, formatEuros, lireMontant } from "../outils/montants.js";
import { formatReference, LIBELLES_STATUT } from "../statuts.js";

export function ListeSorties() {
  const [sorties, setSorties] = useState<ResumeSortie[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ResumeSortie[]>("/api/sorties")
      .then(setSorties)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  }, []);

  return (
    <main className="page">
      <Link to="/terrain" className="lien-retour">
        ← Terrain
      </Link>
      <h1>Sorties</h1>
      {erreur && <p className="message message--erreur">{erreur}</p>}
      {sorties === null && !erreur && <p className="statut">Chargement…</p>}
      {sorties?.length === 0 && <p className="vide">Aucune sortie pour l'instant.</p>}
      <ul className="liste">
        {sorties?.map((s) => (
          <li key={s.id}>
            <Link to={`/sorties/${s.id}`} className="carte-article">
              <span className="carte-article__ligne">
                <span className="carte-article__nom">{s.lieu}</span>
                <span className="reference">{formatDate(s.date)}</span>
              </span>
              <span className="carte-article__prix">
                {s.nombreArticles} article{s.nombreArticles > 1 ? "s" : ""} — essence {formatEuros(s.montantEssence)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function FicheSortie() {
  const { id } = useParams();
  const [sortie, setSortie] = useState<Sortie | null>(null);
  const [refs, setRefs] = useState<Referentiels | null>(null);
  const [form, setForm] = useState({ date: "", lieu: "", essence: "", notes: "" });
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    void chargerReferentiels(() => api.get<Referentiels>("/api/referentiels")).then(({ refs }) => setRefs(refs));
    api
      .get<Sortie>(`/api/sorties/${id ?? ""}`)
      .then((s) => {
        setSortie(s);
        setForm({ date: s.date, lieu: s.lieu, essence: centimesVersSaisie(s.montantEssence), notes: s.notes ?? "" });
      })
      .catch((e: unknown) =>
        setMessage({
          type: "erreur",
          texte:
            e instanceof Error && e.message === "Sortie introuvable."
              ? "Sortie pas encore reçue par le serveur (en attente d'envoi depuis le téléphone)."
              : e instanceof Error
                ? e.message
                : "Chargement impossible.",
        }),
      );
  }, [id]);

  const options = useMemo(() => (refs?.lieux ?? []).map((l): OptionListe => ({ cle: l.id, libelle: l.nom })), [refs]);

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    if (sortie === null) return;
    const lieu = refs?.lieux.find((l) => normaliser(l.nom) === normaliser(form.lieu));
    const essence = lireMontant(form.essence);
    if (!lieu) return setMessage({ type: "erreur", texte: "Choisissez un lieu dans la liste." });
    if (form.date === "") return setMessage({ type: "erreur", texte: "Indiquez la date." });
    if (essence === "invalide") return setMessage({ type: "erreur", texte: "Montant d'essence invalide." });
    try {
      await api.put(`/api/sorties/${sortie.id}`, { date: form.date, lieuId: lieu.id, notes: form.notes || null });
      const s = await api.put<Sortie>(`/api/sorties/${sortie.id}/essence`, { montantEssence: essence ?? 0 });
      setSortie(s);
      setMessage({ type: "ok", texte: "Sortie enregistrée." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Enregistrement impossible." });
    }
  }

  return (
    <main className="page">
      <Link to="/sorties" className="lien-retour">
        ← Sorties
      </Link>
      <h1>{sortie ? `${sortie.lieu} — ${formatDate(sortie.date)}` : "Sortie"}</h1>
      {sortie === null ? (
        message ? (
          <p className="message message--erreur">{message.texte}</p>
        ) : (
          <p className="statut">Chargement…</p>
        )
      ) : (
        <>
          <form className="formulaire" onSubmit={(e) => void enregistrer(e)} noValidate>
            <ListeDeroulante
              libelle="Lieu"
              obligatoire
              texte={form.lieu}
              onTexte={(lieu) => setForm((f) => ({ ...f, lieu }))}
              options={options}
              onChoix={(o) => setForm((f) => ({ ...f, lieu: o.libelle }))}
            />
            <div className="champs-ligne">
              <label className="champ">
                <span>Date *</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </label>
              <label className="champ">
                <span>Essence (€)</span>
                <input
                  inputMode="decimal"
                  value={form.essence}
                  onChange={(e) => setForm((f) => ({ ...f, essence: e.target.value }))}
                />
              </label>
            </div>
            <label className="champ">
              <span>Notes</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <p className="secondaire">
              {sortie.articles.length === 0
                ? `Aucun article : l'essence (${formatEuros(sortie.essenceFraisGeneral)}) compte en frais général du mois.`
                : "L'essence est répartie à parts égales entre les articles de la sortie. Changer la date ou le lieu met à jour ses articles."}
            </p>
            {message && (
              <p className={`message message--${message.type}`} role={message.type === "erreur" ? "alert" : "status"}>
                {message.texte}
              </p>
            )}
            <button className="bouton bouton--principal" type="submit">
              Enregistrer la sortie
            </button>
          </form>

          <section className="section">
            <h2>
              {sortie.articles.length} article{sortie.articles.length > 1 ? "s" : ""}
            </h2>
            <ul className="liste">
              {sortie.articles.map((a) => (
                <li key={a.id}>
                  <Link to={`/articles/${a.id}`} className="carte-article carte-article--photo">
                    {a.vignette ? (
                      <img className="vignette" src={urlVignette(a.vignette)} alt="" loading="lazy" />
                    ) : (
                      <span className="vignette" />
                    )}
                    <span>
                      <span className="reference">{formatReference(a.reference)}</span>{" "}
                      <span className={`badge badge--${a.statut}`}>{LIBELLES_STATUT[a.statut]}</span>
                      <br />
                      {a.nom ?? "(sans nom)"} — {formatEuros(a.prixAchat)} + {formatEuros(a.essence)} d'essence
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
