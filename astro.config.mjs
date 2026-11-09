import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://swageda.ru",
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
    // Время сборки: нижняя граница Last-Modified страниц (после выкатки шаблона страницы считаются изменёнными).
    define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  env: {
    // access: "secret" — значения НЕ вшиваются в сборку, а читаются в рантайме
    // из process.env (адаптер @astrojs/node). Поэтому одна сборка работает с любым .env.
    schema: {
      API_BASE_URL: envField.string({ context: "server", access: "secret", optional: true, default: "http://127.0.0.1:8000" }),
      IMAGE_BASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      PROJECT_KEY: envField.string({ context: "server", access: "secret", optional: true }),
    },
    validateSecrets: false,
  },
});
