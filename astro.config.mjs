import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://swageda.ru',
  vite: {
    plugins: [tailwindcss()],
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  // Картинки проксируются через /api-images/* (см. src/pages/api-images/[...slug].ts),
  // поэтому внешние домены в image.domains не нужны.
});
