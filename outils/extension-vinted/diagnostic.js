// Page du diagnostic (issue #56) : résumé et téléchargement du relevé du formulaire Vinted.
const $ = (id) => document.getElementById(id);

void chrome.storage.local.get("diagnostic").then(({ diagnostic }) => {
  if (!diagnostic) {
    $("resume").textContent = "Aucun diagnostic : cliquez « Diagnostic » dans la fenêtre de l'extension.";
    return;
  }
  const date = new Date(diagnostic.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  $("resume").textContent = diagnostic.erreur
    ? `Relevé automatique du ${date}, à l'étape « ${diagnostic.etape} » : ${diagnostic.erreur}`
    : `Relevé du ${date} : ${diagnostic.elements.length} éléments, ` +
      `${diagnostic.apparusApresClicCategorie?.length ?? 0} apparus après le clic sur la catégorie.`;
  $("champs").replaceChildren(
    ...Object.entries(diagnostic.selecteursTrouves).map(([nom, selecteur]) => {
      const li = document.createElement("li");
      li.textContent = `${nom} : ${selecteur ? "trouvé" : "introuvable"}`;
      li.className = selecteur ? "ok" : "erreur";
      return li;
    }),
  );
  const bouton = $("telecharger");
  bouton.hidden = false;
  bouton.addEventListener("click", () => {
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([JSON.stringify(diagnostic, null, 2)], { type: "application/json" }));
    lien.download = `diagnostic-vinted-${diagnostic.date.slice(0, 19).replace(/[:T]/g, "-")}.json`;
    lien.click();
    URL.revokeObjectURL(lien.href);
  });
});
