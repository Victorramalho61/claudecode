import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-8 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.display_name}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Usuário
            </p>
            <p className="mt-1 font-semibold text-gray-900">{user?.username}</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Email
            </p>
            <p className="mt-1 font-semibold text-gray-900">{user?.email}</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Nome
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {user?.display_name}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
