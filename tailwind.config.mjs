import { join } from "path";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        destructive: "#dc2626", // Tailwind red-600
        'destructive-foreground': "#fff", // always white text
      },
    },
  },
  plugins: [],
};
