import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the Python API runs on :8000; Vite forwards /api to it.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8000" },
  },
});
