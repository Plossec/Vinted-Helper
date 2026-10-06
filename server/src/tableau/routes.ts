// Route du tableau de bord.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { objet } from "../outils/validation.js";
import { tableauDeBord } from "./service.js";

const PARIS = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" });

function entier(valeur: unknown, defaut: number, min: number, max: number, champ: string): number {
  if (valeur === undefined || valeur === "") return defaut;
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < min || n > max) throw erreurSaisie(`${champ} invalide.`);
  return n;
}

export function routesTableau(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/tableau-de-bord", async (requete) => {
    const q = objet(requete.query);
    const [anneeActuelle, moisActuel] = PARIS.format(maintenant()).split("-").map(Number);
    return tableauDeBord(
      base,
      utilisateurDe(requete).id,
      entier(q.annee, anneeActuelle ?? 2026, 2000, 2100, "Année"),
      entier(q.mois, moisActuel ?? 1, 1, 12, "Mois"),
      entier(q.niveau, 3, 1, 4, "Niveau de catégorie"),
    );
  });
}
