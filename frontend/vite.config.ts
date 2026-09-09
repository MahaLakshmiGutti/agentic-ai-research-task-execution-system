import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      // Target the concrete loopback address, not "localhost": on Windows,
      // Node's proxy client can resolve "localhost" to IPv6 (::1), which
      // uvicorn (bound to 127.0.0.1 only) refuses, causing intermittent
      // ECONNREFUSED/500s even though the backend is up. The site itself is
      // still served at http://localhost:5173.
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
