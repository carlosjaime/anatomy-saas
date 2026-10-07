import Link from "next/link";
import type { ReactNode } from "react";
import { Box, Library, LayoutDashboard, UserRound } from "lucide-react";
import { BrandLockup } from "../BrandMark";
import { LogoutButton } from "./LogoutButton";
import { ROLE_OPTIONS } from "../../lib/validation";
import type { SessionUser } from "../../lib/server/auth-store";

type Section = "dashboard" | "account";

/** Estructura común del área privada: barra lateral y contenido. */
export function DashShell({ user, active, children }: { user: SessionUser; active: Section; children: ReactNode }) {
  const role = ROLE_OPTIONS.find((option) => option.id === user.role)?.label ?? "Profesional de la salud";
  const current = (section: Section) => (active === section ? ({ "aria-current": "page" } as const) : {});
  return (
    <div className="dash">
      <aside className="dash-sidebar" aria-label="Navegación del panel">
        <Link href="/" className="brand" aria-label="Atlas Anatómico, inicio"><BrandLockup compact /></Link>
        <nav>
          <Link href="/dashboard" {...current("dashboard")}><LayoutDashboard size={18} /> <span>Resumen</span></Link>
          <Link href="/atlas"><Box size={18} /> <span>Atlas 3D</span></Link>
          <Link href="/atlas?panel=encyclopedia"><Library size={18} /> <span>Enciclopedia</span></Link>
          <Link href="/cuenta" {...current("account")}><UserRound size={18} /> <span>Mi cuenta</span></Link>
        </nav>
        <div className="dash-user">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div><b>{user.name}</b><small>{role}</small></div>
        </div>
        <LogoutButton className="dash-logout" />
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}
