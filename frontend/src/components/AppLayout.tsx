import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth, Role } from "../context/AuthContext";
import Icon from "./Icon";

type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { id: "home",       label: "Início",          path: "/",                     icon: "home",     roles: ["admin", "user"] },
  { id: "moneypenny", label: "Moneypenny",       path: "/moneypenny",           icon: "sparkle",  roles: ["admin", "user"] },
  { id: "access",     label: "Gestão de Acesso", path: "/admin/acesso",         icon: "users",    roles: ["admin", "user"] },
  { id: "logs",       label: "Logs",             path: "/admin/logs",           icon: "file",     roles: ["admin"] },
  { id: "monitoring", label: "Monitoramento",    path: "/admin/monitoramento",  icon: "chart",    roles: ["admin"] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visible = NAV_ITEMS.filter((i) => user && i.roles.includes(user.role));

  const initials = user?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("") ?? "?";

  const SidebarContent = () => (
    <>
      <div className="px-3 py-4">
        <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">
          Navegação
        </div>
        <nav className="space-y-0.5">
          {visible.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-brand-soft text-brand-deep"
                    : "text-gray-600 hover:bg-brand-soft hover:text-brand-deep"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-brand-green" />
                  )}
                  <Icon name={item.icon} size={17} strokeWidth={isActive ? 2 : 1.75} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-gray-100 px-3 py-4">
        <nav className="space-y-0.5">
          <NavLink
            to="/perfil"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors ${
                isActive
                  ? "bg-brand-soft text-brand-deep"
                  : "text-gray-600 hover:bg-brand-soft hover:text-brand-deep"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-brand-green" />
                )}
                <Icon name="settings" size={17} strokeWidth={isActive ? 2 : 1.75} />
                <span>Perfil</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="h-16 bg-brand-ink text-white flex items-center px-4 sm:px-6 gap-4 relative z-10 shadow-md">
        {/* Hamburguer mobile */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden h-10 w-10 grid place-items-center rounded-lg hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Icon name="menu" size={20} />
        </button>

        {/* Logo + JARVIS */}
        <div className="flex items-center gap-3">
          <img
            src="/grupo-voetur-branco.svg"
            alt="Grupo Voetur"
            className="block select-none"
            style={{ height: 24, width: "auto" }}
          />
          <span className="w-px h-6 bg-white/15" />
          <div className="leading-none">
            <div className="text-[15px] font-extrabold tracking-[0.2em] inline-flex items-baseline">
              JARVIS
              <sup className="ml-1 text-[8px] font-medium tracking-normal opacity-70">®</sup>
            </div>
            <div className="hidden sm:block text-[10px] text-emerald-300/90 mt-0.5">Sistema interno</div>
          </div>
        </div>

        {/* Barra de busca (decorativa) */}
        <button className="hidden md:flex items-center gap-2 ml-6 h-9 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-emerald-50/70 hover:text-white text-[13px] w-64 lg:w-80 transition-colors">
          <Icon name="search" size={15} />
          <span>Buscar…</span>
          <span className="ml-auto font-mono text-[10px] text-emerald-50/40 border border-white/15 rounded px-1.5 py-0.5">⌘K</span>
        </button>

        <div className="flex-1" />

        {/* Notificações */}
        <button className="relative h-10 w-10 grid place-items-center rounded-lg hover:bg-white/10" aria-label="Notificações">
          <Icon name="bell" size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-mid ring-2 ring-brand-ink" />
        </button>

        {/* Usuário */}
        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="text-right leading-tight">
            <div className="text-[13px] font-semibold">{user?.display_name}</div>
            <div className="mt-0.5 flex items-center justify-end">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                user?.role === "admin"
                  ? "bg-brand-deep text-white"
                  : "bg-transparent border border-white/30 text-white"
              }`}>
                {user?.role === "admin" ? "Admin" : "Colaborador"}
              </span>
            </div>
          </div>
          <Link
            to="/perfil"
            className="h-9 w-9 rounded-full bg-brand-green grid place-items-center text-white font-semibold text-sm hover:bg-brand-deep transition-colors"
          >
            {initials}
          </Link>
        </div>

        {/* Sair */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <Icon name="log-out" size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-56 flex-col border-r border-gray-100 bg-white">
          <SidebarContent />
        </aside>

        {/* Drawer mobile */}
        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="md:hidden fixed top-0 left-0 bottom-0 w-[260px] bg-white border-r border-gray-100 z-50 flex flex-col">
              <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <img src="/grupo-voetur-escuro.svg" alt="Grupo Voetur" className="block select-none" style={{ height: 20, width: "auto" }} />
                  <span className="text-[14px] font-extrabold tracking-[0.2em] text-brand-ink">JARVIS</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-md hover:bg-gray-100"
                  aria-label="Fechar menu"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <SidebarContent />
            </aside>
          </>
        )}

        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
