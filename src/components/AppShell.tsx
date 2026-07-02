"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  Gauge,
  Grid3x3,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  UserRound,
  X,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";
import clsx from "clsx";

const MAIN_LINKS = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/tickets",    label: "Tickets",    icon: ClipboardList },
  { href: "/calendar",   label: "Calendario", icon: CalendarDays },
];

const ACCOUNT_LINKS = [
  { href: "/profile", label: "Perfil", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, logout } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const adminLinks = user?.role === "admin"
    ? [
        { href: "/admin/analytics", label: "Analítica KPI", icon: BarChart3 },
        { href: "/admin/metricas-sla", label: "Métricas SLA", icon: Gauge },
        { href: "/technicians",    label: "Técnicos",           icon: UserCog    },
        { href: "/ordenes-trabajo", label: "Órdenes de Trabajo", icon: FolderOpen },
      ]
    : [];

  const allLinks = MAIN_LINKS.concat(adminLinks).concat(ACCOUNT_LINKS);
  const currentLabel = allLinks.find((l) => isActive(l.href))?.label ?? "Dashboard";

  const closeSidebar = () => setMenuOpen(false);

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <div className="logo-badge">
          <Grid3x3 size={12} strokeWidth={1.5} />
          COORDINATECH
        </div>
        <h2>Service Control</h2>
        <p>Gestión operativa en campo</p>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-label">Principal</p>
        {MAIN_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx("nav-item", isActive(href) && "active")} onClick={closeSidebar}>
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}

        {adminLinks.length > 0 && (
          <>
            <p className="nav-section-label" style={{ marginTop: "0.75rem" }}>Administración</p>
            {adminLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={clsx("nav-item", isActive(href) && "active")} onClick={closeSidebar}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </>
        )}

        <p className="nav-section-label" style={{ marginTop: "0.75rem" }}>Cuenta</p>
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx("nav-item", isActive(href) && "active")} onClick={closeSidebar}>
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => { logout(); router.replace("/login"); }}
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="app-grid">
      {/* ── Sidebar desktop ── */}
      <aside className="sidebar sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay backdrop ── */}
      {menuOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* ── Sidebar mobile drawer ── */}
      <aside className={clsx("sidebar sidebar-mobile", menuOpen && "open")}>
        <button
          className="sidebar-close-btn"
          onClick={closeSidebar}
          aria-label="Cerrar menu"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main ── */}
      <main className="main-panel">
        <header className="topbar">
          {/* Hamburger — only mobile */}
          <button
            className="topbar-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-left">
            <p className="page-title">{currentLabel}</p>
            <p className="page-sub topbar-sub-hide">Coordinatech &mdash; {new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}</p>
          </div>
          <div className="topbar-right">
            <div className="topbar-user topbar-user-hide">
              <p className="user-name">{user?.name ?? "Usuario"}</p>
              <p className="user-role">{user?.role === "admin" ? "Administrador" : "Técnico"}</p>
            </div>
            <Avatar name={user?.name ?? "Usuario"} size={36} style={{ border: "2px solid var(--surface)", boxShadow: "var(--shadow-sm)" }} />
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
