import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          low: "#2E7D32",
          moderate: "#F9A825",
          high: "#E65100",
          critical: "#C62828",
        },
      },
    },
  },
  plugins: [],
};

export default config;
