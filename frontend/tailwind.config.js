/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
      },
      colors: {
        ink: "#0B071A",
        smoke: "#1A1233",
        paper: "#F2EEFF",
        brass: "#7C3AED",
        danger: "#D64545",
      },
      boxShadow: {
        brass: "0 4px 12px rgba(124, 58, 237, 0.12)",
      },
      backgroundImage: {
        noir: "linear-gradient(165deg, #2D1B58 0%, #1A1233 40%, #120D24 70%, #0B071A 100%)",
      },
    },
  },
  plugins: [],
};
