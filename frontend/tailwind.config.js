/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // Deep slate for modern dark mode
        surface: 'rgba(30, 41, 59, 0.7)', // Translucent surface for glassmorphism
        primary: '#3b82f6', // Bright blue
        accent: '#8b5cf6', // Vibrant violet
      }
    },
  },
  plugins: [],
}
