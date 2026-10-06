// Fiche article (création et modification) — cahier des charges §5.2 : champs, photos, sortie, lot, coûts.
// Catégorie (arbre Vinted), marque et état obligatoires ; gamme en texte libre (décisions du 05/10/2026).
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, type Article, type DonneesArticle, type Referentiels, type TypeListe } from "../api.js";
import { BlocMontants } from "../composants/BlocMontants.js";
import { BlocStatut } from "../composants/BlocStatut.js";
import { PhotosArticle } from "../composants/PhotosArticle.js";
import { ListeDeroulante, normaliser, type OptionListe } from "../composants/ListeDeroulante.js";
import { aujourdhui } from "../outils/dates.js";
import { centimesVersSaisie, formatEuros, lireMontant } from "../outils/montants.js";
import { formatDate } from "../outils/dates.js";
import { formatReference } from "../statuts.js";

interface Formulaire {
  nom: string;
  /** Code de la catégorie choisie (vide tant qu'aucune n'est choisie dans la liste). */
  categorie: string;
  categorieTexte: string;
  marque: string;
  /** Code de l'état choisi. */
  etat: string;
  etatTexte: string;
  gamme: string;
  taille: string;
  matiere: string;
  lieu: string;
  prixAchat: string;
  /** Prix total du lot (articles de lot uniquement). */
  prixLot: string;
  dateAchat: string;
  prixAffiche: string;
  notes: string;
}

const formulaireVide = (): Formulaire => ({
  nom: "",
  categorie: "",
  categorieTexte: "",
  marque: "",
  etat: "",
  etatTexte: "",
  gamme: "",
  taille: "",
  matiere: "",
  lieu: "",
  prixAchat: "",
  prixLot: "",
  dateAchat: aujourdhui(),
  prixAffiche: "",
  notes: "",
});

const SEPARATEUR = " › ";
const memeNom = (a: string, b: string) => normaliser(a) === normaliser(b);

function versFormulaire(a: Article, refs: Referentiels): Formulaire {
  const categorie = refs.categories.find((c) => c.code === a.categorie);
  return {
    nom: a.nom ?? "",
    categorie: categorie?.code ?? "",
    categorieTexte: categorie?.chemin.join(SEPARATEUR) ?? "",
    marque: refs.marques.find((m) => m.id === a.marqueId)?.nom ?? "",
    etat: a.etat ?? "",
    etatTexte: refs.etats.find((e) => e.code === a.etat)?.libelle ?? "",
    gamme: a.gamme ?? "",
    taille: a.taille ?? "",
    matiere: a.matiere ?? "",
    lieu: refs.lieux.find((l) => l.id === a.lieuId)?.nom ?? "",
    prixAchat: centimesVersSaisie(a.prixAchat),
    prixLot: centimesVersSaisie(a.lot?.prixTotal ?? null),
    dateAchat: a.dateAchat ?? "",
    prixAffiche: centimesVersSaisie(a.prixAffiche),
    notes: a.notes ?? "",
  };
}

export function FicheArticle() {
  const { id } = useParams();
  const naviguer = useNavigate();
  const [refs, setRefs] = useState<Referentiels | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<Formulaire>(formulaireVide);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let actif = true;
    Promise.all([api.get<Referentiels>("/api/referentiels"), id ? api.get<Article>(`/api/articles/${id}`) : null])
      .then(([r, a]) => {
        if (!actif) return;
        setRefs(r);
        setArticle(a);
        setForm(a ? versFormulaire(a, r) : formulaireVide());
        setMessage(null);
      })
      .catch((e: unknown) => {
        if (actif) setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Chargement impossible." });
      });
    return () => {
      actif = false;
    };
  }, [id]);

  const options = useMemo(() => {
    if (refs === null) return null;
    return {
      categories: refs.categories.map((c): OptionListe => ({
        cle: c.code,
        libelle: c.chemin[c.chemin.length - 1] ?? c.code,
        secondaire: c.chemin.slice(0, -1).join(SEPARATEUR),
        recherche: c.chemin.join(" "),
      })),
      marques: refs.marques.map((m): OptionListe => ({ cle: m.id, libelle: m.nom })),
      etats: refs.etats.map((e): OptionListe => ({ cle: e.code, libelle: e.libelle })),
      lieux: refs.lieux.map((l): OptionListe => ({ cle: l.id, libelle: l.nom })),
    };
  }, [refs]);

  const modifier = (champ: keyof Formulaire) => (valeur: string) => setForm((f) => ({ ...f, [champ]: valeur }));

  function changerLieu(valeur: string) {
    // Lieu « Maison » : prix d'achat proposé à 0 € (décision du 05/10/2026).
    const estMaison = refs?.lieux.some((l) => l.estMaison && memeNom(l.nom, valeur)) ?? false;
    setForm((f) => ({ ...f, lieu: valeur, prixAchat: estMaison && f.prixAchat === "" ? "0,00" : f.prixAchat }));
  }

  /** Renvoie l'identifiant du lieu ou de la marque saisi ; l'ajoute à la liste s'il n'existe pas. */
  async function resoudre(type: TypeListe, texte: string): Promise<string> {
    if (refs === null) throw new Error("Listes non chargées.");
    const existante = refs[type].find((v) => memeNom(v.nom, texte));
    if (existante) return existante.id;
    const creee = await api.post<{ id: string; nom: string; estMaison?: boolean }>(`/api/referentiels/${type}`, {
      nom: texte.trim(),
    });
    setRefs((r) => {
      if (r === null) return r;
      return type === "lieux"
        ? { ...r, lieux: [...r.lieux, { estMaison: false, ...creee }] }
        : { ...r, marques: [...r.marques, { id: creee.id, nom: creee.nom }] };
    });
    return creee.id;
  }

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    setMessage(null);
    const erreur = (texte: string) => setMessage({ type: "erreur", texte });

    const enLot = article?.lot != null;
    const prixAchat = enLot ? null : lireMontant(form.prixAchat);
    const prixLot = enLot ? lireMontant(form.prixLot) : null;
    const prixAffiche = lireMontant(form.prixAffiche);
    if (form.nom.trim() === "") return erreur("Le nom est obligatoire.");
    if (form.categorie === "") return erreur("Choisissez une catégorie dans la liste.");
    if (form.marque.trim() === "") return erreur("La marque est obligatoire (« Sans marque » si besoin).");
    if (form.etat === "") return erreur("Choisissez un état dans la liste.");
    if (form.lieu.trim() === "") return erreur("Le lieu d'achat est obligatoire.");
    if (!enLot && prixAchat === null)
      return erreur("Le prix d'achat est obligatoire (0 pour un article de la maison).");
    if (prixAchat === "invalide") return erreur("Prix d'achat invalide (ex. 3,50).");
    if (enLot && (prixLot === null || prixLot === "invalide")) return erreur("Prix total du lot invalide (ex. 15).");
    if (form.dateAchat === "") return erreur("La date d'achat est obligatoire.");
    if (prixAffiche === "invalide") return erreur("Prix affiché invalide (ex. 12,00).");

    setEnvoi(true);
    try {
      const donnees: DonneesArticle = {
        nom: form.nom.trim(),
        categorie: form.categorie,
        marqueId: await resoudre("marques", form.marque),
        etat: form.etat,
        gamme: form.gamme.trim() || null,
        taille: form.taille.trim() || null,
        matiere: form.matiere.trim() || null,
        lieuId: await resoudre("lieux", form.lieu),
        prixAchat,
        dateAchat: form.dateAchat,
        prixAffiche,
        notes: form.notes.trim() || null,
      };
      if (article?.lot && typeof prixLot === "number" && prixLot !== article.lot.prixTotal) {
        await api.put(`/api/lots/${article.lot.id}`, { prixTotal: prixLot });
      }
      if (article === null) {
        const cree = await api.post<Article>("/api/articles", donnees);
        void naviguer(`/articles/${cree.id}`, { replace: true });
      } else {
        setArticle(await api.put<Article>(`/api/articles/${article.id}`, donnees));
        setMessage({ type: "ok", texte: "Fiche enregistrée." });
      }
    } catch (e) {
      erreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  function apresChangementStatut(a: Article) {
    setArticle(a);
    setForm((f) => ({ ...f, prixAffiche: centimesVersSaisie(a.prixAffiche) }));
  }

  if (refs === null || options === null) {
    return (
      <main className="page">
        {message ? <p className="message message--erreur">{message.texte}</p> : <p className="statut">Chargement…</p>}
      </main>
    );
  }

  return (
    <main className="page">
      <Link to="/" className="lien-retour">
        ← Articles
      </Link>
      <h1>{article ? `${formatReference(article.reference)} ${article.nom ?? ""}` : "Nouvel article"}</h1>

      <form className="formulaire" onSubmit={(e) => void enregistrer(e)} noValidate>
        <label className="champ">
          <span>Nom *</span>
          <input value={form.nom} onChange={(e) => modifier("nom")(e.target.value)} />
        </label>
        <ListeDeroulante
          libelle="Catégorie"
          obligatoire
          placeholder="Tapez pour chercher (ex. jean slim)"
          texte={form.categorieTexte}
          onTexte={(texte) => setForm((f) => ({ ...f, categorieTexte: texte, categorie: "" }))}
          options={options.categories}
          onChoix={(o) =>
            setForm((f) => ({
              ...f,
              categorie: o.cle,
              categorieTexte: [o.secondaire, o.libelle].filter(Boolean).join(SEPARATEUR),
            }))
          }
        />
        <ListeDeroulante
          libelle="Marque"
          obligatoire
          ajout
          texte={form.marque}
          onTexte={modifier("marque")}
          options={options.marques}
          onChoix={(o) => modifier("marque")(o.libelle)}
        />
        <ListeDeroulante
          libelle="État"
          obligatoire
          texte={form.etatTexte}
          onTexte={(texte) => setForm((f) => ({ ...f, etatTexte: texte, etat: "" }))}
          options={options.etats}
          onChoix={(o) => setForm((f) => ({ ...f, etat: o.cle, etatTexte: o.libelle }))}
        />
        <label className="champ">
          <span>Gamme</span>
          <input
            value={form.gamme}
            onChange={(e) => modifier("gamme")(e.target.value)}
            placeholder="Ex. Foot, Vintage…"
          />
        </label>
        <div className="champs-ligne">
          <label className="champ">
            <span>Taille</span>
            <input value={form.taille} onChange={(e) => modifier("taille")(e.target.value)} />
          </label>
          <label className="champ">
            <span>Matière</span>
            <input value={form.matiere} onChange={(e) => modifier("matiere")(e.target.value)} />
          </label>
        </div>
        <ListeDeroulante
          libelle="Lieu d'achat"
          obligatoire
          ajout
          texte={form.lieu}
          onTexte={changerLieu}
          options={options.lieux}
          onChoix={(o) => changerLieu(o.libelle)}
        />
        <div className="champs-ligne">
          {article?.lot ? (
            <label className="champ">
              <span>Prix total du lot (€) *</span>
              <input inputMode="decimal" value={form.prixLot} onChange={(e) => modifier("prixLot")(e.target.value)} />
            </label>
          ) : (
            <label className="champ">
              <span>Prix d'achat (€) *</span>
              <input
                inputMode="decimal"
                value={form.prixAchat}
                onChange={(e) => modifier("prixAchat")(e.target.value)}
                placeholder="2,00"
              />
            </label>
          )}
          <label className="champ">
            <span>Date d'achat *</span>
            <input type="date" value={form.dateAchat} onChange={(e) => modifier("dateAchat")(e.target.value)} />
          </label>
        </div>
        <label className="champ">
          <span>Prix affiché sur Vinted (€)</span>
          <input
            inputMode="decimal"
            value={form.prixAffiche}
            onChange={(e) => modifier("prixAffiche")(e.target.value)}
            placeholder="12,00"
          />
        </label>
        <label className="champ">
          <span>Notes</span>
          <textarea value={form.notes} onChange={(e) => modifier("notes")(e.target.value)} rows={3} />
        </label>

        {message && (
          <p className={`message message--${message.type}`} role={message.type === "erreur" ? "alert" : "status"}>
            {message.texte}
          </p>
        )}
        <button className="bouton bouton--principal" type="submit" disabled={envoi}>
          {envoi ? "Enregistrement…" : article ? "Enregistrer la fiche" : "Créer l'article"}
        </button>
      </form>

      {article && <InfosAchat article={article} />}
      {article && <PhotosArticle article={article} onMiseAJour={setArticle} />}
      {article && <BlocStatut article={article} onMiseAJour={apresChangementStatut} />}
      {article && <BlocMontants article={article} onMiseAJour={setArticle} />}
      {article && (
        <section className="section">
          <button
            type="button"
            className="bouton bouton--danger"
            onClick={() => {
              if (!window.confirm("Mettre cet article à la corbeille ? Il sera restaurable pendant 30 jours.")) return;
              void api
                .delete(`/api/articles/${article.id}`)
                .then(() => naviguer("/", { replace: true }))
                .catch((e: unknown) =>
                  setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Suppression impossible." }),
                );
            }}
          >
            Supprimer l'article
          </button>
        </section>
      )}
    </main>
  );
}

/** Sortie, lot et coûts d'achat calculés par le serveur (§6.1, §6.2). */
function InfosAchat({ article }: { article: Article }) {
  return (
    <section className="section">
      <h2>Achat</h2>
      {article.sortie ? (
        <p>
          Sortie :{" "}
          <Link to={`/sorties/${article.sortie.id}`}>
            {article.sortie.lieu} du {formatDate(article.sortie.date)}
          </Link>
        </p>
      ) : (
        <p className="secondaire">Sans sortie.</p>
      )}
      {article.lot && (
        <p>
          Lot de {article.lot.articles.length} articles pour {formatEuros(article.lot.prixTotal)} :{" "}
          {article.lot.articles.map((a, i) => (
            <span key={a.id}>
              {i > 0 && ", "}
              {a.id === article.id ? (
                <strong>{formatReference(a.reference)}</strong>
              ) : (
                <Link to={`/articles/${a.id}`}>{formatReference(a.reference)}</Link>
              )}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
