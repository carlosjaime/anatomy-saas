"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  CreditCard,
  FileText,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  Library,
  Lightbulb,
  Lock,
  LogOut,
  Microscope,
  Play,
  Route,
  Search,
  Share2,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  User,
  X,
} from "lucide-react";
import { OrganViewer, type OrganViewerHandle } from "./OrganViewer";
import { BrandLockup } from "./BrandMark";
import { Dialog } from "./Dialog";
import { SiteFooter } from "./SiteFooter";
import { PlansDialog } from "./PlansDialog";
import { Encyclopedia, type EncyclopediaTab } from "./Encyclopedia";
import { AtlasContentProvider, useAtlasContent } from "./atlas/AtlasContent";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { LanguageSwitcher } from "./ui/LanguageSwitcher";
import { flashToast, useToast } from "./ui/Toast";
import { useI18n } from "../i18n/client";
import type { AtlasContent } from "../content/types";
import type { Organ, OrganId } from "../lib/anatomy-data";
import { formatMXN, hasFeature, monthlyEquivalent, type PlanId } from "../lib/plans";
import { logout, trackStudy } from "../lib/client-api";
import type { SessionUser } from "../lib/server/auth-store";

type LearningType = "lesson" | "quiz" | "animation" | "system";
type Overlay = "learning" | "plans" | "encyclopedia" | null;

const FAVORITES_KEY = "atlas-anatomico:favoritos";
const STARTING_PRICE = formatMXN(monthlyEquivalent("student", "monthly"));

/** Lee favoritos persistidos descartando cualquier valor desconocido. */
function parseFavorites(raw: string | null, known: Record<string, unknown>): Set<OrganId> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is OrganId => typeof id === "string" && Object.hasOwn(known, id)) : []);
  } catch {
    return new Set();
  }
}

/**
 * Renders an organ illustration, or its accent glyph for organs that ship as a
 * 3D model without the painted asset set. Keeps every image slot filled instead
 * of leaving a broken `<img>` behind.
 */
function OrganArt({
  organ,
  asset,
  alt,
  size,
}: {
  organ: Organ;
  asset: "thumb" | "organ" | "microscopic" | "compare" | "location";
  alt: string;
  size?: number;
}) {
  if (!organ.illustrated) {
    // An empty alt means a surrounding control already names this, so the
    // glyph should be skipped rather than announced with no label.
    const labelling = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
    return (
      <span className="art-fallback" style={{ "--art-accent": organ.accent } as React.CSSProperties} {...labelling}>
        {organ.icon}
      </span>
    );
  }
  return (
    <img
      key={`${organ.id}-${asset}`}
      src={`/anatomy/${organ.id}/${asset}.webp`}
      alt={alt}
      width={size}
      height={size}
      loading={asset === "thumb" ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

type Props = {
  user: SessionUser | null;
  content: AtlasContent;
  initialOrganId?: OrganId;
  initialOverlay?: "encyclopedia" | "plans" | null;
};

export function AnatomyApp({ content, ...props }: Props) {
  return (
    <AtlasContentProvider content={content}>
      <AtlasWorkspace {...props} />
    </AtlasContentProvider>
  );
}

function AtlasWorkspace({ user, initialOrganId = "heart", initialOverlay = null }: Omit<Props, "content">) {
  const { m, t } = useI18n();
  const toast = useToast();
  const { organs, organById, guides, systems } = useAtlasContent();
  const [organId, setOrganId] = useState<OrganId>(initialOrganId);
  const [autoRotate, setAutoRotate] = useState(true);
  const [physiology, setPhysiology] = useState(true);
  const [compare, setCompare] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(initialOverlay);
  const [learningType, setLearningType] = useState<LearningType>("lesson");
  const [encyclopediaTab, setEncyclopediaTab] = useState<EncyclopediaTab>("articles");
  const [query, setQuery] = useState("");
  // El filtro por sistema se guarda por índice: sobrevive al cambio de idioma.
  const [activeSystem, setActiveSystem] = useState<number | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileLibrary, setMobileLibrary] = useState(false);
  // Siempre lo determina el servidor a partir de la suscripción confirmada.
  const plan: PlanId = user?.plan ?? "free";
  const [favorites, setFavorites] = useState<Set<OrganId>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const viewerHandle = useRef<OrganViewerHandle>(null);
  const prefetched = useRef(new Set<OrganId>());
  const organ = organById[organId];
  const guide = guides[organId];
  const reference = organById[organId === "heart" ? "brain" : "heart"];
  const fullAccess = hasFeature(plan, "allOrgans");
  const locked = organ.tier === "pro" && !fullAccess;
  const planName = m.plans.catalog[plan].name;

  // A one-time read after mount, deliberately outside the initial render: the
  // server has no localStorage, so seeding state from it during render would
  // desync the SSR markup from the client's first paint.
  useEffect(() => {
    // Physiological motion is opt-out for people who asked the OS for less motion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPhysiology(false);
    try {
      setFavorites(parseFavorites(window.localStorage.getItem(FAVORITES_KEY), organById));
    } catch {
      // Private browsing or a disabled storage API — favorites just won't persist.
    }
    // Solo una vez tras montar: los ids de órgano no cambian con el idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Record organ views for signed-in users (the server dedupes repeats).
  useEffect(() => {
    if (user) trackStudy({ organId, kind: "view" });
  }, [user, organId]);

  const signOut = async () => {
    await logout();
    flashToast(m.toasts.loggedOut, "info");
    window.location.assign("/");
  };

  const toggleFavorite = (item: Organ) => {
    const adding = !favorites.has(item.id);
    const next = new Set(favorites);
    if (adding) next.add(item.id);
    else next.delete(item.id);
    setFavorites(next);
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    } catch {
      // Ignore — favorites just won't persist this session.
    }
    toast.show(t(adding ? m.toasts.favoriteAdded : m.toasts.favoriteRemoved, { organ: item.name }), adding ? "success" : "info", 2400);
  };

  const filteredOrgans = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const system = activeSystem === null ? null : systems[activeSystem];
    return organs.filter((item) => {
      if (favoritesOnly && !favorites.has(item.id)) return false;
      if (system && item.system !== system) return false;
      return `${item.name} ${item.system} ${item.scientificName}`.toLowerCase().includes(needle);
    });
  }, [organs, systems, query, activeSystem, favoritesOnly, favorites]);

  // Organ switch: the info panel and learning cards re-enter in sequence.
  const firstSwitch = useRef(true);
  useEffect(() => {
    if (firstSwitch.current) { firstSwitch.current = false; return; }
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (contentRef.current) {
        gsap.fromTo(contentRef.current.querySelectorAll("[data-reveal]"),
          { opacity: 0, y: 12, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, stagger: 0.035, ease: "power2.out", overwrite: true, clearProps: "transform,filter" },
        );
      }
      if (cardsRef.current) {
        gsap.fromTo(cardsRef.current.children,
          { opacity: 0, y: 22, rotateX: -8 },
          { opacity: 1, y: 0, rotateX: 0, duration: 0.6, stagger: 0.06, ease: "power3.out", overwrite: true, clearProps: "transform" },
        );
      }
    });
    return () => media.revert();
  }, [organId, locked]);

  // Close the account menu on outside click or Escape (desktop has no backdrop).
  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  // Close the mobile drawer with Escape as well.
  useEffect(() => {
    if (!mobileLibrary) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileLibrary(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileLibrary]);

  const openEncyclopedia = useCallback((tab: EncyclopediaTab = "articles") => {
    setEncyclopediaTab(tab);
    setMobileLibrary(false);
    setAccountOpen(false);
    setOverlay("encyclopedia");
  }, []);

  // ⌘K / Ctrl+K opens encyclopedia search from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openEncyclopedia("articles");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openEncyclopedia]);

  const selectOrgan = (id: OrganId) => {
    if (organById[id].illustrated) {
      ["organ", "microscopic", "compare", "location"].forEach((asset) => {
        const image = new Image();
        image.src = `/anatomy/${id}/${asset}.webp`;
      });
    }
    setOrganId(id);
    setMobileLibrary(false);
    setCompare(false);
  };

  const goHome = () => {
    setQuery("");
    setActiveSystem(null);
    setFavoritesOnly(false);
    setOverlay(null);
    selectOrgan("heart");
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Warms the model in the HTTP cache while the pointer is still travelling,
  // so the switch usually renders without a visible loading pass.
  const prefetchOrgan = (id: OrganId) => {
    if (id === organId || prefetched.current.has(id)) return;
    prefetched.current.add(id);
    void fetch(organById[id].model, { priority: "low" } as RequestInit).catch(() => {});
  };

  const openLearning = (type: LearningType) => {
    setLearningType(type);
    setOverlay("learning");
  };
  const requestUpgrade = () => setOverlay("plans");
  const closeOverlay = () => setOverlay(null);
  const organLower = organ.name.toLowerCase();

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label={m.brand.home}>
          <BrandLockup tagline={m.brand.tagline} />
        </Link>
        <nav className="main-nav" aria-label={m.nav.main}>
          <button className={overlay !== "encyclopedia" ? "active" : ""} type="button" onClick={goHome}>
            <Compass size={17} /> <span>{m.nav.explore}</span>
          </button>
          <button type="button" className={overlay === "encyclopedia" ? "active" : ""} onClick={() => openEncyclopedia()}>
            <Library size={17} /> <span>{m.nav.encyclopedia}</span>
          </button>
          <button type="button" className="plan-nav-button" onClick={() => setOverlay("plans")}>
            <CreditCard size={17} /> <span>{m.nav.plans}</span>
          </button>
        </nav>
        <button type="button" className="search-box" onClick={() => openEncyclopedia("articles")} aria-label={m.nav.search}>
          <Search size={17} />
          <span>{m.nav.searchPlaceholder}</span>
          <kbd>⌘K</kbd>
        </button>
        <LanguageSwitcher compact className="topbar-lang" />
        <div className="nav-dropdown account-dropdown" ref={accountRef}>
          <button
            type="button"
            className="profile"
            aria-label={m.nav.account}
            aria-haspopup="menu"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            data-testid="account-menu"
          >
            <span>{user ? initials(user.name) : <User size={16} />}</span>
            <ChevronDown size={15} className={accountOpen ? "chevron open" : "chevron"} />
          </button>
          {accountOpen && (
            <div className="dropdown-panel account-panel" role="menu">
              {user ? (
                <>
                  <div className="account-summary">
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                    <span className={`plan-badge ${plan}`}>{t(m.accountMenu.planBadge, { name: planName })}</span>
                  </div>
                  <Link href="/dashboard" role="menuitem" className="dropdown-link">
                    <LayoutDashboard size={15} /> {m.accountMenu.studyPanel}
                  </Link>
                  <button type="button" role="menuitem" onClick={() => { setOverlay("plans"); setAccountOpen(false); }}>
                    <CreditCard size={15} /> {plan === "free" ? m.accountMenu.viewPlans : m.accountMenu.manage}
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); setConfirmLogout(true); }}>
                    <LogOut size={15} /> {m.nav.logout}
                  </button>
                </>
              ) : (
                <>
                  <div className="account-summary">
                    <b>{m.accountMenu.guestTitle}</b>
                    <small>{m.accountMenu.guestText}</small>
                    <span className={`plan-badge ${plan}`}>{t(m.accountMenu.planBadge, { name: planName })}</span>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setOverlay("plans"); setAccountOpen(false); }}>
                    <CreditCard size={15} /> {m.accountMenu.viewPlans}
                  </button>
                  <Link href="/registro?next=/atlas" role="menuitem" className="dropdown-link primary">
                    <GraduationCap size={15} /> {m.accountMenu.createFree}
                  </Link>
                  <Link href="/login?next=/atlas" role="menuitem" className="dropdown-link">
                    <User size={15} /> {m.nav.login}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="workspace">
        <aside className={`organ-library ${mobileLibrary ? "open" : ""}`} data-intro aria-label={m.library.title}>
          <div className="panel-heading">
            <span>{m.library.title}</span>
            <button
              type="button"
              aria-label={m.library.favoritesOnly}
              aria-pressed={favoritesOnly}
              className={favoritesOnly ? "active" : ""}
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              <Star size={17} fill={favoritesOnly ? "currentColor" : "none"} />
            </button>
            <button type="button" aria-label={m.library.close} className="mobile-close" onClick={() => setMobileLibrary(false)}><X size={17} /></button>
          </div>
          <label className="library-search">
            <Search size={15} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m.library.filter}
              aria-label={m.library.filterLabel}
            />
          </label>
          <div className="system-chips" role="group" aria-label={m.library.systems}>
            <button type="button" className={activeSystem === null ? "active" : ""} onClick={() => setActiveSystem(null)}>{m.library.all}</button>
            {systems.map((system, index) => (
              <button
                key={system}
                type="button"
                className={activeSystem === index ? "active" : ""}
                onClick={() => setActiveSystem(activeSystem === index ? null : index)}
              >
                {system}
              </button>
            ))}
          </div>
          <ul className="organ-list">
            {filteredOrgans.length === 0 && <li className="empty-state animate__animated animate__fadeIn">{m.library.empty}</li>}
            {filteredOrgans.map((item, index) => (
              <li
                key={item.id}
                className={`organ-item ${organId === item.id ? "active" : ""}`}
                style={{ "--item-accent": item.accent, "--i": index } as React.CSSProperties}
              >
                <button
                  type="button"
                  className="organ-select"
                  aria-current={organId === item.id ? "true" : undefined}
                  onClick={() => selectOrgan(item.id)}
                  onPointerEnter={() => prefetchOrgan(item.id)}
                  onFocus={() => prefetchOrgan(item.id)}
                  data-testid={`organ-${item.id}`}
                >
                  <span className="organ-glyph">
                    <OrganArt organ={item} asset="thumb" alt="" size={47} />
                    {item.tier === "pro" && !fullAccess && (
                      <span className="tier-badge" aria-label={m.common.proContent}><Lock size={11} /></span>
                    )}
                  </span>
                  <span className="organ-text"><b>{item.name}</b><small>{item.system}</small></span>
                </button>
                <button
                  type="button"
                  className={`favorite-toggle ${favorites.has(item.id) ? "active" : ""}`}
                  aria-label={t(favorites.has(item.id) ? m.library.unsave : m.library.save, { name: item.name })}
                  aria-pressed={favorites.has(item.id)}
                  onClick={() => toggleFavorite(item)}
                >
                  <Star size={14} fill={favorites.has(item.id) ? "currentColor" : "none"} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="view-all" onClick={() => openEncyclopedia("articles")}>
            {m.library.openEncyclopedia} <ArrowRight size={14} />
          </button>
        </aside>

        <div className="viewer-slot" data-intro>
          <OrganViewer
            ref={viewerHandle}
            physiology={physiology}
            onPhysiology={setPhysiology}
            onTourComplete={() => { if (user) trackStudy({ organId, kind: "tour" }); }}
            organ={organ}
            autoRotate={autoRotate}
            onAutoRotate={setAutoRotate}
            compare={compare}
            onCompare={() => setCompare(!compare)}
            locked={locked}
            onLockedAction={requestUpgrade}
          />
        </div>

        <aside className="info-panel" ref={contentRef} data-intro aria-label={t(m.info.panel, { organ: organ.name })}>
          {locked ? (
            <ProPaywall organ={organ} onUpgrade={requestUpgrade} />
          ) : (
            <>
              <div className="info-lead">
                <div className="info-kicker" data-reveal><Heart size={13} fill="currentColor" className="kicker-heart" /> {organ.system}</div>
                <div className="info-title-row" data-reveal>
                  <div><h1>{organ.name}</h1><em>{organ.poetic}</em></div>
                  <span className="specimen-stamp">
                    <OrganArt organ={organ} asset="organ" alt={t(m.info.illustration, { organ: organLower })} size={92} />
                  </span>
                </div>
                <p className="description" data-reveal>{organ.description}</p>
                <div className="info-cta-row" data-reveal>
                  <button type="button" className="tour-cta" onClick={() => viewerHandle.current?.startTour()} data-testid="tour-cta">
                    <Route size={15} /> {m.viewer.tour}
                  </button>
                  <button type="button" className="ency-link" onClick={() => openEncyclopedia("articles")}>
                    <BookOpen size={14} /> {m.info.fullArticle} <ArrowRight size={13} />
                  </button>
                </div>
                <section className="study-guide" data-reveal aria-labelledby="objectives-title">
                  <h2 id="objectives-title"><Target size={13} /> {m.info.objectives}</h2>
                  <ol>
                    {guide.objectives.map((objective) => <li key={objective}>{objective}</li>)}
                  </ol>
                </section>
              </div>
              <div className="info-body">
                <h2 data-reveal>{m.info.keyFacts}</h2>
                <dl className="key-facts">
                  <div data-reveal><dt><span>◇</span> {m.info.size}</dt><dd>{organ.size}</dd></div>
                  <div data-reveal><dt><span>♙</span> {m.info.weight}</dt><dd>{organ.weight}</dd></div>
                  <div data-reveal><dt><span>⌁</span> {m.info.daily}</dt><dd>{organ.dailyFact}</dd></div>
                  <div data-reveal><dt><span>⌖</span> {m.info.location}</dt><dd>{organ.location}</dd></div>
                  <div data-reveal><dt><span>❋</span> {m.info.bloodSupply}</dt><dd>{organ.bloodSupply}</dd></div>
                  <div data-reveal><dt><span>◈</span> {m.info.function}</dt><dd>{organ.function}</dd></div>
                </dl>
                <div className="medical-note" data-reveal><Stethoscope size={16} /><p><b>{m.info.medical}</b>{organ.medical}</p></div>
                <section className="high-yield" data-reveal aria-labelledby="high-yield-title">
                  <h2 id="high-yield-title"><Lightbulb size={13} /> {m.info.highYield}</h2>
                  <ul>
                    {guide.highYield.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                </section>
                <div className="fun-note" data-reveal><Sparkles size={15} /><p><b>{m.info.didYouKnow}</b>{organ.funFact}</p></div>
                <button type="button" className="lesson-button" data-reveal onClick={() => openLearning("lesson")}>{m.info.viewLesson} <ArrowRight size={16} /></button>
                <div className="action-grid" data-reveal>
                  <button type="button" onClick={() => openLearning("animation")}><Play size={15} /> {m.info.animate}</button>
                  <button type="button" onClick={() => openLearning("quiz")} data-testid="quiz-open"><CircleHelp size={15} /> {m.info.quiz}</button>
                  <button type="button" onClick={() => setCompare(!compare)} className={compare ? "active" : ""} aria-pressed={compare}><Share2 size={15} /> {m.info.compare}</button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {compare && !locked && (
        <section className="compare-strip" aria-label={m.compare.region}>
          <div className="compare-organ"><OrganArt organ={organ} asset="thumb" alt="" /><span>{m.compare.comparing}</span><strong>{organ.name}</strong><small>{organ.system}</small></div>
          <b>vs.</b>
          <div className="compare-organ"><OrganArt organ={reference} asset="thumb" alt="" /><span>{m.compare.reference}</span><strong>{reference.name}</strong><small>{reference.system}</small></div>
          <dl><div><dt>{m.compare.mainFunction}</dt><dd>{organ.function}</dd></div><div><dt>{m.compare.scale}</dt><dd>{organ.size}</dd></div></dl>
          <button type="button" onClick={() => setCompare(false)} aria-label={m.compare.close}><X size={16} /></button>
        </section>
      )}

      {locked ? (
        <section className="learning-cards locked-cards" ref={cardsRef} data-intro aria-label={t(m.cards.proFeatures, { organ: organ.name })}>
          <ProFeatureTeaser icon={<Microscope size={18} />} label={m.cards.microscopic} />
          <ProFeatureTeaser icon={<Share2 size={18} />} label={m.cards.organComparison} />
          <ProFeatureTeaser icon={<Play size={18} />} label={m.cards.functionAnimation} />
          <ProFeatureTeaser icon={<FileText size={18} />} label={m.cards.clinicalNotes} />
          <ProFeatureTeaser icon={<CircleHelp size={18} />} label={m.info.quiz} />
          <button type="button" className="pro-teaser-cta" onClick={requestUpgrade}>
            <Lock size={16} /> {t(m.cards.unlockFrom, { price: STARTING_PRICE })} <ArrowRight size={14} />
          </button>
        </section>
      ) : (
        <section className="learning-cards" ref={cardsRef} data-intro aria-label={t(m.cards.resources, { organ: organ.name })}>
          <article className="curiosity-card pearl-card">
            <span className="pearl-icon"><Stethoscope size={18} /></span>
            <em>{m.cards.pearl}</em>
            <p>{guide.pearl}</p>
            <button type="button" className="curiosity-cta" onClick={() => openEncyclopedia("flashcards")}>
              {m.cards.reviewCards} <ArrowRight size={14} />
            </button>
          </article>
          <article>
            <header><div><em>{m.cards.microscopic}</em><h3>{organ.tissue}</h3></div><Microscope size={17} /></header>
            <div className="microscope-visual organ-card-image"><OrganArt organ={organ} asset="microscopic" alt={t(m.cards.microscopicAlt, { organ: organLower })} /></div>
            <button type="button" onClick={() => openLearning("lesson")}>{m.cards.exploreTissue} <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>{m.cards.compareOrgans}</em><h3>{organ.comparison}</h3></div><Share2 size={17} /></header>
            <div className="comparison-visual organ-card-image"><OrganArt organ={organ} asset="compare" alt={t(m.cards.compareAlt, { comparison: organ.comparison.toLowerCase() })} /></div>
            <button type="button" onClick={() => setCompare(true)}>{m.cards.openCompare} <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>{m.cards.functionAnimation}</em><h3>{organ.function}</h3></div><Play size={17} /></header>
            {/* The artwork itself is the control, so the play badge inside it is
                decorative rather than a nested button. */}
            <button
              type="button"
              className="function-visual organ-card-image"
              onClick={() => openLearning("animation")}
              aria-label={t(m.cards.playAria, { organ: organLower })}
            >
              <OrganArt organ={organ} asset="organ" alt="" />
              <i className="function-pulse" />
              <span className="play-badge"><Play size={18} fill="currentColor" /></span>
            </button>
            <button type="button" onClick={() => openLearning("animation")}>{m.cards.playAnimation} <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>{m.cards.clinicalNotes}</em><h3>{m.cards.conditions}</h3></div><FileText size={17} /></header>
            <ul>{organ.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
            <button type="button" onClick={() => openEncyclopedia("articles")}>{m.cards.readEncyclopedia} <ArrowRight size={14} /></button>
          </article>
          <article className="system-card">
            <header><div><em>{m.cards.whereActs}</em><h3>{organ.system}</h3></div><BrainCircuit size={17} /></header>
            <button
              type="button"
              className="system-visual organ-card-image"
              onClick={() => openLearning("system")}
              aria-label={t(m.cards.whereAria, { organ: organLower })}
            >
              <OrganArt organ={organ} asset="location" alt="" />
            </button>
            <button type="button" onClick={() => openLearning("system")}>{m.cards.viewSystem} <ArrowRight size={14} /></button>
          </article>
        </section>
      )}

      <SiteFooter m={m} variant="compact" className="app-footer" />

      <nav className="mobile-tabbar" aria-label={m.nav.mobile}>
        <button type="button" className={!mobileLibrary && overlay === null ? "active" : ""} onClick={goHome}>
          <Compass size={20} /><span>{m.nav.explore}</span>
        </button>
        <button
          type="button"
          className={mobileLibrary ? "active" : ""}
          aria-expanded={mobileLibrary}
          onClick={() => { setOverlay(null); setMobileLibrary((open) => !open); }}
        >
          <LayoutGrid size={20} /><span>{m.nav.organs}</span>
        </button>
        <button type="button" className={overlay === "encyclopedia" ? "active" : ""} onClick={() => openEncyclopedia()}>
          <Library size={20} /><span>{m.nav.encyclopedia}</span>
        </button>
        <button type="button" className={overlay === "plans" ? "active" : ""} onClick={() => { setMobileLibrary(false); setOverlay("plans"); }}>
          <CreditCard size={20} /><span>{m.nav.plans}</span>
        </button>
      </nav>

      <LearningDialog
        open={overlay === "learning"}
        type={learningType}
        organ={organ}
        onClose={closeOverlay}
        onAnswer={(correct) => {
          if (user) trackStudy({ organId, kind: "quiz", correct });
          if (correct) toast.success(t(m.toasts.quizCorrect, { organ: organ.name }));
          else toast.info(m.toasts.quizIncorrect);
        }}
      />
      <PlansDialog
        open={overlay === "plans"}
        plan={plan}
        onClose={closeOverlay}
        viewer={user ? { trialAvailable: user.trialAvailable, emailVerified: user.emailVerified } : null}
      />
      <Encyclopedia
        open={overlay === "encyclopedia"}
        onClose={closeOverlay}
        organId={organId}
        initialTab={encyclopediaTab}
        plan={plan}
        onUpgrade={requestUpgrade}
        onViewIn3D={(id) => { selectOrgan(id); closeOverlay(); }}
      />
      <ConfirmDialog
        open={confirmLogout}
        title={m.confirm.logoutTitle}
        message={m.confirm.logoutText}
        confirmLabel={m.confirm.logoutConfirm}
        onConfirm={signOut}
        onClose={() => setConfirmLogout(false)}
        icon={<LogOut size={22} />}
      />
      <button
        type="button"
        className={`drawer-backdrop ${mobileLibrary || accountOpen ? "visible" : ""}`}
        aria-hidden={!(mobileLibrary || accountOpen)}
        tabIndex={-1}
        aria-label={m.nav.closePanel}
        onClick={() => { setMobileLibrary(false); setAccountOpen(false); }}
      />
    </main>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ProFeatureTeaser({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="pro-feature-teaser">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ProPaywall({ organ, onUpgrade }: { organ: Organ; onUpgrade: () => void }) {
  const { m, t } = useI18n();
  return (
    <div className="pro-paywall" data-reveal>
      <span className="pro-paywall-icon animate__animated animate__heartBeat"><Lock size={22} /></span>
      <em>{m.common.proContent}</em>
      <h1>{organ.name}</h1>
      <p>{organ.description}</p>
      <ul>
        {m.paywall.perks.map((perk) => <li key={perk}><Check size={14} /> {perk}</li>)}
      </ul>
      <button className="lesson-button" type="button" onClick={onUpgrade}>
        {t(m.paywall.cta, { price: STARTING_PRICE })} <ArrowRight size={16} />
      </button>
      <small>{m.paywall.note}</small>
    </div>
  );
}

const LEARNING_ICON: Record<LearningType, string> = {
  quiz: "?",
  animation: "▶",
  system: "⌖",
  lesson: "✦",
};

type LearningDialogProps = {
  open: boolean;
  type: LearningType;
  organ: Organ;
  onClose: () => void;
  onAnswer: (correct: boolean) => void;
};

function LearningDialog({ open, type, organ, onClose, onAnswer }: LearningDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="modal-title" variant={type === "system" ? "wide" : "center"} className="learning-modal">
      <LearningContent type={type} organ={organ} onClose={onClose} onAnswer={onAnswer} />
    </Dialog>
  );
}

function LearningContent({ type, organ, onClose, onAnswer }: Omit<LearningDialogProps, "open">) {
  const { m, t } = useI18n();
  const l = m.learning;
  const [answer, setAnswer] = useState<number | null>(null);
  const titles: Record<LearningType, string> = {
    quiz: l.quizTitle,
    animation: l.animationTitle,
    system: l.systemTitle,
    lesson: l.lessonTitle,
  };
  const continueButton = <button type="button" className="lesson-button" onClick={onClose}>{l.continue} <ArrowRight size={16} /></button>;
  return (
    <>
      <span className="modal-icon animate__animated animate__bounceIn">{LEARNING_ICON[type]}</span>
      <em>{l.kicker}</em>
      <h2 id="modal-title">{t(titles[type], { organ: organ.name })}</h2>
      {type === "quiz" ? (
        <div className="quiz-options">
          <p>{organ.quiz.question}</p>
          {organ.quiz.options.map((option, index) => {
            const isCorrect = index === organ.quiz.correctIndex;
            const isChosen = answer === index;
            const revealed = answer !== null;
            return (
              <button
                key={index}
                type="button"
                disabled={revealed}
                className={revealed ? (isCorrect ? "correct" : isChosen ? "incorrect" : "") : ""}
                onClick={() => { setAnswer(index); onAnswer(isCorrect); }}
                data-testid={`quiz-option-${index}`}
              >
                {option}
                {revealed && isCorrect && <Check size={15} />}
                {revealed && isChosen && !isCorrect && <X size={15} />}
              </button>
            );
          })}
          {answer !== null && (
            <p className={`quiz-feedback ${answer === organ.quiz.correctIndex ? "correct" : "incorrect"}`} role="status">
              {answer === organ.quiz.correctIndex ? l.correct : l.incorrect}
              {organ.quiz.explanation}
            </p>
          )}
          {answer !== null && continueButton}
        </div>
      ) : type === "system" ? (
        <>
          <p>{t(l.systemIntro, { location: organ.location })}</p>
          <figure className="modal-figure">
            <OrganArt organ={organ} asset="location" alt={t(l.locatedAlt, { organ: organ.name, system: organ.system.toLowerCase() })} />
          </figure>
          <dl className="modal-facts">
            <div><dt>{l.system}</dt><dd>{organ.system}</dd></div>
            <div><dt>{l.mainFunction}</dt><dd>{organ.function}</dd></div>
            <div><dt>{l.bloodSupply}</dt><dd>{organ.bloodSupply}</dd></div>
          </dl>
          {continueButton}
        </>
      ) : type === "lesson" ? (
        <>
          <p>{l.intro}</p>
          <dl className="modal-facts lesson-facts">
            <div><dt>{l.tissue}</dt><dd>{organ.tissue}</dd></div>
            <div><dt>{l.clinicalRelevance}</dt><dd>{organ.medical}</dd></div>
            <div><dt>{l.conditions}</dt><dd>{organ.conditions.slice(0, 3).join(", ")}</dd></div>
          </dl>
          {continueButton}
        </>
      ) : (
        <>
          <p>{l.intro}</p>
          <div className="modal-demo moving"><OrganArt organ={organ} asset="organ" alt={t(l.illustrationAlt, { organ: organ.name.toLowerCase() })} /></div>
          {continueButton}
        </>
      )}
    </>
  );
}
