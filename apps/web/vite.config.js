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
  build: {
    // "hidden" : la carte est PRODUITE (débogage d'un incident réel, Sentry)
    // mais AUCUN fichier livré ne la désigne. Auparavant `true` publiait
    // index.js.map en clair : quiconque ouvrait les outils de développement
    // lisait tout le code source de l'ERP, commentaires compris.
    sourcemap: "hidden",

    // DÉCOUPAGE PAR COQUILLE, pas par écran.
    //
    // Un seul fichier de 1,36 Mo obligeait le chef d'équipe à télécharger la
    // comptabilité, le journal et la vitrine pour ouvrir son chantier. Les
    // écrans arrivent maintenant à la demande (React.lazy dans main.jsx) et les
    // morceaux sont regroupés par NATURE D'USAGE : un déménageur ouvre trois
    // écrans terrain d'affilée, il doit payer un téléchargement, pas trois.
    //
    // Le regroupement se fait par chemin, jamais par nom d'écran : ajouter un
    // écran dans un dossier existant ne demande aucune modification ici.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "socle-react";
            if (id.includes("@supabase")) return "socle-donnees";
            return "socle-tiers";
          }
          if (id.includes("/packages/domaine/")) return "domaine";
          if (id.includes("/ecrans/vitrine/")) return "coquille-vitrine";
          if (/\/ecrans\/(Terrain|TerrainProfil|MesMissions|MaDisponibilite)\.jsx/.test(id))
            return "coquille-terrain";
          if (/\/ecrans\/(EspaceClient|SignatureOffre|Bienvenue)\.jsx/.test(id))
            return "coquille-client";
          if (/\/ecrans\/(Dossier|Devis|Offre|Facture|Releve|Materiel|VenteRapide)\.jsx/.test(id))
            return "coquille-dossier";
          if (/\/ecrans\/(Parametres|Bareme|Cout|Centres|TextesDossiers|Archivage|Carnet|Stockage|Ressources)\.jsx/.test(id))
            return "coquille-reglages";
          return undefined; // un morceau par écran pour tout le reste
        },
      },
    },
  },
});
