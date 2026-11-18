// Routes de l'IA : génération d'annonce, prompt à copier, annonce modifiée, lecture d'étiquette.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { lireArticle } from "../articles/service.js";
import { creerLimiteur } from "../compte/limiteur.js";
import { ErreurMetier, erreurSaisie } from "../utilitaires/erreurs.js";
import {
  centimesFacultatif,
  dateObligatoire,
  idDe,
  objet,
  texteFacultatif,
  uuidFacultatif,
  uuidObligatoire,
} from "../utilitaires/validation.js";
import type { StockagePhotos } from "../photos/stockage.js";
import type { ClientIA } from "./gemini.js";
import { genererAnnonce, lireEtiquette, modifierAnnonce, promptAnnonce, PROMPTS_DEFAUT } from "./service.js";
import { analyserEnAttente, creerArticlesParPhotos, regrouperPhotos } from "./articles-par-photos.js";

/** Appels à Gemini par utilisateur et par heure (#135) : préserve le quota gratuit contre une rafale. */
export const LIMITE_IA = { max: 30, fenetreMs: 60 * 60 * 1000 };

/** Analyse des articles créés par photos « en attente » (#276) : toutes les 10 minutes, en plus de la création. */
const INTERVALLE_ANALYSE_MS = 10 * 60_000;

export function routesIA(
  app: FastifyInstance,
  { base, maintenant, utilisateurDe }: ContexteRoutes,
  stockage: StockagePhotos,
  ia: ClientIA,
  /** Analyse en arrière-plan des articles créés par photos (serveur réel ; les tests la lancent eux-mêmes). */
  analyseEnArrierePlan = false,
) {
  const limiteur = creerLimiteur(LIMITE_IA);
  /** Réserve un appel à Gemini dans la limite par heure (même compte que les boutons) ; faux si elle est atteinte. */
  const reserver = (utilisateurId: string) => {
    const instant = maintenant().getTime();
    if (limiteur.attente(utilisateurId, instant) > 0) return false;
    limiteur.noterEchec(utilisateurId, instant);
    return true;
  };
  let analyseEnCours: Promise<unknown> | null = null;
  /** Lance l'analyse des articles en attente, une seule à la fois. */
  const lancerAnalyse = () => {
    if (!analyseEnArrierePlan || analyseEnCours) return;
    analyseEnCours = analyserEnAttente(base, stockage, ia, reserver, maintenant, (m) => app.log.warn(m))
      .catch((e: unknown) => app.log.error(e))
      .finally(() => {
        analyseEnCours = null;
      });
  };
  if (analyseEnArrierePlan) {
    const minuterie = setInterval(lancerAnalyse, INTERVALLE_ANALYSE_MS);
    minuterie.unref();
    app.addHook("onClose", async () => {
      clearInterval(minuterie);
      await analyseEnCours;
    });
    app.addHook("onReady", async () => lancerAnalyse());
  }
  /** Compte un appel à Gemini ; refuse (429) au-delà de la limite, avec le délai d'attente. */
  function compterAppelIA(utilisateurId: string) {
    const instant = maintenant().getTime();
    const attente = limiteur.attente(utilisateurId, instant);
    if (attente > 0) {
      const minutes = Math.max(1, Math.ceil(attente / 60_000));
      throw new ErreurMetier(
        429,
        `Limite de ${LIMITE_IA.max} appels à l'IA par heure atteinte. Réessayez dans ${minutes} min.`,
      );
    }
    limiteur.noterEchec(utilisateurId, instant);
  }

  app.post("/api/articles/:id/annonce/generation", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    compterAppelIA(utilisateurId);
    await genererAnnonce(base, stockage, ia, utilisateurId, id, maintenant());
    return lireArticle(base, utilisateurId, id);
  });

  app.get("/api/articles/:id/annonce/prompt", async (requete) => {
    const { prompt } = await promptAnnonce(base, utilisateurDe(requete).id, idDe(requete.params));
    return { prompt };
  });

  app.put("/api/articles/:id/annonce", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    const c = objet(requete.body);
    await modifierAnnonce(
      base,
      utilisateurId,
      id,
      {
        titre: texteFacultatif(c.titre, "Titre", 100),
        description: texteFacultatif(c.description, "Description", 5000),
      },
      maintenant(),
    );
    return lireArticle(base, utilisateurId, id);
  });

  app.post("/api/etiquette", async (requete) => {
    if (!Buffer.isBuffer(requete.body) || requete.body.length === 0)
      throw erreurSaisie("Photo de l'étiquette manquante.");
    const utilisateurId = utilisateurDe(requete).id;
    compterAppelIA(utilisateurId);
    return lireEtiquette(base, ia, utilisateurId, requete.body);
  });

  // Articles créés à partir de photos (#276, ADR-0117).
  app.post("/api/articles-par-photos/regroupement", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const c = objet(requete.body);
    if (!Array.isArray(c.photoIds)) throw erreurSaisie("Photos : liste attendue.");
    const photoIds = c.photoIds.map((v: unknown) => uuidObligatoire(v, "Photo"));
    compterAppelIA(utilisateurId);
    return { groupes: await regrouperPhotos(base, stockage, ia, utilisateurId, photoIds) };
  });

  app.post("/api/articles-par-photos", async (requete, reponse) => {
    const utilisateurId = utilisateurDe(requete).id;
    const c = objet(requete.body);
    if (!Array.isArray(c.groupes) || !c.groupes.every((g: unknown) => Array.isArray(g)))
      throw erreurSaisie("Articles : liste de groupes de photos attendue.");
    const groupes = (c.groupes as unknown[][]).map((g) => g.map((v) => uuidObligatoire(v, "Photo")));
    const sortieId = uuidFacultatif(c.sortieId, "Sortie");
    const ids = await creerArticlesParPhotos(
      base,
      utilisateurId,
      {
        groupes,
        sortieId,
        lieuId: sortieId === null ? uuidObligatoire(c.lieuId, "Lieu d'achat") : null,
        date: sortieId === null ? dateObligatoire(c.date, "Date d'achat") : "",
        prixTotal: centimesFacultatif(c.prixTotal, "Prix d'achat"),
      },
      maintenant(),
    );
    lancerAnalyse();
    return reponse.code(201).send({ articleIds: ids });
  });

  app.get("/api/prompts/defaut", async (requete) => {
    utilisateurDe(requete);
    return PROMPTS_DEFAUT;
  });
}
