// Ralentit les essais de mot de passe : 5 échecs en 15 minutes → blocage temporaire.
// En mémoire (un seul serveur, un seul utilisateur) : suffisant et sans dépendance.
const ECHECS_MAX = 5;
const FENETRE_MS = 15 * 60 * 1000;

export function creerLimiteur() {
  const echecs = new Map<string, number[]>();

  const recents = (cle: string, maintenant: number) =>
    (echecs.get(cle) ?? []).filter((instant) => maintenant - instant < FENETRE_MS);

  return {
    estBloque(cle: string, maintenant: number): boolean {
      return recents(cle, maintenant).length >= ECHECS_MAX;
    },
    noterEchec(cle: string, maintenant: number): void {
      echecs.set(cle, [...recents(cle, maintenant), maintenant]);
    },
    effacer(cle: string): void {
      echecs.delete(cle);
    },
  };
}
