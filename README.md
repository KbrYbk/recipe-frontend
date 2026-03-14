# 🍳 Рецепты (Frontend)

Это современное фронтенд-приложение для обмена кулинарными рецептами. Проект построен на **Astro** с использованием **Tailwind CSS**.

## 🛠 Технологический стек
- **Framework:** [Astro](https://astro.build/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Language:** TypeScript/JavaScript

## 🚀 Как запустить проект

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/KbrYbk/recipe-frontend
   cd recipe-frontend
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Запустите сервер разработки:**
   ```bash
   npm run dev
   ```

## 📂 Структура данных
Сейчас проект использует локальные JSON-файлы в `src/data/`.
В будущем здесь будет реализован `fetch` данных с вашего API.

- `src/data/recipes.json` — текущая «база данных» рецептов.

- `src/pages/recipe/[id].astro` — динамический шаблон страницы рецепта.

## 🤝 Взаимодействие
Проект работает по принципу API-first.

- Фронтенд ожидает JSON-структуру с полями:
`id`, `title`, `description`, `time`, `difficulty`, `ingredients`, `instructions`.

- Пожалуйста, при создании API-эндпоинтов ориентируйтесь на эту структуру.
