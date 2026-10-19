// Fiche article (création et modification) — cahier des charges §5.2 : champs, photos, sortie, lot, coûts.
// Catégorie (arbre Vinted), marque et état obligatoires ; gamme en texte libre (décisions du 05/10/2026).
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import {
  api,
  type Article,
  type DonneesArticle,
  envoyerImage,
  type Referentiels,
  type ReglageBaisse,
  type TypeListe,
  urlVignette,
} from "../api.js";
import { Montant } from "../composants/Montant.js";
import { Repli } from "../composants/Repli.js";
import { BlocAnnonce } from "../composants/BlocAnnonce.js";
import { BlocVinted } from "../composants/BlocVinted.js";
import { BlocMontants } from "../composants/BlocMontants.js";
import { BlocStatut } from "../composants/BlocStatut.js";
import { PhotosArticle } from "../composants/PhotosArticle.js";
import { ListeDeroulante, normaliser, type OptionListe } from "../composants/ListeDeroulante.js";
import { aujourdhui } from "../outils/dates.js";
import { centimesVersSaisie, formatEuros, lireMontant } from "../outils/montants.js";
import { formatDate } from "../outils/dates.js";
import { AVANT_VENTE, formatReference, LIBELLES_STATUT, type Statut } from "../statuts.js";
import { ContexteModifications, messageAbandon, type Modifications } from "../outils/modifications.js";
import { confirmer } from "../composants/Dialogue.js";

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
  prixVenteMinimum: string;
  /** Baisse automatique d'un article dormant (#147) et sa valeur (% entier ou euros). */
  baisseRegle: ReglageBaisse;
  baisseValeur: string;
  notes: string;
  couleur1: string;
  couleur2: string;
  formatColis: string;
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
  prixVenteMinimum: "",
  baisseRegle: "compte",
  baisseValeur: "",
  notes: "",
  couleur1: "",
  couleur2: "",
  formatColis: "",
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
    prixVenteMinimum: centimesVersSaisie(a.prixVenteMinimum),
    baisseRegle: a.baisseRegle,
    baisseValeur:
      a.baisseValeur === null
        ? ""
        : a.baisseRegle === "montant"
          ? centimesVersSaisie(a.baisseValeur)
          : String(a.baisseValeur),
    notes: a.notes ?? "",
    couleur1: a.couleurs[0] ?? "",
    couleur2: a.couleurs[1] ?? "",
    formatColis: a.formatColis ?? "",
  };
}

export function FicheArticle() {
  const { id } = useParams();
  const naviguer = useNavigate();
  const [refs, setRefs] = useState<Referentiels | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<Formulaire>(formulaireVide);
  /** Dernier état enregistré (ou chargé) du formulaire, pour repérer une saisie non enregistrée (#99). */
  const [formEnregistre, setFormEnregistre] = useState<Formulaire>(form);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [lecture, setLecture] = useState(false);
  const etiquette = useRef<HTMLInputElement>(null);
  const avantVente = article === null || AVANT_VENTE.has(article.statut);

  // Saisies non enregistrées : la fiche et les blocs qui le signalent (annonce, liens Vinted, boost).
  const [blocsModifies, setBlocsModifies] = useState<string[]>([]);
  const ficheModifiee = refs !== null && JSON.stringify(form) !== JSON.stringify(formEnregistre);
  const nonEnregistre = useMemo(
    () => (ficheModifiee ? ["la fiche", ...blocsModifies] : blocsModifies),
    [ficheModifiee, blocsModifies],
  );
  /** Navigation voulue par la fiche elle-même (article créé ou supprimé) : pas d'avertissement. */
  const sansAvertissement = useRef(false);
  const signaler = useCallback(
    (bloc: string, modifie: boolean) =>
      setBlocsModifies((b) =>
        b.includes(bloc) === modifie ? b : modifie ? [...b, bloc] : b.filter((x) => x !== bloc),
      ),
    [],
  );
  const modifications = useMemo<Modifications>(
    () => ({
      signaler,
      confirmerAbandon: (action) =>
        nonEnregistre.length === 0
          ? Promise.resolve(true)
          : confirmer(messageAbandon(nonEnregistre, action), { action: "Continuer", danger: true }),
    }),
    [signaler, nonEnregistre],
  );
  const blocage = useBlocker(
    ({ currentLocation, nextLocation }) =>
      nonEnregistre.length > 0 && !sansAvertissement.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocage.state !== "blocked") return;
    let actif = true;
    void confirmer(messageAbandon(nonEnregistre, "quitter la fiche"), {
      action: "Quitter",
      danger: true,
    }).then((ok) => {
      if (!actif) return;
      if (ok) blocage.proceed();
      else blocage.reset();
    });
    return () => {
      actif = false;
    };
  }, [blocage, nonEnregistre]);
  // Fermeture de l'onglet ou rechargement : avertissement du navigateur.
  useEffect(() => {
    if (nonEnregistre.length === 0) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [nonEnregistre]);

  useEffect(() => {
    let actif = true;
    sansAvertissement.current = false;
    Promise.all([api.get<Referentiels>("/api/referentiels"), id ? api.get<Article>(`/api/articles/${id}`) : null])
      .then(([r, a]) => {
        if (!actif) return;
        const charge = a ? versFormulaire(a, r) : formulaireVide();
        setRefs(r);
        setArticle(a);
        setForm(charge);
        setFormEnregistre(charge);
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
    const prixVenteMinimum = lireMontant(form.prixVenteMinimum);
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
    if (prixVenteMinimum === "invalide") return erreur("Prix vente minimum invalide (ex. 10,00).");
    if (prixAffiche !== null && prixVenteMinimum !== null && prixVenteMinimum > prixAffiche)
      return erreur("Le prix vente minimum doit être inférieur ou égal au prix affiché.");
    let baisseValeur: number | null = null;
    if (form.baisseRegle === "pourcentage") {
      baisseValeur = /^\d+$/.test(form.baisseValeur.trim()) ? Number(form.baisseValeur.trim()) : NaN;
      if (!(baisseValeur >= 1 && baisseValeur <= 90)) return erreur("Baisse automatique : pourcentage entre 1 et 90.");
    } else if (form.baisseRegle === "montant") {
      const montant = lireMontant(form.baisseValeur);
      if (montant === null || montant === "invalide" || montant <= 0)
        return erreur("Baisse automatique : montant invalide (ex. 1,00).");
      baisseValeur = montant;
    }

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
        prixVenteMinimum,
        notes: form.notes.trim() || null,
        couleurs: [form.couleur1, form.couleur2].filter((c, i, t) => c !== "" && t.indexOf(c) === i),
        formatColis: form.formatColis || null,
        baisseRegle: form.baisseRegle,
        baisseValeur,
      };
      if (article?.lot && typeof prixLot === "number" && prixLot !== article.lot.prixTotal) {
        await api.put(`/api/lots/${article.lot.id}`, { prixTotal: prixLot });
      }
      if (article === null) {
        const cree = await api.post<Article>("/api/articles", donnees);
        sansAvertissement.current = true;
        void naviguer(`/articles/${cree.id}`, { replace: true });
      } else {
        setArticle(await api.put<Article>(`/api/articles/${article.id}`, donnees));
        setFormEnregistre(form);
        setMessage({ type: "ok", texte: "Fiche enregistrée." });
      }
    } catch (e) {
      erreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  /** « Lire l'étiquette » (§5.5) : propositions placées dans le formulaire, rien n'est enregistré avant validation. */
  async function lireEtiquette(evenement: ChangeEvent<HTMLInputElement>) {
    const image = evenement.target.files?.[0];
    evenement.target.value = "";
    if (!image || refs === null) return;
    setLecture(true);
    setMessage(null);
    try {
      const p = await envoyerImage<{
        marque: string | null;
        taille: string | null;
        categorie: string | null;
        categorieTexte: string | null;
        matiere: string | null;
      }>("/api/etiquette", image);
      const categorie = refs.categories.find((c) => c.code === p.categorie);
      setForm((f) => ({
        ...f,
        marque: p.marque ?? f.marque,
        taille: p.taille ?? f.taille,
        matiere: p.matiere ?? f.matiere,
        ...(categorie ? { categorie: categorie.code, categorieTexte: categorie.chemin.join(SEPARATEUR) } : {}),
      }));
      setMessage({
        type: "ok",
        texte: `Étiquette lue${p.categorieTexte && !categorie ? ` (catégorie proposée : « ${p.categorieTexte} », à choisir dans la liste)` : ""}. Vérifiez les champs puis enregistrez.`,
      });
    } catch (e) {
      setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Lecture impossible." });
    } finally {
      setLecture(false);
    }
  }

  function apresChangementStatut(a: Article) {
    setArticle(a);
    setForm((f) => ({ ...f, prixAffiche: centimesVersSaisie(a.prixAffiche) }));
    setFormEnregistre((f) => ({ ...f, prixAffiche: centimesVersSaisie(a.prixAffiche) }));
  }

  if (refs === null || options === null) {
    return (
      <main className="page">
        {message ? (
          <p className="message message--erreur" role="alert">
            {message.texte}
          </p>
        ) : (
          <p className="statut">Chargement…</p>
        )}
      </main>
    );
  }

  return (
    <ContexteModifications value={modifications}>
      <main className={article ? "page page--fiche" : "page"}>
        <Link to="/articles" className="lien-retour">
          <span aria-hidden="true">←</span> Articles
        </Link>
        <h1>{article ? `${formatReference(article.reference)} ${article.nom ?? ""}` : "Nouvel article"}</h1>
        {article && <EnteteArticle article={article} />}
        {article && (
          <Repli titre="Statut et prochaine étape" ouvert>
            <BlocStatut article={article} onMiseAJour={apresChangementStatut} />
          </Repli>
        )}

        {/* PC (≥ 1024 px, #106) : fiche à gauche, blocs (annonce, Vinted, photos, statut, montants) à droite.
            Téléphone (#98) : avant la vente, la fiche d'abord ; ensuite, statut et montants d'abord, fiche repliée. */}
        <div className={article && !avantVente ? "fiche fiche--vendu" : "fiche"}>
          <div className="fiche__colonne fiche__colonne--formulaire">
            <Facultatif repli={article !== null} titre="Fiche" ouvert={avantVente}>
              <input
                ref={etiquette}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => void lireEtiquette(e)}
              />
              <button type="button" className="bouton" disabled={lecture} onClick={() => etiquette.current?.click()}>
                {lecture ? (
                  "Lecture de l'étiquette…"
                ) : (
                  <>
                    <span aria-hidden="true">🏷</span> Lire l'étiquette
                  </>
                )}
              </button>

              <form className="formulaire section" onSubmit={(e) => void enregistrer(e)} noValidate>
                <p className="secondaire">* champ obligatoire</p>
                <label className="champ">
                  <span>Nom *</span>
                  <input aria-required="true" value={form.nom} onChange={(e) => modifier("nom")(e.target.value)} />
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
                      <input
                        aria-required="true"
                        inputMode="decimal"
                        value={form.prixLot}
                        onChange={(e) => modifier("prixLot")(e.target.value)}
                      />
                    </label>
                  ) : (
                    <label className="champ">
                      <span>Prix d'achat (€) *</span>
                      <input
                        aria-required="true"
                        inputMode="decimal"
                        value={form.prixAchat}
                        onChange={(e) => modifier("prixAchat")(e.target.value)}
                        placeholder="2,00"
                      />
                    </label>
                  )}
                  <label className="champ">
                    <span>Date d'achat *</span>
                    <input
                      aria-required="true"
                      type="date"
                      value={form.dateAchat}
                      onChange={(e) => modifier("dateAchat")(e.target.value)}
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
                  <span>Prix vente minimum (€)</span>
                  <input
                    inputMode="decimal"
                    value={form.prixVenteMinimum}
                    onChange={(e) => modifier("prixVenteMinimum")(e.target.value)}
                    placeholder="Facultatif"
                  />
                </label>
                {/* Tâche « Articles dormants » (#147) : jamais sous le prix vente minimum ; sans minimum, republication. */}
                <div className="champs-ligne">
                  <label className="champ">
                    <span>Baisse automatique (dormant)</span>
                    <select
                      value={form.baisseRegle}
                      onChange={(e) => modifier("baisseRegle")(e.target.value as ReglageBaisse)}
                    >
                      <option value="compte">Selon le réglage du compte</option>
                      <option value="pourcentage">Pourcentage</option>
                      <option value="montant">Montant</option>
                      <option value="aucune">Ne pas baisser le prix</option>
                    </select>
                  </label>
                  {(form.baisseRegle === "pourcentage" || form.baisseRegle === "montant") && (
                    <label className="champ">
                      <span>{form.baisseRegle === "pourcentage" ? "Baisse (%)" : "Baisse (€)"}</span>
                      <input
                        inputMode={form.baisseRegle === "pourcentage" ? "numeric" : "decimal"}
                        value={form.baisseValeur}
                        onChange={(e) => modifier("baisseValeur")(e.target.value)}
                        placeholder={form.baisseRegle === "pourcentage" ? "10" : "1,00"}
                      />
                    </label>
                  )}
                </div>
                <div className="champs-ligne">
                  <label className="champ">
                    <span>Couleur</span>
                    <select value={form.couleur1} onChange={(e) => modifier("couleur1")(e.target.value)}>
                      <option value="">—</option>
                      {refs.couleurs.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.libelle}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="champ">
                    <span>2e couleur</span>
                    <select value={form.couleur2} onChange={(e) => modifier("couleur2")(e.target.value)}>
                      <option value="">—</option>
                      {refs.couleurs.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.libelle}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="champ">
                  <span>Format du colis (Vinted)</span>
                  <select value={form.formatColis} onChange={(e) => modifier("formatColis")(e.target.value)}>
                    <option value="">Par défaut (Réglages)</option>
                    {refs.formatsColis.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="champ">
                  <span>Notes</span>
                  <textarea value={form.notes} onChange={(e) => modifier("notes")(e.target.value)} rows={3} />
                </label>

                {message && (
                  <p
                    className={`message message--${message.type}`}
                    role={message.type === "erreur" ? "alert" : "status"}
                  >
                    {message.texte}
                  </p>
                )}
                <button className="bouton bouton--principal" type="submit" disabled={envoi}>
                  {envoi ? "Enregistrement…" : article ? "Enregistrer la fiche" : "Créer l'article"}
                </button>
              </form>
            </Facultatif>
          </div>

          {article && (
            <div className="fiche__colonne">
              {blocsDansLOrdre(article.statut, {
                montants: <BlocMontants article={article} onMiseAJour={setArticle} />,
                photos: <PhotosArticle article={article} onMiseAJour={setArticle} />,
                annonce: <BlocAnnonce key={article.id} article={article} onMiseAJour={setArticle} />,
                vinted: (
                  <BlocVinted
                    key={`${article.id}:${article.urlVinted}:${article.urlConversation}`}
                    article={article}
                    onMiseAJour={apresChangementStatut}
                  />
                ),
                achat: <InfosAchat article={article} />,
              })}
              <section className="section">
                <button
                  type="button"
                  className="bouton bouton--danger"
                  onClick={() => {
                    void confirmer("Mettre cet article à la corbeille ? Il sera restaurable pendant 30 jours.", {
                      action: "Mettre à la corbeille",
                      danger: true,
                    })
                      .then(async (ok) => {
                        if (!ok) return;
                        await api.delete(`/api/articles/${article.id}`);
                        sansAvertissement.current = true;
                        await naviguer("/articles", { replace: true });
                      })
                      .catch((e: unknown) =>
                        setMessage({
                          type: "erreur",
                          texte: e instanceof Error ? e.message : "Suppression impossible.",
                        }),
                      );
                  }}
                >
                  Supprimer l'article
                </button>
              </section>
            </div>
          )}
        </div>
      </main>
    </ContexteModifications>
  );
}

type Bloc = "montants" | "photos" | "annonce" | "vinted" | "achat";

const TITRES_BLOCS: Record<Bloc, string> = {
  montants: "Montants",
  photos: "Photos",
  annonce: "Annonce",
  vinted: "Vinted",
  achat: "Achat",
};

/**
 * Ordre et ouverture des sections selon le statut (#98), sous « Statut et prochaine étape » (toujours ouvert, en
 * tête). Avant la vente : photos, annonce, Vinted ouverts ; achat et montants repliés. Ensuite : montants ouverts
 * en tête, le reste replié.
 */
function blocsDansLOrdre(statut: Statut, blocs: Record<Bloc, ReactNode>) {
  const avant = AVANT_VENTE.has(statut);
  const ordre: Bloc[] = avant
    ? ["photos", "annonce", "vinted", "achat", "montants"]
    : ["montants", "vinted", "annonce", "photos", "achat"];
  const ouverts = new Set<Bloc>(avant ? ["photos", "annonce", "vinted"] : ["montants"]);
  return ordre.map((b) => (
    <Repli key={b} titre={TITRES_BLOCS[b]} ouvert={ouverts.has(b)}>
      {blocs[b]}
    </Repli>
  ));
}

/** Repliable sur la fiche d'un article existant ; tel quel pour un nouvel article (création inchangée, #98). */
function Facultatif({
  repli,
  titre,
  ouvert,
  children,
}: {
  repli: boolean;
  titre: string;
  ouvert: boolean;
  children: ReactNode;
}) {
  return repli ? (
    <Repli titre={titre} ouvert={ouvert}>
      {children}
    </Repli>
  ) : (
    <>{children}</>
  );
}

/** En-tête de la fiche (#98) : photo, statut, prix affiché et bénéfice, visibles sans défiler. */
function EnteteArticle({ article }: { article: Article }) {
  const photo =
    [...article.photos].sort(
      (a, b) => Number(b.type === "annonce") - Number(a.type === "annonce") || a.ordre - b.ordre,
    )[0] ?? null;
  const c = article.couts;
  return (
    <div className="entete-article">
      {photo ? (
        <img className="entete-article__photo" src={urlVignette(photo.id)} alt="" />
      ) : (
        <span className="entete-article__photo" />
      )}
      <div className="entete-article__infos">
        <span className={`badge badge--${article.statut}`}>{LIBELLES_STATUT[article.statut]}</span>
        <span>
          Prix affiché : <strong>{article.prixAffiche === null ? "—" : formatEuros(article.prixAffiche)}</strong>
        </span>
        <span>
          {c.realise ? "Bénéfice" : "Bénéfice provisoire"} :{" "}
          <strong>
            <Montant centimes={c.benefice} />
          </strong>
          {c.beneficeAttendu !== null && (
            <span className="secondaire">
              {" "}
              (attendu <Montant centimes={c.beneficeAttendu} signe />)
            </span>
          )}
        </span>
      </div>
    </div>
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
