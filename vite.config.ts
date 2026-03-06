// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import packageJson from "./package.json" with { type: "json" }

export default defineConfig({
  base: "/code/",
  plugins: [
    tailwindcss(),
  ],
  define: {
    "import.meta.env.VERSION": JSON.stringify(packageJson.version),
  },
});