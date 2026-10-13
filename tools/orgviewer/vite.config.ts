import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "/ui/" -- orgapi's own routes are rooted at /, so the SPA is served under /ui next to
// them; hash routing means this is the only path any static host needs to serve.
export default defineConfig({
  base: "/ui/",
  plugins: [react()],
  build: {
    outDir: ".dist",
  },
});
