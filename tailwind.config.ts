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
      },
      fontFamily: {
        'bebas-neue': 'var(--font-bebas-neue)',
      },
      backgroundColor: {
        'dark-green': '#0A1F14',
      },
    },
  },
  plugins: [],
};

export default config;
