import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#fef3e2', 100: '#fde4c4', 200: '#fbd49a', 300: '#f8bc65', 400: '#f59e2d', 500: '#e8840d', 600: '#c96808', 700: '#a34d0b', 800: '#843e10', 900: '#6d3512' },
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
