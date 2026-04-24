import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  define: {
    // Em produção, VITE_API_URL aponta para o backend no Railway
    // Em dev, o proxy acima cuida do /api
    __API_URL__: JSON.stringify(process.env.VITE_API_URL ?? ""),
  },
});
