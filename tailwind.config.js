/** @type {import('tailwindcss').Config} */
export default {
  // IMPORTANTE: Esta linha diz ao Tailwind onde procurar suas classes
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nossas cores personalizadas
        glass: "rgba(255, 255, 255, 0.05)",
        glassBorder: "rgba(255, 255, 255, 0.1)",
        neon: "#00f3ff",
        danger: "#ff0055",
        success: "#00ff9d"
      }
    },
  },
  plugins: [],
}