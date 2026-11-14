import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Werba Way, світла ретро-гама: прохолодний папір + фіолет, рожевий і блакитний.
        // Єдине джерело правди — docs/DESIGN_SYSTEM.md. Ті самі значення продубльовані
        // як --ww-* у globals.css і як --nb-* у notebook.css (для вправ).
        // Назви токенів історичні: ink = поверхні, paper = текст, gold = акцент.
        ink: {
          DEFAULT: '#f3f5fc', // фон-«стіл»
          raised: '#ffffff', // картки-аркуші
          soft: '#eef2fb', // другорядні поверхні
          line: '#dde3f3', // тонкі роздільники
          edge: '#c7d0e8', // виразніша межа
        },
        gold: {
          DEFAULT: '#6b46d6', // акцент: текст, рамки, іконки
          bright: '#5433bd', // наведення
          dim: '#6f6a94', // дрібні підписи
          fill: '#e4d9ff', // світла «наліпка» акценту (текст лишається темним)
          fillHover: '#d7c8ff',
          solid: '#7a4fe0', // головна кнопка, білий текст
          solidHover: '#6a3ed6',
        },
        sky: {
          DEFAULT: '#2f9fe0',
          fill: '#d3e9fb',
          line: '#a9d6f4',
        },
        punch: {
          DEFAULT: '#d1397f', // ретро-рожевий: другорядний акцент, виділення
          fill: '#ffdff0',
          line: '#f4b7c5',
        },
        paper: {
          DEFAULT: '#1c2348', // основний текст
          muted: '#5d6689',
          faint: '#6b7494',
        },
        correct: '#0f7a55',
        incorrect: '#cf3a57',
      },
      fontFamily: {
        display: ['var(--font-onest)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-onest)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-literata)', 'Georgia', 'serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        shake: 'shake 0.35s ease',
      },
    },
  },
  plugins: [],
};

export default config;
