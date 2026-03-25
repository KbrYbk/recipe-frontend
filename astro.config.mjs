import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import netlify from "@astrojs/netlify";

export default defineConfig({
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  output: "server",
  adapter: netlify(),
  // Картинки проксируются через /api-images/* (см. src/pages/api-images/[...slug].ts),
  // поэтому внешние домены в image.domains не нужны.
});