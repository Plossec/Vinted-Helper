import { describe, expect, it } from "vitest";
import type { ResumeArticle } from "../api.js";
import {
  FILTRES_PAR_DEFAUT,
  FILTRES_VIDES,
  filtrerEtTrier,
  lireFiltres,
  nombreFiltresActifs,
  STATUTS_PAR_DEFAUT,
} from "./recherche.js";

const article = (reference: number, extra: Partial<ResumeArticle> = {}): ResumeArticle => ({
  id: `a${reference}`,
  reference,
  nom: null,
  statut: "brouillon",
  prixAffiche: null,
  categorie: null,
  marqueId: null,
  marque: null,
  gamme: null,
  taille: null,
  lieuId: null,
  sortieId: null,
  dateAchat: null,
  creeLe: "2026-10-01T10:00:00.000Z",
  dateStatut: "2026-10-01T10:00:00.000Z",
  dateMiseEnLigne: null,
  vignette: null,
  urlVinted: null,
  prixAchat: null,
  benefice: null,
  beneficeRealise: false,
  ...extra,
});
const refs = (liste: ResumeArticle[]) => liste.map((a) => a.reference);

describe("recherche", () => {
  const articles = [
    article(12, { nom: "Maillot OM 127 ans" }),
    article(127, { nom: "Jean Levi's 501", marque: "Levi's" }),
    article(1270, { nom: "Pull" }),
  ];

  it("§8 — « 127 » propose l'article #0127 en premier", () => {
    expect(refs(filtrerEtTrier(articles, { ...FILTRES_VIDES, texte: "127" }, "creation", false))[0]).toBe(127);
    expect(refs(filtrerEtTrier(articles, { ...FILTRES_VIDES, texte: "#0127" }, "creation", false))[0]).toBe(127);
  });

  it("par mots, sans accents ni majuscules, dans le nom, la marque, la catégorie", () => {
    expect(refs(filtrerEtTrier(articles, { ...FILTRES_VIDES, texte: "levi jean" }, "creation", false))).toEqual([127]);
    const cat = [article(1, { categorie: "femmes/vetements/robes" })];
    expect(
      refs(filtrerEtTrier(cat, { ...FILTRES_VIDES, texte: "robes femmes" }, "creation", false, () => "Femmes Robes")),
    ).toEqual([1]);
  });
});

describe("filtres", () => {
  it("statut, catégorie (avec sous-catégories), marque, gamme, lieu, sortie", () => {
    const liste = [
      article(1, {
        statut: "en_ligne",
        categorie: "hommes/vetements/jeans/jeans-slim",
        marqueId: "M",
        gamme: "Vintage",
      }),
      article(2, { statut: "en_ligne", categorie: "femmes/vetements", lieuId: "L", sortieId: "S" }),
      article(3, { statut: "brouillon" }),
    ];
    const f = (extra: object) => refs(filtrerEtTrier(liste, { ...FILTRES_VIDES, ...extra }, "creation", true));
    expect(f({ statuts: ["en_ligne"] })).toEqual([2, 1]);
    expect(f({ categories: ["hommes/vetements"] })).toEqual([1]);
    expect(f({ marqueIds: ["M"] })).toEqual([1]);
    expect(f({ gamme: "vint" })).toEqual([1]);
    expect(f({ lieuIds: ["L"] })).toEqual([2]);
    expect(f({ sortieIds: ["S"] })).toEqual([2]);
  });

  it("choix multiples (#30) : un article est retenu s'il correspond à l'une des valeurs de chaque filtre", () => {
    const liste = [
      article(1, { statut: "en_ligne", categorie: "hommes/jeans", marqueId: "A", lieuId: "L1" }),
      article(2, { statut: "brouillon", categorie: "femmes/robes", marqueId: "B", lieuId: "L2" }),
      article(3, { statut: "finalise", categorie: "enfants", marqueId: null, lieuId: null }),
    ];
    const f = (extra: object) => refs(filtrerEtTrier(liste, { ...FILTRES_VIDES, ...extra }, "creation", true));
    expect(f({ statuts: ["en_ligne", "brouillon"] })).toEqual([2, 1]);
    expect(f({ categories: ["hommes", "femmes"] })).toEqual([2, 1]);
    expect(f({ marqueIds: ["A", "B"], lieuIds: ["L2"] })).toEqual([2]);
    expect(f({ statuts: [] })).toEqual([3, 2, 1]);
  });

  it("par défaut : tous les statuts sauf Finalisé et Sortie du stock", () => {
    const liste = STATUTS_PAR_DEFAUT.map((statut, i) => article(i + 1, { statut })).concat(
      article(10, { statut: "finalise" }),
      article(11, { statut: "sortie_stock" }),
    );
    expect(refs(filtrerEtTrier(liste, FILTRES_PAR_DEFAUT, "reference", true))).toEqual([1, 2, 3, 4, 5]);
    expect(nombreFiltresActifs(FILTRES_PAR_DEFAUT)).toBe(0);
    expect(nombreFiltresActifs({ ...FILTRES_PAR_DEFAUT, statuts: ["en_ligne"], marqueIds: ["A"] })).toBe(2);
  });

  it("relit les filtres mémorisés, et revient au défaut pour l'ancien format", () => {
    expect(lireFiltres({ texte: "x", statut: "en_ligne", categorie: "", marqueId: "" })).toEqual(FILTRES_PAR_DEFAUT);
    const f = { ...FILTRES_VIDES, statuts: ["en_ligne", "inconnu"], marqueIds: ["A"] };
    expect(lireFiltres(f)).toEqual({ ...FILTRES_VIDES, statuts: ["en_ligne"], marqueIds: ["A"] });
  });
});

describe("tris", () => {
  const liste = [
    article(1, { prixAffiche: 900, dateAchat: "2026-09-10", dateMiseEnLigne: "2026-09-12T10:00:00Z" }),
    article(2, { prixAffiche: 300, dateAchat: "2026-09-01", dateStatut: "2026-09-02T10:00:00Z" }),
    article(3, { prixAffiche: null, dateAchat: "2026-09-20", dateMiseEnLigne: "2026-09-21T10:00:00Z" }),
  ];
  const t = (tri: Parameters<typeof filtrerEtTrier>[2], croissant: boolean) =>
    refs(filtrerEtTrier(liste, FILTRES_VIDES, tri, croissant));

  it("prix (sans prix à la fin), date d'achat, mise en ligne, ancienneté dans le statut", () => {
    expect(t("prix", true)).toEqual([2, 1, 3]);
    expect(t("prix", false)).toEqual([1, 2, 3]);
    expect(t("achat", false)).toEqual([3, 1, 2]);
    expect(t("mise_en_ligne", true)).toEqual([1, 3, 2]);
    expect(t("anciennete_statut", true)).toEqual([2, 3, 1]); // égalité : la plus récente référence d'abord
  });
});

describe("tris des colonnes du mode détaillé", () => {
  const articles = [
    article(1, { nom: "Écharpe", statut: "en_ligne", marque: "Zara", lieuId: "L2", prixAchat: 300, benefice: 500 }),
    article(2, { nom: "anorak", statut: "brouillon", marque: null, lieuId: "L1", prixAchat: 100, benefice: -100 }),
    article(3, { nom: "Blouson", statut: "finalise", marque: "Adidas", lieuId: null, prixAchat: 200, benefice: 800 }),
  ];
  const trier = (tri: Parameters<typeof filtrerEtTrier>[2], croissant = true) =>
    refs(
      filtrerEtTrier(articles, FILTRES_VIDES, tri, croissant, undefined, (id) =>
        id === "L1" ? "Vide grenier" : "Braderie",
      ),
    );

  it("trie le texte sans tenir compte des accents ni des majuscules, valeurs vides à la fin", () => {
    expect(trier("nom")).toEqual([2, 3, 1]);
    expect(trier("marque")).toEqual([3, 1, 2]);
    expect(trier("lieu")).toEqual([1, 2, 3]);
  });

  it("trie les statuts dans l'ordre du cycle de vie et les montants", () => {
    expect(trier("statut")).toEqual([2, 1, 3]);
    expect(trier("prix_achat")).toEqual([2, 3, 1]);
    expect(trier("benefice", false)).toEqual([3, 1, 2]);
    expect(trier("reference", false)).toEqual([3, 2, 1]);
  });
});
