/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#18241c',
          moss: '#2d3a31',
          sage: '#8c9a84',
          lightSage: '#d8e7ce',
          terracotta: '#c27b66',
          bg: '#faf9f5',
          card: '#ffffff',
          stoneBorder: '#e6e2da',
        },
      },
    },
  },
  plugins: [],
};
