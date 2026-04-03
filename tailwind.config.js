/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "brand-ink": "#20322B",
        "brand-muted": "#6F7F73",
        "brand-surface": "#F7F9E3",
        "brand-border": "#C9D2BE",
        "brand-accent": "#2A342C",
      },
    },
  },
  plugins: [],
};
