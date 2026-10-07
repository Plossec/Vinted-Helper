// Fenêtre de l'extension : état, pause / reprise, journal des dernières actions.
const $ = (id) => document.getElementById(id);
const heure = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

async function afficher() {
  const { config = null, etat = {} } = await chrome.storage.local.get(["config", "etat"]);
  const p = $("etat");
  if (!config) {
    p.className = "erreur";
    p.textContent = "Non configurée : ouvrez les Réglages pour saisir l'adresse de l'application et le jeton.";
  } else if (etat.pause) {
    p.className = "erreur";
    p.textContent = `En pause. ${etat.raison ?? ""}`;
  } else {
    p.className = "ok";
    p.textContent =
      etat.prochain && etat.prochain > Date.now()
        ? `Active. Prochaine publication possible après ${heure(new Date(etat.prochain).toISOString())}.`
        : "Active : vérifie les demandes toutes les 5 minutes.";
  }
  $("reprendre").hidden = !config || !etat.pause;
  $("pause").hidden = !config || !!etat.pause;
  $("maintenant").hidden = !config || !!etat.pause;
  const liste = $("journal");
  liste.replaceChildren(
    ...(etat.journal ?? []).slice(0, 10).map((l) => {
      const li = document.createElement("li");
      li.textContent = `${heure(l.date)} — ${l.texte}`;
      return li;
    }),
  );
  if (liste.children.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Rien pour l'instant.";
    liste.append(li);
  }
}

for (const id of ["reprendre", "pause", "maintenant"])
  $(id).addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: id });
    await afficher();
  });
$("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("diagnostic").addEventListener("click", async () => {
  $("etat").className = "";
  $("etat").textContent = "Diagnostic en cours (quelques secondes)…";
  const r = await chrome.runtime.sendMessage({ type: "diagnostic" });
  if (!r.ok) {
    $("etat").className = "erreur";
    $("etat").textContent = r.message;
  }
});
chrome.storage.onChanged.addListener(() => void afficher());
void afficher();
