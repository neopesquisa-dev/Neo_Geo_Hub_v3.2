/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        yellow: {
          500: '#CFFF04', /* Neon Yellow Principal */
          600: '#A4CC00', /* Contraste para Texto */
          400: '#DBFF4D', /* Hover */
          900: '#2A3300', /* Fundo profundo */
        },
        fuchsia: {
          500: '#FF00FF',
        },
        cyan: {
          500: '#00FFFF',
        }
      },
      screens: {
        'xs': '380px',
      }
    },
  },
  plugins: [],
}
