// Construction de l'application web (routes de l'API + interface compilée).
import { existsSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

export interface DependancesApp {
  version: string;
  /** Vérifie que la base de données répond. */
  verifierBase: () => Promise<boolean>;
  /** Dossier de l'interface compilée ; absent en développement (Vite sert l'interface). */
  dossierClient?: string;
  journaliser?: boolean;
}

export interface ReponseSante {
  application: "Vinted Helper";
  version: string;
  base: "connectée" | "indisponible";
}

export function creerApp({ version, verifierBase, dossierClient, journaliser = false }: DependancesApp) {
  const app = Fastify({ logger: journaliser });

  app.get("/api/sante", async (): Promise<ReponseSante> => {
    const baseOk = await verifierBase();
    return { application: "Vinted Helper", version, base: baseOk ? "connectée" : "indisponible" };
  });

  if (dossierClient !== undefined && existsSync(dossierClient)) {
    void app.register(fastifyStatic, { root: dossierClient });
    // Application d'une seule page : toute adresse inconnue hors /api renvoie l'interface.
    app.setNotFoundHandler((requete, reponse) => {
      if (requete.url.startsWith("/api/")) {
        return reponse.code(404).send({ erreur: "Adresse inconnue" });
      }
      return reponse.sendFile("index.html");
    });
  }

  return app;
}
