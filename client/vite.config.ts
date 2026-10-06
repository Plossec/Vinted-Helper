import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** Version de l'application : source unique = package.json racine. */
const version = (
  JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "package.json"), "utf8")) as {
    version: string;
  }
).version;

/**
 * Génère le service worker (sw.js) à partir de sw-modele.js : version de l'application et liste des fichiers
 * construits à garder sur le téléphone. Un nouveau fichier à chaque version déclenche « Nouvelle version disponible ».
 */
function serviceWorker(): Plugin {
  return {
    name: "vinted-helper-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const fichiers = Object.keys(bundle)
        .filter((nom) => !nom.endsWith(".map") && nom !== "index.html")
        .map((nom) => `/${nom}`);
      const publics = ["/manifest.webmanifest", "/icone.svg", "/icone-192.png", "/icone-512.png"];
      const modele = readFileSync(resolve(import.meta.dirname, "sw-modele.js"), "utf8");
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: modele
          .replace("__VERSION__", version)
          .replace("__FICHIERS__", JSON.stringify([...fichiers, ...publics])),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  define: { __VERSION_APP__: JSON.stringify(version) },
  server: {
    port: 5173,
    // En développement, les appels /api sont transmis au serveur Node (npm run dev:server).
    proxy: { "/api": "http://localhost:3000" },
  },
});
