// Boîtes de dialogue de l'application (#132), à la place de window.confirm / window.prompt : lisibles sur mobile,
// aux couleurs du thème, utilisables au clavier (Échap = annuler) et annoncées aux lecteurs d'écran (<dialog> modal).
// Usage : `if (!(await confirmer("Supprimer ce boost ?", { action: "Supprimer", danger: true }))) return;`
import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lireMontant } from "../outils/montants.js";

interface OptionsConfirmation {
  /** Libellé du bouton de validation (« Confirmer » par défaut). */
  action?: string;
  /** Action destructrice : bouton rouge. */
  danger?: boolean;
}

type Demande =
  | { type: "confirmation"; texte: string; options: OptionsConfirmation; repondre: (ok: boolean) => void }
  | { type: "montant"; texte: string; repondre: (centimes: number | null) => void };

// Une seule boîte à la fois ; une nouvelle demande annule la précédente.
let demande: Demande | null = null;
const abonnes = new Set<() => void>();
function publier(suivante: Demande | null) {
  const precedente = demande;
  demande = suivante;
  if (precedente && precedente !== suivante) {
    if (precedente.type === "confirmation") precedente.repondre(false);
    else precedente.repondre(null);
  }
  abonnes.forEach((f) => f());
}
const sAbonner = (f: () => void) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};

/** Demande une confirmation ; vrai si l'utilisateur valide. */
export function confirmer(texte: string, options: OptionsConfirmation = {}): Promise<boolean> {
  return new Promise((resoudre) => {
    publier({
      type: "confirmation",
      texte,
      options,
      repondre: resoudre,
    });
  });
}

/** Demande un montant en euros (virgule ou point) ; renvoie des centimes, ou null si annulé. */
export function demanderMontant(texte: string): Promise<number | null> {
  return new Promise((resoudre) => {
    publier({ type: "montant", texte, repondre: resoudre });
  });
}

/** À placer une fois dans la page (Disposition) : affiche la demande en cours. */
export function FenetreDialogue() {
  const courante = useSyncExternalStore(sAbonner, () => demande);
  const fenetre = useRef<HTMLDialogElement>(null);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const d = fenetre.current;
    if (!d) return;
    if (courante && !d.open) {
      setSaisie("");
      setErreur(null);
      d.showModal();
    } else if (!courante && d.open) d.close();
  }, [courante]);

  function fermer(reponse: boolean) {
    if (!courante) return;
    const c = courante;
    demande = null;
    abonnes.forEach((f) => f());
    if (c.type === "confirmation") c.repondre(reponse);
    else if (!reponse) c.repondre(null);
  }

  function valider(evenement: FormEvent) {
    evenement.preventDefault();
    if (!courante) return;
    if (courante.type === "confirmation") return fermer(true);
    const montant = lireMontant(saisie);
    if (montant === null || montant === "invalide") return setErreur("Montant invalide (ex. 12,00).");
    const c = courante;
    demande = null;
    abonnes.forEach((f) => f());
    c.repondre(montant);
  }

  const danger = courante?.type === "confirmation" && courante.options.danger === true;
  return (
    <dialog
      ref={fenetre}
      className="dialogue"
      aria-labelledby="dialogue-texte"
      onCancel={(e) => {
        e.preventDefault();
        fermer(false);
      }}
    >
      {courante && (
        <form method="dialog" className="dialogue__corps" onSubmit={valider} noValidate>
          <p id="dialogue-texte" className="dialogue__texte">
            {courante.texte}
          </p>
          {courante.type === "montant" && (
            <label className="champ">
              <span>Montant (€)</span>
              <input
                inputMode="decimal"
                autoFocus
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder="12,00"
                aria-invalid={erreur !== null}
                aria-describedby={erreur ? "dialogue-erreur" : undefined}
              />
            </label>
          )}
          {erreur && (
            <p id="dialogue-erreur" className="message message--erreur" role="alert">
              {erreur}
            </p>
          )}
          <div className="dialogue__actions">
            {/* Action destructrice : le focus va sur « Annuler », pour qu'Entrée ne supprime rien par erreur. */}
            <button type="button" className="bouton" autoFocus={danger} onClick={() => fermer(false)}>
              Annuler
            </button>
            <button
              type="submit"
              className={`bouton ${danger ? "bouton--danger-plein" : "bouton--principal"}`}
              autoFocus={courante.type === "confirmation" && !danger}
            >
              {courante.type === "confirmation" ? (courante.options.action ?? "Confirmer") : "Valider"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
