# 🍳 SwagEda — Modern Recipe Portal

<p align="center">
  <a href="README.ru.md">🇷🇺 Русская версия</a> | <b>🇺🇸 English Version</b>
</p>

<p align="center">✨ <a href="https://swageda.ru/">Live Demo</a></p>

[![Astro](https://img.shields.io/badge/Astro-6.0+-FF5D01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Performance](https://img.shields.io/badge/Performance-100-success?style=for-the-badge)](https://pagespeed.web.dev/)

**SwagEda** is a high-performance, production-grade recipe aggregator and portal built with a focus on speed, accessibility, and modern frontend engineering. It serves as a showcase for building scalable, SEO-friendly content platforms using **Astro 6** and **Tailwind CSS 4**.

---

## ✨ Key Features

- **🚀 Extreme Performance:** Near-instant page loads using Astro's Zero-JS by default architecture.
- **🔍 Advanced Search & Discovery:** Real-time filtering by category, difficulty, and keyword across 31,000+ recipes.
- **🌗 Smart Theme System:** Persistence-ready Dark/Light mode with system preference detection.
- **⚡ Interaction:** Integrated like system and star ratings with backend synchronization and IP-based rate limiting.
- **📝 Smart Ingredients:** Interactive checklist for ingredients with local persistence and "Copy to Clipboard" functionality.
- **📹 Multimedia Support:** Integrated YouTube player with "Text/Video" tab switching for better UX.
- **🖨️ Print Optimized:** Custom CSS media queries specifically for high-quality recipe printing (removes UI clutter, optimizes layout).
- **📸 Image Proxying:** Built-in SSR image proxy to handle external assets securely and efficiently.

---

## 🛠 Tech Stack

- **Framework:** [Astro 6.0](https://astro.build/) (Hybrid Rendering: Static + SSR)
- **Styling:** [Tailwind CSS 4.0](https://tailwindcss.com/) (Using the new `@theme` engine)
- **Language:** TypeScript (Strict Mode)
- **Icons:** [Iconify](https://iconify.design/) via `astro-icon`
- **Animations:** View Transitions API for seamless "SPA-like" navigation
- **Deployment:** Optimized for Netlify / Node.js environments

---

## 🏗 Architecture Decisions

### 1. Hybrid Rendering Strategy
Utilize Astro's hybrid rendering. Static pages (About, Privacy) are pre-rendered, while dynamic routes (Recipe details, Search) leverage SSR to provide up-to-date content from the backend API while maintaining excellent SEO.

### 2. API Proxy & Security
A custom middleware layer handles sitemap proxying and API request signing. This protects sensitive API keys and prevents CORS issues while allowing the frontend to communicate securely with the backend.

### 3. Progressive Enhancement
Interactions like ingredient checkboxes and theme toggles are built with vanilla JS/TypeScript, ensuring the site remains functional even if complex scripts fail to load. Follow the "Islands Architecture" to minimize the main thread load.

---

## 🚀 Performance Optimization

- **Zero-JS Foundation:** The core content is delivered as pure HTML. JavaScript is only hydrated for interactive "islands".
- **Image Optimization:** Extensive use of `astro:assets` and specialized SSR proxies for remote images to ensure optimal format (WebP/AVIF) and sizing.
- **Font Loading:** Self-hosted / Preconnected Google Fonts with `font-display: swap` to eliminate FOIT.
- **View Transitions:** Optimized navigation that re-uses DOM elements, reducing the perceived load time to near zero.

---

## ♿ Accessibility (A11y)

- **Semantic HTML:** Strict adherence to HTML5 landmarks (`<main>`, `<nav>`, `<article>`, `<aside>`).
- **ARIA Standards:** Proper use of `aria-live`, `aria-expanded`, and `role` attributes for dynamic components (modals, tabs, search).
- **Keyboard Navigation:** High-visibility focus rings and "Skip to Content" links for power users and screen readers.
- **Color Contrast:** AA/AAA compliant color palettes in both light and dark modes.

---

## 🔍 SEO & Semantic Web

- **JSON-LD Schema:** Every recipe page includes full `Recipe` and `BreadcrumbList` schema for Rich Snippets in Google Search.
- **OpenGraph & Twitter Cards:** Automated meta-tag generation for beautiful social sharing.
- **Canonical Routing:** Strict canonical URL management to prevent duplicate content issues.
- **Dynamic Sitemap:** Auto-generated sitemaps proxied from the backend to ensure 100% indexability of all 31k+ recipes.

---

## 📂 Project Structure

```text
src/
├── components/     # Atomic UI components (RecipeCard, SearchBar, etc.)
├── layouts/        # Base layout with Meta/SEO/Theme logic
├── lib/            # Shared utilities and API client
├── pages/          # File-based routing (Static & SSR)
├── styles/         # Global Tailwind v4 configuration
├── types/          # TypeScript interfaces for data models
└── data/           # Local fallback data and constants
```

---

## ⚙️ Installation & Development

### Prerequisites
- Node.js `^22.12.0` (as defined in `package.json`)
- npm / pnpm / yarn

### Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/recipe-frontend.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📊 Lighthouse Score

We aim for perfection. Our current architecture consistently hits the following marks:

| Category | Score |
| :--- | :--- |
| **Performance** | ⚡ 98+ |
| **Accessibility** | ♿ 100 |
| **Best Practices** | ✅ 100 |
| **SEO** | 🔍 100 |

---

## 🖼 Screenshots

### Home Page
<img src="./img/swageda.ru_.png" alt="SwagEda Home Page featuring popular recipes and search bar" width="800" />

### Recipe Detail Page (Desktop)
<img src="./img/swageda.ru_recipe_local-1.png" alt="Desktop view of a detailed recipe page with ingredients and steps" width="800" />

### Recipe Detail Page (Mobile)
<img src="./img/swageda.ru_recipe_local-1(iPhone 12 Pro).png" alt="Mobile view of a detailed recipe page on an iPhone 12 Pro" width="400" />

## 🔮 Future Improvements

- [ ] **User Collections:** Allow users to save recipes to "Favorites" using browser storage or accounts.
- [ ] **AI-Powered Substitutions:** Integrated suggestions for ingredient alternatives.
- [ ] **Shopping List:** Export selected ingredients directly to popular grocery apps.
- [ ] **Offline Support:** PWA capabilities for accessing recipes in kitchens with poor connectivity.
