import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";

export default defineConfig({
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    domains: [""], // Разрешаем Astro обрабатывать картинки с этого IP
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});
