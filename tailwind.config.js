/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
    "./src/client/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        'arcade': ['"Press Start 2P"', 'Courier New', 'monospace'],
      },
      colors: {
        'arcade-black': '#000000',
        'arcade-white': '#ffffff',
        'arcade-yellow': '#ffff00',
        'arcade-red': '#ff0000',
        'arcade-green': '#00ff00',
        'arcade-gold': '#ffd700',
      },
    },
  },
  plugins: [],
}