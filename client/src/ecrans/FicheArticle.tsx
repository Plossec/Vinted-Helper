// Fiche article (création et modification) — cahier des charges §5.2, lot 1 (sans photo).
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, type Article, type DonneesArticle, type Referentiels, type TypeListe } from "../api.js";
import { BlocStatut } from "../composants/BlocStatut.js";
import { ChampListe } from "../composants/ChampListe.js";
import { aujourdhui } from "../outils/dates.js";
import { centimesVersSaisie, lireMontant } from "../outils/montants.js";
import { formatReference } from "../statuts.js";

interface Formulaire {
  nom: string;
  lieu: string;
  categorie: string;
  marque: string;
  gamme: string;
  etat: string;
  taille: string;
  matiere: string;
  notes: string;
  prixAchat: string;
  dateAchat: string;
  prixAffiche: string;
}

const formulaireVide = (): Formulaire => ({
  nom: "",
  lieu: "",
  categorie: "",
  marque: "",
  gamme: "",
  etat: "",
  taille: "",
  matiere: "",
  notes: "",
  prixAchat: "",
  dateAchat: aujourdhui(),
  prixAffiche: "",
});

const nomDe = (liste: readonly { id: string; nom: string }[], id: string | null) =>
  liste.find((v) => v.id === id)?.nom ?? "";

const memeNom = (a: string, b: string) => a.trim().toLocaleLowerCase("fr") === b.trim().toLocaleLowerCase("fr");

function versFormulaire(a: Article, refs: Referentiels): Formulaire {
  return {
    nom: a.nom ?? "",
    lieu: nomDe(refs.lieux, a.lieuId),
    categorie: nomDe(refs.categories, a.categorieId),
    marque: nomDe(refs.marques, a.marqueId),
    gamme: nomDe(refs.gammes, a.gammeId),
    etat: nomDe(refs.etats, a.etatId),
    taille: a.taille ?? "",
    matiere: a.matiere ?? "",
    notes: a.notes ?? "",
    prixAchat: centimesVersSaisie(a.prixAchat),
    dateAchat: a.dateAchat ?? "",
    prixAffiche: centimesVersSaisie(a.prixAffiche),
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

  const modifier = (champ: keyof Formulaire) => (valeur: string) => setForm((f) => ({ ...f, [champ]: valeur }));

  function changerLieu(valeur: string) {
    // Lieu « Maison » : prix d'achat proposé à 0 € (décision du 05/10/2026).
    const estMaison = refs?.lieux.some((l) => l.estMaison && memeNom(l.nom, valeur)) ?? false;
    setForm((f) => ({ ...f, lieu: valeur, prixAchat: estMaison && f.prixAchat === "" ? "0,00" : f.prixAchat }));
  }

  /** Renvoie l'identifiant de la valeur saisie ; la crée dans la liste si elle n'existe pas. */
  async function resoudre(type: TypeListe, texte: string): Promise<string | null> {
    if (refs === null || texte.trim() === "") return null;
    const existante = refs[type].find((v) => memeNom(v.nom, texte));
    if (existante) return existante.id;
    const creee = await api.post<{ id: string; nom: string; estMaison?: boolean }>(`/api/referentiels/${type}`, {
      nom: texte.trim(),
    });
    setRefs((r) =>
      r === null ? r : { ...r, [type]: [...r[type], type === "lieux" ? { estMaison: false, ...creee } : creee] },
    );
    return creee.id;
  }

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    setMessage(null);
    const erreur = (texte: string) => setMessage({ type: "erreur", texte });

    const prixAchat = lireMontant(form.prixAchat);
    const prixAffiche = lireMontant(form.prixAffiche);
    if (form.nom.trim() === "") return erreur("Le nom est obligatoire.");
    if (form.lieu.trim() === "") return erreur("Le lieu d'achat est obligatoire.");
    if (prixAchat === null) return erreur("Le prix d'achat est obligatoire (0 pour un article de la maison).");
    if (prixAchat === "invalide") return erreur("Prix d'achat invalide (ex. 3,50).");
    if (form.dateAchat === "") return erreur("La date d'achat est obligatoire.");
    if (prixAffiche === "invalide") return erreur("Prix affiché invalide (ex. 12,00).");

    setEnvoi(true);
    try {
      const lieuId = await resoudre("lieux", form.lieu);
      if (lieuId === null) return erreur("Le lieu d'achat est obligatoire.");
      const donnees: DonneesArticle = {
        nom: form.nom.trim(),
        lieuId,
        prixAchat,
        dateAchat: form.dateAchat,
        categorieId: await resoudre("categories", form.categorie),
        marqueId: await resoudre("marques", form.marque),
        gammeId: await resoudre("gammes", form.gamme),
        etatId: await resoudre("etats", form.etat),
        taille: form.taille.trim() || null,
        matiere: form.matiere.trim() || null,
        notes: form.notes.trim() || null,
        prixAffiche,
      };
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

  if (refs === null) {
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

      <form className="formulaire" onSubmit={(e) => void enregistrer(e)}>
        <label className="champ">
          <span>Nom *</span>
          <input value={form.nom} onChange={(e) => modifier("nom")(e.target.value)} required />
        </label>
        <ChampListe
          libelle="Catégorie"
          valeur={form.categorie}
          valeurs={refs.categories}
          onChange={modifier("categorie")}
        />
        <ChampListe libelle="Marque" valeur={form.marque} valeurs={refs.marques} onChange={modifier("marque")} />
        <ChampListe libelle="Gamme" valeur={form.gamme} valeurs={refs.gammes} onChange={modifier("gamme")} />
        <ChampListe libelle="État" valeur={form.etat} valeurs={refs.etats} onChange={modifier("etat")} />
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
        <ChampListe libelle="Lieu d'achat" valeur={form.lieu} valeurs={refs.lieux} onChange={changerLieu} obligatoire />
        <div className="champs-ligne">
          <label className="champ">
            <span>Prix d'achat (€) *</span>
            <input
              inputMode="decimal"
              value={form.prixAchat}
              onChange={(e) => modifier("prixAchat")(e.target.value)}
              placeholder="2,00"
              required
            />
          </label>
          <label className="champ">
            <span>Date d'achat *</span>
            <input
              type="date"
              value={form.dateAchat}
              onChange={(e) => modifier("dateAchat")(e.target.value)}
              required
            />
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

      {article && <BlocStatut article={article} onMiseAJour={apresChangementStatut} />}
    </main>
  );
}
