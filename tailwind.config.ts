import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // «Кремовий зошит» — ті самі кольори, що у вправах (notebook.css --nb-*).
        // Назви токенів лишилися від темної теми: ink = поверхні, paper = текст.
        ink: {
          DEFAULT: '#efeae0', // фон-«стіл»
          raised: '#fbf9f4', // картки-аркуші
          soft: '#f3eee3', // другорядні поверхні
          line: '#ddd5c2', // тонкі роздільники
        },
        gold: {
          DEFAULT: '#8a5f17', // текст і рамки акценту (контраст ≥4.7 на кремовому)
          bright: '#6e4a0f', // наведення на текст/посилання
          dim: '#74622f', // дрібні підписи
          fill: '#ffe168', // заливка кнопок-«маркер»
          fillHover: '#ffd84a',
        },
        paper: {
          DEFAULT: '#1b2a4a', // основний текст — синє чорнило
          muted: '#52607a',
        },
        correct: '#17704a',
        incorrect: '#b83a27',
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
