import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Le domaine est un paquet local consommé en source (une seule implémentation
// des règles, front + serveur — cf. Réf. 3 · T1).
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE", "NEXT_PUBLIC"],
  resolve: {
    alias: { "@domaine": new URL("../../packages/domaine/src", import.meta.url).pathname },
  },
  build: { sourcemap: true },
});
