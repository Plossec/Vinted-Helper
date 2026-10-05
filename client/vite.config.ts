import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En développement, les appels /api sont transmis au serveur Node (npm run dev:server).
    proxy: { "/api": "http://localhost:3000" },
  },
});
