import Link from "next/link";
import type { ReactNode } from "react";
import { Box, Library, LayoutDashboard, UserRound } from "lucide-react";
import { BrandLockup } from "../BrandMark";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { LogoutButton } from "./LogoutButton";
import type { Messages } from "../../i18n/messages/es-MX";
import type { SessionUser } from "../../lib/server/auth-store";

type Section = "dashboard" | "account";

export function roleLabel(user: SessionUser, m: Messages): string {
  return m.roles[user.role as keyof Messages["roles"]] ?? m.roles.otro;
}

/** Estructura común del área privada: barra lateral y contenido. */
export function DashShell({ user, active, m, children }: { user: SessionUser; active: Section; m: Messages; children: ReactNode }) {
  const current = (section: Section) => (active === section ? ({ "aria-current": "page" } as const) : {});
  return (
    <div className="dash">
      <aside className="dash-sidebar" aria-label={m.nav.panelNav}>
        <Link href="/" className="brand" aria-label={m.brand.home}><BrandLockup compact /></Link>
        <nav>
          <Link href="/dashboard" {...current("dashboard")}><LayoutDashboard size={18} /> <span>{m.nav.summary}</span></Link>
          <Link href="/atlas"><Box size={18} /> <span>{m.nav.atlas}</span></Link>
          <Link href="/atlas?panel=encyclopedia"><Library size={18} /> <span>{m.nav.encyclopedia}</span></Link>
          <Link href="/cuenta" {...current("account")}><UserRound size={18} /> <span>{m.nav.myAccount}</span></Link>
        </nav>
        <div className="dash-user">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div><b>{user.name}</b><small>{roleLabel(user, m)}</small></div>
        </div>
        <LanguageSwitcher compact className="dash-lang" />
        <LogoutButton className="dash-logout" />
      </aside>
      <main className="dash-main" id="main">{children}</main>
    </div>
  );
}
