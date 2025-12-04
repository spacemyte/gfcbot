/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        discord: {
          blue: "#5865F2",
          green: "#57F287",
          yellow: "#FEE75C",
          red: "#ED4245",
          bg: "#36393F",
          "bg-light": "#40444B",
        },
      },
    },
  },
  plugins: [],
};
