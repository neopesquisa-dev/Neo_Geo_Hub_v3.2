/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./**/*.{html,tsx,ts,jsx,js}",
        "!./node_modules/**/*"
    ],
    theme: {
        extend: {
            colors: {
                yellow: {
                    500: '#CFFF04',
                    600: '#A4CC00',
                    400: '#DBFF4D',
                    900: '#2A3300',
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
        }
    },
    plugins: [],
}
