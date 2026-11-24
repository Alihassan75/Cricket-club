import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { display: ["var(--font-anton)", "Anton", "Impact", "sans-serif"] },
      colors: {
        navy: "#0A0A0A",
        green: "#15803D",
        greenBright: "#4ADE80",
        pitch: "#0A0A0A",
        pitch2: "#161616",
        cream: "#F2F2F2",
        ball: "#16A34A",
        gold: "#D9D9D9",
        line: "#DEDEDE",
      },
    },
  },
  plugins: [],
};
export default config;
