import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-green': '#0A1F14',
        'accent-gold': '#D4A83A',
        cream: '#F2E8D0',
        'brand-amber': '#C4621A',
      },
      fontFamily: {
        'bebas-neue': 'var(--font-bebas-neue)',
        'cinzel': 'var(--font-cinzel)',
        'dm-sans': 'var(--font-dm-sans)',
      },
      backgroundColor: {
        'dark-green': '#0A1F14',
      },
    },
  },
  plugins: [],
};

export default config;
