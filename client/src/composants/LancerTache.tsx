// « Lancer maintenant » d'une tâche automatisée (#230) : à toute heure, même désactivée ; l'extension fait le travail
// à son prochain passage. Utilisé dans Réglages → Tâches automatiques et dans « À faire ».
import { useState } from "react";
import { api } from "../api.js";

const PROCHAIN_PASSAGE =
  "l'extension s'en charge à son prochain passage (5 minutes au plus, Chrome ouvert), ou tout de suite avec « Vérifier maintenant » dans l'extension.";

export function LancerTache({
  tache,
  libelle,
  onLance,
}: {
  tache: "dormants" | "finalisation";
  libelle: string;
  onLance?: () => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function lancer() {
    setEnvoi(true);
    setMessage(null);
    try {
      if (tache === "dormants") {
        const { actions } = await api.post<{ actions: number }>("/api/taches/dormants/lancer", {});
        setMessage({
          ok: true,
          texte:
            actions === 0
              ? "Aucun article dormant à traiter (ou action déjà prévue)."
              : `${actions} action(s) prévue(s) (à valider dans « À faire » en mode manuel) : ${PROCHAIN_PASSAGE}`,
        });
      } else {
        await api.post("/api/taches/finalisation/lancer", {});
        setMessage({ ok: true, texte: `Lecture du « Porte-monnaie » demandée : ${PROCHAIN_PASSAGE}` });
      }
      onLance?.();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Lancement impossible." });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="lancer-tache">
      <button type="button" className="bouton" disabled={envoi} onClick={() => void lancer()}>
        {envoi ? "Lancement…" : libelle}
      </button>
      {message && (
        <p
          className={message.ok ? "message message--ok" : "message message--erreur"}
          role={message.ok ? "status" : "alert"}
        >
          {message.texte}
        </p>
      )}
    </div>
  );
}
