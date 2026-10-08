import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, BookOpenCheck, LayoutDashboard, Route } from "lucide-react";
import { SiteFooter } from "./SiteFooter";
import { BrandLockup } from "./BrandMark";
import { LanguageSwitcher } from "./ui/LanguageSwitcher";
import type { Messages } from "../i18n/messages/es-MX";

const BENEFIT_ICONS = [Route, Activity, BookOpenCheck, LayoutDashboard];

export function AuthLayout({ m, title, subtitle, children, footer }: { m: Messages; title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside" aria-hidden="true">
        <Link href="/" className="brand auth-brand" tabIndex={-1}><BrandLockup tagline={m.brand.tagline} /></Link>
        <div className="auth-visual">
          <div className="hero-ring" />
          <span className="auth-pulse" />
          <img src="/anatomy/brain/organ.webp" alt="" width={360} height={360} />
        </div>
        <h2 className="animate__animated animate__fadeInUp">{m.auth.asideTitle}</h2>
        <ul>
          {m.auth.benefits.map((text, index) => {
            const Icon = BENEFIT_ICONS[index];
            return (
              <li key={text} className="animate__animated animate__fadeInLeft" style={{ animationDelay: `${0.25 + index * 0.1}s` }}>
                <Icon size={17} /> {text}
              </li>
            );
          })}
        </ul>
      </aside>
      <main className="auth-main">
        <div className="auth-topbar">
          <Link href="/" className="brand auth-brand-mobile" aria-label={m.brand.home}><BrandLockup compact /></Link>
          <LanguageSwitcher />
        </div>
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
        <SiteFooter m={m} variant="compact" className="auth-site-footer" />
      </main>
    </div>
  );
}
