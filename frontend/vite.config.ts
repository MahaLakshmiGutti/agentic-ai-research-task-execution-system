import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      // The backend (see main.py) is launched with `uvicorn --host localhost`
      // specifically so it binds both IPv4 and IPv6 loopback - otherwise
      // Node's proxy client resolving "localhost" to ::1 while uvicorn only
      // listened on 127.0.0.1 caused intermittent ECONNREFUSED/500s.
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
});
