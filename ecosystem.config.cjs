// pm2: запуск собранного фронтенда из каталога релиза (/var/www/swageda/frontend/releases/<sha>).
// Секреты и адреса бэкенда читаются в рантайме из shared/.env (node --env-file), а не вшиваются в сборку.
module.exports = {
  apps: [
    {
      name: "recipe-frontend",
      script: "./dist/server/entry.mjs",
      cwd: __dirname,
      node_args: "--env-file=/var/www/swageda/frontend/shared/.env",
      env: {
        HOST: "127.0.0.1",
        PORT: "4321",
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
