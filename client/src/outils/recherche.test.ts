import { describe, expect, it } from "vitest";
import type { ResumeArticle } from "../api.js";
import { FILTRES_VIDES, filtrerEtTrier } from "./recherche.js";

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
    expect(f({ statut: "en_ligne" })).toEqual([2, 1]);
    expect(f({ categorie: "hommes/vetements" })).toEqual([1]);
    expect(f({ marqueId: "M" })).toEqual([1]);
    expect(f({ gamme: "vint" })).toEqual([1]);
    expect(f({ lieuId: "L" })).toEqual([2]);
    expect(f({ sortieId: "S" })).toEqual([2]);
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
