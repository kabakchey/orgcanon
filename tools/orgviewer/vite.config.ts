import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// base: "/ui/" -- deployed under /ui on the same host as orgapi's /api; hash routing means
// this is the only path any static host needs to serve.
export default defineConfig({
  base: "/ui/",
  plugins: [tsconfigPaths(), react()],
  build: {
    outDir: ".dist",
  },
});
