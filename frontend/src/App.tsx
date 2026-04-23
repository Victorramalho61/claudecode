import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-xl border bg-white p-10 shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          React + FastAPI + Supabase
        </h1>
        <p className="mt-3 text-gray-500">
          Backend:{" "}
          <span
            className={
              error
                ? "font-medium text-red-500"
                : health
                  ? "font-medium text-green-600"
                  : "text-gray-400"
            }
          >
            {error ? "erro" : health?.status ?? "conectando..."}
          </span>
        </p>
      </div>
    </main>
  );
}
