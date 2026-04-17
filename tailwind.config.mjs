/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'lord-bg': '#f5f6f8',
        'lord-card': '#ffffff',
        'lord-green': '#83d395',
        'lord-green-light': '#e9f8ed',
        'lord-green-dark': '#6eb87e',
        'lord-teal': '#407088',
        'lord-teal-dark': '#2c4d5d',
        'lord-text-main': '#1a1d1f',
        'lord-text-muted': '#6f767e',
        'lord-border': '#efefef',
        'lord-orange': '#f6a23c',
        'lord-red': '#ff7b7b',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        'full': '9999px',
      }
    }
  },
  plugins: [],
};
export default config;
