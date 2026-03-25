import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import netlify from "@astrojs/netlify";

export default defineConfig({
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    domains: [""], // Разрешаем Astro обрабатывать картинки с этого IP
  },
  output: "server",
  adapter: netlify(),
});