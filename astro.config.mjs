import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";

export default defineConfig({
  site: 'https://swageda.ru',
  trailingSlash: 'ignore',
  integrations: [icon(), sitemap({
    serialize(item) {
      // Это на всякий случай принудительно меняет домен, если что-то проскочит
      if (item.url.includes('localhost')) {
        item.url = item.url.replace('http://localhost:4321', 'https://swageda.ru');
      }
      return item;
    },
  })],
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
