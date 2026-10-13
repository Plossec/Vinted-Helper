// Section repliable de la fiche article (#98) : titre toujours visible, contenu ouvert ou replié selon le statut.
// Le contenu reste affiché dans la page même replié (les saisies en cours ne sont pas perdues).
import type { ReactNode } from "react";

export function Repli({ titre, ouvert, children }: { titre: string; ouvert: boolean; children: ReactNode }) {
  return (
    <details className="repli" open={ouvert}>
      <summary className="repli__titre">
        <h2>{titre}</h2>
      </summary>
      <div className="repli__contenu">{children}</div>
    </details>
  );
}
