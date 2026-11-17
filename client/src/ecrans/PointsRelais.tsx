// Points relais (#210) : liste saisie à la main (Vinted Go, Mondial Relay, La Poste, Relais Colis), avec horaires et
// état « ouvert / fermé ». Ils servent de point de dépôt d'un colis ou de point de retrait d'un retour.
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type ListePointsRelais, type PointRelais } from "../api.js";
import { ResumePointRelais } from "../composants/PointRelais.js";
import { formatJournee, type Horaires, JOURS, lireJournee } from "../outils/horaires.js";

interface Formulaire {
  id: string | null;
  transporteur: string;
  nom: string;
  adresse: string;
  numero: string;
  url: string;
  jours: string[];
  notes: string;
  archive: boolean;
}

const vide = (): Formulaire => ({
  id: null,
  transporteur: "",
  nom: "",
  adresse: "",
  numero: "",
  url: "",
  jours: JOURS.map(() => ""),
  notes: "",
  archive: false,
});

const depuisPoint = (p: PointRelais): Formulaire => ({
  id: p.id,
  transporteur: p.transporteur,
  nom: p.nom,
  adresse: p.adresse ?? "",
  numero: p.numero ?? "",
  url: p.url ?? "",
  jours: p.horaires.map((j) => (j.length === 0 ? "" : formatJournee(j))),
  notes: p.notes ?? "",
  archive: p.archive,
});

export function PointsRelais() {
  const [liste, setListe] = useState<ListePointsRelais | null>(null);
  const [form, setForm] = useState<Formulaire | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charger = () =>
    api
      .get<ListePointsRelais>("/api/points-relais")
      .then(setListe)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Chargement impossible."));
  useEffect(() => {
    void charger();
  }, []);

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    if (form === null) return;
    if (form.transporteur === "") return setErreur("Choisissez le transporteur.");
    if (form.nom.trim() === "") return setErreur("Indiquez le nom du point relais.");
    const horaires: Horaires = [];
    for (const [i, texte] of form.jours.entries()) {
      const plages = lireJournee(texte);
      if (plages === "invalide") {
        return setErreur(`Horaires du ${(JOURS[i] ?? "").toLowerCase()} illisibles (ex. 9h-12h, 14h-19h).`);
      }
      horaires.push(plages);
    }
    const corps = {
      transporteur: form.transporteur,
      nom: form.nom.trim(),
      adresse: form.adresse.trim() || null,
      numero: form.numero.trim() || null,
      url: form.url.trim() || null,
      horaires,
      notes: form.notes.trim() || null,
      archive: form.archive,
    };
    try {
      if (form.id) await api.put(`/api/points-relais/${form.id}`, corps);
      else await api.post("/api/points-relais", corps);
      setMessage(form.id ? `Point « ${corps.nom} » enregistré.` : `Point « ${corps.nom} » ajouté.`);
      setForm(null);
      setErreur(null);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  }

  const modifier = (f: Partial<Formulaire>) => setForm((actuel) => (actuel ? { ...actuel, ...f } : actuel));
  const actifs = liste?.points.filter((p) => !p.archive) ?? [];
  const archives = liste?.points.filter((p) => p.archive) ?? [];

  const carte = (p: PointRelais) => (
    <li key={p.id} className="carte-article">
      <ResumePointRelais point={p} transporteurs={liste?.transporteurs ?? []} />
      <button
        type="button"
        className="lien"
        aria-label={`Modifier le point relais « ${p.nom} »`}
        onClick={() => {
          setMessage(null);
          setErreur(null);
          setForm(depuisPoint(p));
        }}
      >
        Modifier
      </button>
    </li>
  );

  return (
    <main className="page">
      <Link to="/reglages" className="lien-retour">
        <span aria-hidden="true">←</span> Réglages
      </Link>
      <h1>Points relais</h1>
      <p className="secondaire">
        Vos points de dépôt et de retrait. L'état « ouvert / fermé » vient des horaires saisis ici : vérifiez une
        fermeture exceptionnelle sur la page officielle du point.
      </p>
      {message && (
        <p className="message message--ok" role="status">
          {message}
        </p>
      )}

      {form ? (
        <form className="formulaire encadre" onSubmit={(e) => void enregistrer(e)} noValidate>
          <h2>{form.id ? "Modifier le point relais" : "Nouveau point relais"}</h2>
          <label className="champ">
            <span>Transporteur *</span>
            <select
              aria-required="true"
              value={form.transporteur}
              onChange={(e) => modifier({ transporteur: e.target.value })}
            >
              <option value="">Choisir…</option>
              {liste?.transporteurs.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="champ">
            <span>Nom *</span>
            <input
              aria-required="true"
              value={form.nom}
              onChange={(e) => modifier({ nom: e.target.value })}
              placeholder="Tabac de la gare, casier du centre commercial…"
            />
          </label>
          <label className="champ">
            <span>Adresse</span>
            <input value={form.adresse} onChange={(e) => modifier({ adresse: e.target.value })} />
          </label>
          <div className="champs-ligne">
            <label className="champ">
              <span>Numéro du point</span>
              <input value={form.numero} onChange={(e) => modifier({ numero: e.target.value })} />
            </label>
          </div>
          <label className="champ">
            <span>Page officielle du point</span>
            <input
              type="url"
              inputMode="url"
              value={form.url}
              onChange={(e) => modifier({ url: e.target.value })}
              placeholder="https://…"
            />
          </label>
          <fieldset className="horaires">
            <legend>Horaires (vide = fermé)</legend>
            {JOURS.map((jour, i) => (
              <label key={jour} className="champ">
                <span>{jour}</span>
                <input
                  value={form.jours[i] ?? ""}
                  placeholder={i === 0 ? "ex. 9h-12h, 14h-19h" : "Fermé"}
                  onChange={(e) => modifier({ jours: form.jours.map((j, k) => (k === i ? e.target.value : j)) })}
                />
              </label>
            ))}
          </fieldset>
          <label className="champ">
            <span>Notes</span>
            <textarea value={form.notes} onChange={(e) => modifier({ notes: e.target.value })} />
          </label>
          {form.id && (
            <label className="case">
              <input type="checkbox" checked={form.archive} onChange={(e) => modifier({ archive: e.target.checked })} />{" "}
              Archivé (n'est plus proposé pour les ventes)
            </label>
          )}
          {erreur && (
            <p className="message message--erreur" role="alert">
              {erreur}
            </p>
          )}
          <button className="bouton bouton--principal" type="submit">
            {form.id ? "Enregistrer" : "Ajouter le point relais"}
          </button>
          <button className="bouton" type="button" onClick={() => setForm(null)}>
            Annuler
          </button>
        </form>
      ) : (
        <div className="actions">
          <button
            className="bouton bouton--principal"
            type="button"
            onClick={() => {
              setMessage(null);
              setErreur(null);
              setForm(vide());
            }}
          >
            Ajouter un point relais
          </button>
        </div>
      )}

      {!form && erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      {liste === null && !erreur && <p className="statut">Chargement…</p>}
      {liste && actifs.length === 0 && <p className="vide">Aucun point relais pour l'instant.</p>}
      <ul className="liste">{actifs.map(carte)}</ul>
      {archives.length > 0 && (
        <details className="section">
          <summary>Archivés ({archives.length})</summary>
          <ul className="liste">{archives.map(carte)}</ul>
        </details>
      )}
    </main>
  );
}
