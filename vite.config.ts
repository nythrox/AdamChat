import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/db-ir": path.resolve(
        __dirname,
        "node_modules/@tanstack/db/dist/esm/query/ir.js"
      ),
    },
  },
}));
