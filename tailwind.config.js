/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-out': {
          '0%, 100%': { opacity: 0 },
          '10%, 90%': { opacity: 1 },
        },
      },
      animation: {
        'fade-out': 'fade-out 1.5s ease forwards',
      },
    },
  },
  plugins: [],
}