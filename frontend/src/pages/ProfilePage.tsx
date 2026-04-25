import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch, ApiError } from "../lib/api";

type Profile = {
  display_name: string;
  email: string;
  whatsapp_phone: string;
};

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile>({ display_name: "", email: "", whatsapp_phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    apiFetch<Profile>("/api/auth/profile", { token })
      .then(setProfile)
      .catch(() => showToast("Erro ao carregar perfil."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/auth/profile", {
        method: "PUT",
        token,
        json: { display_name: profile.display_name, whatsapp_phone: profile.whatsapp_phone },
      });
      showToast("Perfil atualizado com sucesso.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900">Meu Perfil</h2>
      <p className="mt-1 text-sm text-gray-500">Atualize suas informações pessoais.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="text"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">O e-mail não pode ser alterado.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nome de exibição</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
            <p className="mt-0.5 text-xs text-gray-400">Com DDD e código do país, sem espaços (ex: 5561999999999)</p>
            <input
              type="tel"
              value={profile.whatsapp_phone}
              onChange={(e) => setProfile((p) => ({ ...p, whatsapp_phone: e.target.value.replace(/\D/g, "") }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="5561999999999"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
