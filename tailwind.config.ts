import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: "#0D5C74", soft: "#E3F0F4", dark: "#0A4658" },
        risk: { low: "#2F7D3A", lowbg: "#E3F2E5", med: "#9A6514", medbg: "#FBF1DC", high: "#C2410C", highbg: "#FCE6D9", ext: "#9B1C1C", extbg: "#F8DADA" },
      },
      fontFamily: { sans: ["IBM Plex Sans", "Segoe UI", "Roboto", "Arial", "sans-serif"], mono: ["IBM Plex Mono", "Consolas", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
