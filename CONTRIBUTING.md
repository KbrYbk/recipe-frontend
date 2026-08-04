# Contributing to SwagEda

First off, thank you for considering contributing to SwagEda! It's people like you that make the open-source community such a fantastic place to learn, inspire, and create.

## 🛠 Setup for Local Development

1. **Fork the repo and clone it locally:**

   ```bash
   git clone https://github.com/KbrYbk/recipe-frontend.git
   cd recipe-frontend
   ```

2. **Ensure you are using the correct Node.js version:**
   We use Node.js v22.12.0. If you use `nvm`, you can simply run:

   ```bash
   nvm use
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Environment Variables:**
   Copy the example `.env` file and fill in your keys:

   ```bash
   cp .env.example .env
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

- `chore: update dependencies` (for updating build tasks, package manager configs, etc.)

## 🚀 Pull Request Process

1. Create a new branch from `main` (e.g., `feature/awesome-new-thing` or `fix/annoying-bug`).
2. Make your changes and commit them.
3. Push your branch to GitHub and open a Pull Request against the `main` branch.
4. Ensure your code passes all type checks and builds successfully:
   ```bash
   npm run build
   ```
5. Wait for the review. We will do our best to review your PR as quickly as possible!

---

# Вклад в развитие SwagEda (Для русскоговорящих контрибьюторов)

Спасибо, что хотите помочь сделать SwagEda лучше!

## 🛠 Локальный запуск

1. Склонируйте репозиторий и перейдите в папку проекта.
2. Используйте `nvm use`, чтобы переключиться на нужную версию Node.js (v22.12.0).
3. Установите зависимости: `npm install`.
4. Скопируйте `.env.example` в `.env` и настройте переменные.
5. Запустите сервер: `npm run dev`.

## 🚀 Как отправить Pull Request (PR)

1. Создайте ветку от `main` (например, `feature/new-stars`).
2. Отправьте ветку и создайте Pull Request.
3. Убедитесь, что проект собирается без ошибок (`npm run build`).
