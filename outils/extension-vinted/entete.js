// En-tête commun des fenêtres de l'extension : version lue dans le manifeste (#179).
for (const el of document.querySelectorAll("[data-version]"))
  el.textContent = `Version ${chrome.runtime.getManifest().version}`;
