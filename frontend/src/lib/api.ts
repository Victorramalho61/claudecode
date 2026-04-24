declare const __API_URL__: string;

// Em dev: "" (o proxy do Vite resolve /api → localhost:8000)
// Em produção: "https://seu-backend.railway.app"
const BASE = typeof __API_URL__ !== "undefined" ? __API_URL__ : "";

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
