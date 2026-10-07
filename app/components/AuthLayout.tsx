import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, BookOpenCheck, LayoutDashboard, Route } from "lucide-react";
import { BrandLockup } from "./BrandMark";

const BENEFITS = [
  { icon: Route, text: "Recorridos guiados estructura por estructura" },
  { icon: Activity, text: "Fisiología animada: latido, respiración y más" },
  { icon: BookOpenCheck, text: "Enciclopedia con correlación clínica" },
  { icon: LayoutDashboard, text: "Panel con tu progreso y racha de estudio" },
];

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside" aria-hidden="true">
        <Link href="/" className="brand auth-brand" tabIndex={-1}><BrandLockup /></Link>
        <div className="auth-visual">
          <div className="hero-ring" />
          <img src="/anatomy/brain/organ.webp" alt="" width={360} height={360} />
        </div>
        <h2>La anatomía se entiende mejor en tres dimensiones.</h2>
        <ul>
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text}><Icon size={17} /> {text}</li>
          ))}
        </ul>
      </aside>
      <main className="auth-main">
        <Link href="/" className="brand auth-brand-mobile" aria-label="Atlas Anatómico, inicio"><BrandLockup compact /></Link>
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </main>
    </div>
  );
}
