/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cordas: '#fbbf24',
        madeiras: '#34d399',
        metais: '#f87171',
        orgao: '#a78bfa',
      }
    },
  },
  plugins: [],
}