// Limiteur en mémoire (un seul serveur, un seul utilisateur) : suffisant et sans dépendance.
// Connexion : 5 échecs en 15 minutes → blocage temporaire. Aussi utilisé pour les appels à Gemini (#135).

export interface OptionsLimiteur {
  /** Nombre d'événements tolérés dans la fenêtre. */
  max: number;
  fenetreMs: number;
}

export const LIMITE_CONNEXION: OptionsLimiteur = { max: 5, fenetreMs: 15 * 60 * 1000 };

export function creerLimiteur({ max, fenetreMs }: OptionsLimiteur = LIMITE_CONNEXION) {
  const evenements = new Map<string, number[]>();

  const recents = (cle: string, maintenant: number) =>
    (evenements.get(cle) ?? []).filter((instant) => maintenant - instant < fenetreMs);

  /** Retire les clés dont tous les événements sont sortis de la fenêtre (la Map ne grossit pas indéfiniment). */
  function purger(maintenant: number) {
    for (const [cle, liste] of evenements) {
      if (liste.every((instant) => maintenant - instant >= fenetreMs)) evenements.delete(cle);
    }
  }

  return {
    estBloque(cle: string, maintenant: number): boolean {
      return recents(cle, maintenant).length >= max;
    },
    /** Note un événement (échec de connexion, appel à l'IA…). */
    noterEchec(cle: string, maintenant: number): void {
      purger(maintenant);
      evenements.set(cle, [...recents(cle, maintenant), maintenant]);
    },
    effacer(cle: string): void {
      evenements.delete(cle);
    },
    /** Millisecondes avant qu'un nouvel événement soit de nouveau permis (0 si non bloqué). */
    attente(cle: string, maintenant: number): number {
      const liste = recents(cle, maintenant);
      if (liste.length < max) return 0;
      const plusAncien = liste[liste.length - max] ?? maintenant;
      return plusAncien + fenetreMs - maintenant;
    },
    /** Nombre de clés suivies (tests de la purge). */
    taille: () => evenements.size,
  };
}
