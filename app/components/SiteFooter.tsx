import Link from "next/link";
import { ArrowUp, ShieldCheck } from "lucide-react";
import { BrandLockup } from "./BrandMark";
import type { Messages } from "../i18n/messages/es-MX";
import { DEVELOPER } from "../lib/brand";

type Props = {
  m: Messages;
  /** `full`: portada y "Acerca de". `compact`: áreas de trabajo (atlas, panel, auth). */
  variant?: "full" | "compact";
  signedIn?: boolean;
  className?: string;
};

function DevHiveMark({ alt, size }: { alt: string; size: number }) {
  return (
    // Imagen remota fija y pequeña: <img> evita el optimizador (y su lista de
    // dominios) y las dimensiones explícitas impiden saltos de diseño (CLS).
    <img className="devhive-logo" src={DEVELOPER.logoUrl} alt={alt} width={size} height={size} loading="lazy" decoding="async" />
  );
}

function Copyright({ m }: { m: Messages }) {
  return (
    <p className="footer-copyright">
      © {DEVELOPER.copyrightYear} <strong>{DEVELOPER.name}</strong> <span aria-hidden="true">·</span> {m.footer.rights}
    </p>
  );
}

export function SiteFooter({ m, variant = "full", signedIn = false, className = "" }: Props) {
  const f = m.footer;

  if (variant === "compact") {
    return (
      <footer className={`site-footer compact ${className}`} aria-label={f.label}>
        <span className="footer-dev">
          <DevHiveMark alt={f.devhiveAlt} size={28} />
          <Copyright m={m} />
        </span>
        <nav className="footer-compact-links" aria-label={f.company}>
          <Link href="/acerca">{f.about}</Link>
          <Link href="/atlas?panel=plans">{f.plans}</Link>
        </nav>
      </footer>
    );
  }

  return (
    <footer className={`site-footer full ${className}`} aria-label={f.label}>
      <div className="footer-grid">
        <section className="footer-brand" data-animate>
          <Link href="/" aria-label={m.brand.home}><BrandLockup tagline={m.brand.tagline} /></Link>
          <p>{f.tagline}</p>
          <p className="footer-disclaimer"><ShieldCheck size={14} /> {m.landing.footer}</p>
        </section>

        <nav className="footer-col" aria-label={f.product} data-animate style={{ "--i": 1 } as React.CSSProperties}>
          <h2>{f.product}</h2>
          <ul>
            <li><Link href="/atlas">{f.atlas}</Link></li>
            <li><Link href="/atlas?panel=encyclopedia">{f.encyclopedia}</Link></li>
            <li><Link href="/atlas?panel=plans">{f.plans}</Link></li>
            {signedIn && <li><Link href="/dashboard">{f.dashboard}</Link></li>}
          </ul>
        </nav>

        <nav className="footer-col" aria-label={f.company} data-animate style={{ "--i": 2 } as React.CSSProperties}>
          <h2>{f.company}</h2>
          <ul>
            <li><Link href="/acerca">{f.about}</Link></li>
            {signedIn ? (
              <li><Link href="/cuenta">{m.nav.myAccount}</Link></li>
            ) : (
              <>
                <li><Link href="/login">{m.nav.login}</Link></li>
                <li><Link href="/registro">{m.nav.register}</Link></li>
              </>
            )}
          </ul>
        </nav>

        <section className="footer-dev-card" data-animate style={{ "--i": 3 } as React.CSSProperties}>
          <small>{f.developedBy}</small>
          <div>
            <DevHiveMark alt={f.devhiveAlt} size={52} />
            <span>
              <strong>{DEVELOPER.name}</strong>
              <em>{f.devhiveTagline}</em>
            </span>
          </div>
        </section>
      </div>

      <div className="footer-bottom">
        <Copyright m={m} />
        <a className="footer-top" href="#top"><ArrowUp size={14} /> {f.backToTop}</a>
      </div>
    </footer>
  );
}
