import Link from "next/link";
import { ArrowLeft, ArrowRight, Box, Check, GraduationCap, HeartPulse, Info, LayoutDashboard, Lock, MonitorSmartphone, Target } from "lucide-react";
import { BrandLockup } from "./BrandMark";
import { RevealOnScroll } from "./Reveal";
import { SiteFooter } from "./SiteFooter";
import { CountUp } from "./ui/CountUp";
import { LanguageSwitcher } from "./ui/LanguageSwitcher";
import type { AtlasContent } from "../content/types";
import type { Messages } from "../i18n/messages/es-MX";
import { DEVELOPER } from "../lib/brand";

const PILLAR_ICONS = [HeartPulse, GraduationCap, MonitorSmartphone, Lock];

type Props = { m: Messages; content: AtlasContent; signedIn: boolean };

/** Página institucional "Acerca de": misión, principios, cifras y créditos de desarrollo. */
export function AboutPage({ m, content, signedIn }: Props) {
  const a = m.about;
  const stats = [
    content.organs.length,
    content.organs.reduce((total, organ) => total + organ.hotspots.length, 0),
    content.glossary.length,
    content.sections.length,
  ];

  return (
    <div className="landing about-page">
      <RevealOnScroll />
      <header className="landing-nav">
        <Link href="/" className="brand" aria-label={m.brand.home}><BrandLockup tagline={m.brand.tagline} /></Link>
        <nav aria-label={m.nav.sections}>
          <Link href="/">{m.pages.goHome}</Link>
          <Link href="/atlas">{m.footer.atlas}</Link>
          <Link href="/atlas?panel=plans">{m.footer.plans}</Link>
        </nav>
        <div className="landing-nav-actions">
          <LanguageSwitcher />
          {signedIn ? (
            <Link className="btn btn-primary" href="/dashboard"><LayoutDashboard size={16} /> {m.nav.myPanel}</Link>
          ) : (
            <Link className="btn btn-primary" href="/registro">{m.nav.register}</Link>
          )}
        </div>
      </header>

      <main id="main">
        <section className="about-hero">
          <Link className="about-back animate__animated animate__fadeInDown" href="/"><ArrowLeft size={15} /> {m.pages.goHome}</Link>
          <span className="eyebrow animate__animated animate__fadeInDown"><Info size={14} /> {a.eyebrow}</span>
          <h1 className="animate__animated animate__fadeInUp">{a.title}</h1>
          <p className="animate__animated animate__fadeInUp">{a.lead}</p>
        </section>

        <section className="about-mission" data-animate aria-labelledby="mission-title">
          <span className="about-mission-icon"><Target size={22} /></span>
          <div>
            <h2 id="mission-title">{a.missionTitle}</h2>
            <p>{a.missionText}</p>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="pillars-title">
          <header data-animate>
            <h2 id="pillars-title">{a.pillarsTitle}</h2>
          </header>
          <div className="feature-grid about-pillars">
            {a.pillars.map(({ title, text }, index) => {
              const Icon = PILLAR_ICONS[index];
              return (
                <article key={title} data-animate style={{ "--i": index } as React.CSSProperties}>
                  <span className="feature-icon"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section about-numbers" aria-labelledby="numbers-title">
          <header data-animate>
            <h2 id="numbers-title">{a.numbersTitle}</h2>
          </header>
          <div className="stats-strip">
            {stats.map((value, index) => (
              <div key={m.landing.stats[index]} data-animate style={{ "--i": index } as React.CSSProperties}>
                <strong><CountUp value={value} /></strong>
                <span>{m.landing.stats[index]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-builder" data-animate aria-labelledby="builder-title">
          <div className="about-builder-logo">
            <img src={DEVELOPER.logoUrl} alt={m.footer.devhiveAlt} width={128} height={128} loading="lazy" decoding="async" />
          </div>
          <div>
            <span className="eyebrow">{a.builtByEyebrow}</span>
            <h2 id="builder-title">{a.builtByTitle}</h2>
            <p>{a.builtByText}</p>
            <ul>
              {a.builtByPoints.map((point) => (
                <li key={point}><Check size={15} /> {point}</li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="about-disclaimer" data-animate aria-labelledby="disclaimer-title">
          <h2 id="disclaimer-title"><Info size={16} /> {a.disclaimerTitle}</h2>
          <p>{a.disclaimerText}</p>
        </aside>

        <section className="final-cta" data-animate>
          <h2>{a.ctaTitle}</h2>
          <p>{a.ctaText}</p>
          <div className="about-cta-actions">
            <Link className="btn btn-light btn-lg btn-shine" href={signedIn ? "/dashboard" : "/registro"}>
              {signedIn ? a.ctaDashboard : a.ctaPrimary} <ArrowRight size={18} />
            </Link>
            <Link className="btn btn-lg about-cta-ghost" href="/atlas"><Box size={18} /> {a.ctaSecondary}</Link>
          </div>
        </section>
      </main>

      <SiteFooter m={m} signedIn={signedIn} />
    </div>
  );
}
