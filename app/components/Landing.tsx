import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Box,
  Brain,
  Check,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  Layers,
  Puzzle,
  LayoutDashboard,
  Microscope,
  Route,
  School,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { BrandLockup } from "./BrandMark";
import { RevealOnScroll } from "./Reveal";
import { BodyFigure } from "./game/BodyFigure";
import { SiteFooter } from "./SiteFooter";
import { CountUp } from "./ui/CountUp";
import { LanguageSwitcher } from "./ui/LanguageSwitcher";
import { format } from "../i18n/format";
import type { Messages } from "../i18n/messages/es-MX";
import type { AtlasContent } from "../content/types";
import { PLANS, formatMXN, monthlyEquivalent } from "../lib/plans";
import { ORGAN_TARGETS } from "../lib/game/body-map";
import { GAME_MODES } from "../lib/game/scoring";
import type { OrganId } from "../lib/anatomy-data";
import type { SessionUser } from "../lib/server/auth-store";

const FEATURE_ICONS = [Box, Route, Activity, BookOpenCheck, ClipboardCheck, LayoutDashboard];
const AUDIENCE_ICONS = [GraduationCap, ClipboardCheck, Stethoscope, School];
const HERO_TAG_COLORS = ["#e2614f", "#f2a33b", "#4f7fd1"];
const TEASER_ORGANS: readonly OrganId[] = ["lungs", "heart", "brain", "intestine"];

export function Landing({ user, m, content }: { user: SessionUser | null; m: Messages; content: AtlasContent }) {
  const l = m.landing;
  const featured = PLANS.filter((plan) => plan.id !== "institution");
  const stats = [
    content.organs.length,
    content.organs.reduce((total, organ) => total + organ.hotspots.length, 0),
    content.glossary.length,
    content.sections.length,
  ];

  return (
    <div className="landing">
      <RevealOnScroll />
      <header className="landing-nav">
        <Link href="/" className="brand" aria-label={m.brand.home}><BrandLockup tagline={m.brand.tagline} /></Link>
        <nav aria-label={m.nav.sections}>
          <a href="#plataforma">{m.nav.platform}</a>
          <a href="#para-quien">{m.nav.audience}</a>
          <a href="#planes">{m.nav.plans}</a>
          <a href="#preguntas">{m.nav.faq}</a>
        </nav>
        <div className="landing-nav-actions">
          <LanguageSwitcher />
          {user ? (
            <Link className="btn btn-primary" href="/dashboard"><LayoutDashboard size={16} /> {m.nav.myPanel}</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">{m.nav.login}</Link>
              <Link className="btn btn-primary" href="/registro">{m.nav.register}</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow animate__animated animate__fadeInDown"><HeartPulse size={14} /> {l.eyebrow}</span>
            <h1 className="hero-title">
              {l.titleA} <em>{l.titleEm}</em>.
            </h1>
            <p className="animate__animated animate__fadeInUp hero-lead">{l.lead}</p>
            <div className="hero-actions animate__animated animate__fadeInUp hero-actions-anim">
              <Link className="btn btn-primary btn-lg btn-shine" href={user ? "/dashboard" : "/registro"}>
                {user ? l.ctaContinue : l.ctaStart} <ArrowRight size={18} />
              </Link>
              <Link className="btn btn-outline btn-lg" href="/atlas"><Box size={18} /> {l.ctaAtlas}</Link>
            </div>
            <ul className="hero-trust">
              {l.trust.map((item, index) => (
                <li key={item} className="animate__animated animate__fadeIn" style={{ animationDelay: `${0.8 + index * 0.12}s` }}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-ring" />
            <div className="hero-ring ring-2" />
            <span className="hero-orbit-dot" />
            <img src="/anatomy/heart/organ.webp" alt="" width={520} height={520} className="hero-organ" fetchPriority="high" />
            {l.heroTags.map((tag, index) => (
              <span key={tag.label} className={`hero-tag tag-${index + 1}`}>
                <i style={{ "--c": HERO_TAG_COLORS[index] } as React.CSSProperties} /> {tag.label}<small>{tag.detail}</small>
              </span>
            ))}
            <div className="hero-ecg">
              <span><HeartPulse size={14} /> {l.bpm}</span>
              <svg viewBox="0 0 220 40" preserveAspectRatio="none">
                <path pathLength="1" d="M0 22h40l6-8 6 8h18l5-18 7 34 6-16h16l8-6 8 6h95" />
              </svg>
            </div>
          </div>
        </section>

        <section className="stats-strip" aria-label={l.statsLabel}>
          {stats.map((value, index) => (
            <div key={l.stats[index]} data-animate style={{ "--i": index } as React.CSSProperties}>
              <strong><CountUp value={value} /></strong>
              <span>{l.stats[index]}</span>
            </div>
          ))}
        </section>

        <section className="landing-section" id="plataforma">
          <header data-animate>
            <span className="eyebrow"><Layers size={14} /> {l.platformEyebrow}</span>
            <h2>{l.platformTitle}</h2>
            <p>{l.platformLead}</p>
          </header>
          <div className="feature-grid">
            {l.features.map(({ title, text }, index) => {
              const Icon = FEATURE_ICONS[index];
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

        <section className="game-teaser" aria-labelledby="game-teaser-title" data-animate>
          <div className="game-teaser-copy">
            <span className="eyebrow"><Puzzle size={14} /> {m.game.teaserEyebrow}</span>
            <h2 id="game-teaser-title">{m.game.teaserTitle}</h2>
            <p>{m.game.teaserText}</p>
            <ul className="game-teaser-modes">
              {GAME_MODES.map((mode) => (
                <li key={mode}><Check size={14} /> {m.game.modes[mode].name}</li>
              ))}
            </ul>
            <Link className="btn btn-primary btn-lg btn-shine" href="/juego">{m.game.teaserCta} <ArrowRight size={18} /></Link>
          </div>
          <Link href="/juego" className="game-teaser-visual" aria-label={m.game.teaserCta}>
            <BodyFigure
              showGuides
              title={m.game.stage}
              idPrefix="teaser-body"
              sideLabels={{ right: m.game.rightShort, left: m.game.leftShort, rightTitle: m.game.patientRight, leftTitle: m.game.patientLeft }}
            />
            {TEASER_ORGANS.map((id, index) => {
              const target = ORGAN_TARGETS.anterior[id]!;
              const anchor = target.anchors[0];
              return (
                <img
                  key={id}
                  className="teaser-organ"
                  src={`/anatomy/${id}/thumb.webp`}
                  alt=""
                  width={180}
                  height={180}
                  loading="lazy"
                  style={{ left: `${(anchor.x / 400) * 100}%`, top: `${(anchor.y / 720) * 100}%`, width: `${(target.size / 400) * 100}%`, zIndex: target.layer, "--i": index } as React.CSSProperties}
                />
              );
            })}
            <span className="teaser-drag" aria-hidden="true">
              <img src="/anatomy/liver/thumb.webp" alt="" width={180} height={180} loading="lazy" />
            </span>
          </Link>
        </section>

        <section className="landing-section organ-showcase" aria-labelledby="showcase-title">
          <header data-animate>
            <span className="eyebrow"><Microscope size={14} /> {l.libraryEyebrow}</span>
            <h2 id="showcase-title">{l.libraryTitle}</h2>
          </header>
          <ul className="showcase-grid">
            {content.organs.map((organ, index) => (
              <li key={organ.id} data-animate style={{ "--i": index, "--accent": organ.accent } as React.CSSProperties}>
                <Link href={`/atlas?organ=${organ.id}`}>
                  <img src={`/anatomy/${organ.id}/thumb.webp`} alt="" width={72} height={72} loading="lazy" decoding="async" />
                  <span><b>{organ.name}</b><small>{organ.system}</small></span>
                  {organ.tier === "pro" && <em>{m.common.pro}</em>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section" id="para-quien">
          <header data-animate>
            <span className="eyebrow"><UserRound size={14} /> {l.audienceEyebrow}</span>
            <h2>{l.audienceTitle}</h2>
          </header>
          <div className="audience-grid">
            {l.audiences.map(({ title, text }, index) => {
              const Icon = AUDIENCE_ICONS[index];
              return (
                <article key={title} data-animate style={{ "--i": index } as React.CSSProperties}>
                  <Icon size={22} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section steps-section" aria-labelledby="steps-title">
          <header data-animate>
            <span className="eyebrow"><Brain size={14} /> {l.stepsEyebrow}</span>
            <h2 id="steps-title">{l.stepsTitle}</h2>
          </header>
          <ol className="steps">
            {l.steps.map((step, index) => (
              <li key={step.title} data-animate style={{ "--i": index } as React.CSSProperties}>
                <span>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" id="planes">
          <header data-animate>
            <span className="eyebrow"><ShieldCheck size={14} /> {l.plansEyebrow}</span>
            <h2>{l.plansTitle}</h2>
            <p>{l.plansLead}</p>
          </header>
          <div className="landing-plans">
            {featured.map((plan, index) => {
              const copy = m.plans.catalog[plan.id];
              return (
                <article key={plan.id} className={plan.highlight ? "highlight" : ""} data-animate style={{ "--i": index } as React.CSSProperties}>
                  {plan.highlight && <span className="plan-ribbon">{m.plans.ribbon}</span>}
                  <b>{copy.name}</b>
                  <small>{copy.tagline}</small>
                  <strong>{formatMXN(monthlyEquivalent(plan.id, "annual"))}<small> {m.plans.perMonth}</small></strong>
                  <ul>
                    {copy.perks.map((perk) => <li key={perk}><Check size={14} /> {perk}</li>)}
                  </ul>
                  <Link className={`btn ${plan.highlight ? "btn-primary btn-shine" : "btn-outline"}`} href={user ? "/atlas?panel=plans" : "/registro"}>
                    {plan.monthlyPrice === 0 ? l.startFree : format(m.plans.choose, { name: copy.name })}
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="landing-note" data-animate>{format(l.institutionNote, { price: formatMXN(monthlyEquivalent("institution", "annual")) })}</p>
        </section>

        <section className="landing-section faq" id="preguntas">
          <header data-animate>
            <span className="eyebrow">{l.faqEyebrow}</span>
            <h2>{l.faqTitle}</h2>
          </header>
          <div className="faq-list">
            {l.faq.map((item, index) => (
              <details key={item.q} data-animate style={{ "--i": index } as React.CSSProperties}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta" data-animate>
          <h2>{l.finalTitle}</h2>
          <p>{l.finalLead}</p>
          <Link className="btn btn-light btn-lg btn-shine" href={user ? "/dashboard" : "/registro"}>
            {user ? l.finalCtaUser : l.finalCta} <ArrowRight size={18} />
          </Link>
        </section>
      </main>

      <SiteFooter m={m} signedIn={Boolean(user)} />
    </div>
  );
}
