import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0D0C0F', // фон, теплий майже-чорний
          raised: '#17151C', // картки/поверхні
          line: '#2A2732', // тонкі роздільники
        },
        gold: {
          DEFAULT: '#C9A662', // приглушене старе золото
          bright: '#E8C878', // hover / активний стан
          dim: '#8A7442',
        },
        paper: {
          DEFAULT: '#F3EFE7', // основний текст, теплий білий
          muted: '#A69C8D', // другорядний текст
        },
        correct: '#7C9473',
        incorrect: '#B5484B',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
