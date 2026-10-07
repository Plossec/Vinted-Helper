// Réglages : adresse de l'application et jeton. L'accès à l'adresse est demandé à Chrome au moment de l'enregistrement.
const $ = (id) => document.getElementById(id);

function message(texte, ok) {
  $("message").textContent = texte;
  $("message").className = ok ? "ok" : "erreur";
}

$("formulaire").addEventListener("submit", async (e) => {
  e.preventDefault();
  let adresse;
  try {
    adresse = new URL($("adresse").value.trim()).origin;
  } catch {
    return message("Adresse invalide (exemple : https://vps-6b2cf0b2.vps.ovh.net).", false);
  }
  const jeton = $("jeton").value.trim();
  if (!jeton) return message("Jeton manquant.", false);
  // Demande faite tout de suite (geste de l'utilisateur) : Chrome affiche sa propre fenêtre d'autorisation.
  const accorde = await chrome.permissions.request({ origins: [`${adresse}/*`] });
  if (!accorde) return message("Chrome n'a pas autorisé l'accès à l'application.", false);
  await chrome.storage.local.set({ config: { adresse, jeton } });
  $("adresse").value = adresse;
  message("Enregistré. Test de la connexion…", true);
  const r = await chrome.runtime.sendMessage({ type: "tester" });
  message(r.message, r.ok);
});

void chrome.storage.local.get("config").then(({ config }) => {
  if (config) {
    $("adresse").value = config.adresse;
    $("jeton").value = config.jeton;
  }
});
