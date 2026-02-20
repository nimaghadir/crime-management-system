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
        ink: "#0E0E0E",
        smoke: "#1F1F1F",
        paper: "#F4F1EA",
        brass: "#C7A654",
        danger: "#D64545",
      },
      boxShadow: {
        brass: "0 0 25px rgba(199, 166, 84, 0.24)",
      },
      backgroundImage: {
        noir: "radial-gradient(circle at 20% 20%, #2a2a2a 0, #141414 45%, #090909 100%)",
      },
    },
  },
  plugins: [],
};
