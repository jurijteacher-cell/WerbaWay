import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#15130f', // фон — точно як у вправах Werba Way
          raised: '#211f19', // картки
          soft: '#1c1a15', // другорядні поверхні (банки слів тощо)
          line: '#34302a', // тонкі роздільники
        },
        gold: {
          DEFAULT: '#e2b34f',
          bright: '#f0c968',
          dim: '#7a6431',
        },
        paper: {
          DEFAULT: '#f2ede1',
          muted: '#a89d88',
        },
        correct: '#6fae72',
        incorrect: '#b5555a',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
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
