import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import sitePlugin, { buildInputs } from "./scripts/vite-site-plugin.js";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [sitePlugin(root)],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      // One entry per page in site.config.js (also drives sitemap.xml).
      input: buildInputs(root),
    },
  },
});
