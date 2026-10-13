// Modifications non enregistrées de la fiche article (issue #99) : chaque bloc signale s'il a une saisie en cours ;
// la fiche avertit avant de quitter l'écran ou de changer de statut.
import { createContext, useContext, useEffect } from "react";

export interface Modifications {
  /** Le bloc `bloc` (libellé lisible, ex. « l'annonce ») a-t-il une saisie non enregistrée ? */
  signaler: (bloc: string, modifie: boolean) => void;
  /** Vrai s'il n'y a rien à perdre ou si l'utilisateur accepte de continuer (`action` : ex. « changer de statut »). */
  confirmerAbandon: (action: string) => boolean;
}

export const ContexteModifications = createContext<Modifications>({
  signaler: () => undefined,
  confirmerAbandon: () => true,
});

export const useModifications = () => useContext(ContexteModifications);

/** Signale l'état du bloc tant qu'il est affiché ; le retire quand il disparaît. */
export function useSignalerModification(bloc: string, modifie: boolean) {
  const { signaler } = useModifications();
  useEffect(() => {
    signaler(bloc, modifie);
    return () => signaler(bloc, false);
  }, [bloc, modifie, signaler]);
}

/** « Modifications non enregistrées (la fiche, l'annonce). Quitter la fiche sans les enregistrer ? » */
export function messageAbandon(blocs: string[], action: string): string {
  return `Modifications non enregistrées (${blocs.join(", ")}). ${action.charAt(0).toUpperCase()}${action.slice(1)} sans les enregistrer ?`;
}
