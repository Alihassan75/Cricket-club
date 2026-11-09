import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { display: ["Anton", "Impact", "sans-serif"] },
      colors: {
        navy: "#0E2A1F",
        green: "#2F9E5B",
        greenBright: "#3FBE73",
        pitch: "#0E2A1F",
        pitch2: "#143A2A",
        cream: "#F6F1E7",
        ball: "#C8372D",
        gold: "#E0B04C",
        line: "#E4DCCB",
      },
    },
  },
  plugins: [],
};
export default config;
