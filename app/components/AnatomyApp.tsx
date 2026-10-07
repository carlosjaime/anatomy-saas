"use client";

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
  Heart,
  LayoutGrid,
  Library,
  Lock,
  LogOut,
  Microscope,
  Play,
  Search,
  Share2,
  Sparkles,
  Star,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { OrganViewer } from "./OrganViewer";
import { Dialog } from "./Dialog";
import { PlansDialog } from "./PlansDialog";
import { Encyclopedia, type EncyclopediaTab } from "./Encyclopedia";
import { organById, organs, type Organ, type OrganId } from "../lib/anatomy-data";
import { hasFeature, parsePlan, planById, type PlanId } from "../lib/plans";
import type { ChatGPTUser } from "../chatgpt-auth";

type LearningType = "lesson" | "quiz" | "animation" | "system";
type Overlay = "learning" | "plans" | "encyclopedia" | null;

const PLAN_KEY = "atlas-anatomico:plan";
const FAVORITES_KEY = "atlas-anatomico:favoritos";

function isOrganId(value: unknown): value is OrganId {
  return typeof value === "string" && Object.hasOwn(organById, value);
}

/** Lee favoritos persistidos descartando cualquier valor desconocido. */
function parseFavorites(raw: string | null): Set<OrganId> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(isOrganId) : []);
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

const SYSTEMS = Array.from(new Set(organs.map((organ) => organ.system)));

type Props = {
  user: ChatGPTUser | null;
  signInHref: string;
  signOutHref: string;
};

export function AnatomyApp({ user, signInHref, signOutHref }: Props) {
  const [organId, setOrganId] = useState<OrganId>("heart");
  const [autoRotate, setAutoRotate] = useState(true);
  const [compare, setCompare] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [learningType, setLearningType] = useState<LearningType>("lesson");
  const [encyclopediaTab, setEncyclopediaTab] = useState<EncyclopediaTab>("articles");
  const [query, setQuery] = useState("");
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [plan, setPlanState] = useState<PlanId>("free");
  const [favorites, setFavorites] = useState<Set<OrganId>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<OrganId>());
  const organ = organById[organId];
  const reference = organById[organId === "heart" ? "brain" : "heart"];
  const fullAccess = hasFeature(plan, "allOrgans");
  const locked = organ.tier === "pro" && !fullAccess;

  // A one-time read after mount, deliberately outside the initial render: the
  // server has no localStorage, so seeding state from it during render would
  // desync the SSR markup from the client's first paint. This single
  // post-hydration sync is the correct fix for that, not a cascading loop.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlanState(parsePlan(window.localStorage.getItem(PLAN_KEY)));
      setFavorites(parseFavorites(window.localStorage.getItem(FAVORITES_KEY)));
    } catch {
      // Private browsing or a disabled storage API — the app still works,
      // it just won't remember the plan or favorites between visits.
    }
  }, []);

  const setPlan = (next: PlanId) => {
    setPlanState(next);
    try {
      window.localStorage.setItem(PLAN_KEY, next);
    } catch {
      // See the read above — storage may simply be unavailable.
    }
  };

  const toggleFavorite = (id: OrganId) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore — favorites just won't persist this session.
      }
      return next;
    });
  };

  const filteredOrgans = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return organs.filter((item) => {
      if (favoritesOnly && !favorites.has(item.id)) return false;
      if (activeSystem && item.system !== activeSystem) return false;
      return `${item.name} ${item.system} ${item.scientificName}`.toLowerCase().includes(needle);
    });
  }, [query, activeSystem, favoritesOnly, favorites]);

  // Organ switch: the info panel and learning cards re-enter in sequence.
  const firstSwitch = useRef(true);
  useEffect(() => {
    if (firstSwitch.current) { firstSwitch.current = false; return; }
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (contentRef.current) {
        gsap.fromTo(contentRef.current.querySelectorAll("[data-reveal]"),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.035, ease: "power2.out", overwrite: true, clearProps: "transform" },
        );
      }
      if (cardsRef.current) {
        gsap.fromTo(cardsRef.current.children,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: "power3.out", overwrite: true, clearProps: "transform" },
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
  const currentPlan = planById[plan];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={goHome} aria-label="Atlas Anatómico, inicio">
          <strong>Atlas Anatómico<sup>✦</sup></strong>
          <em>Anatomía 3D para profesionales de la salud</em>
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className={overlay !== "encyclopedia" ? "active" : ""} type="button" onClick={goHome}>
            <Compass size={17} /> <span>Explorar</span>
          </button>
          <button type="button" className={overlay === "encyclopedia" ? "active" : ""} onClick={() => openEncyclopedia()}>
            <Library size={17} /> <span>Enciclopedia</span>
          </button>
          <button type="button" className="plan-nav-button" onClick={() => setOverlay("plans")}>
            <CreditCard size={17} /> <span>Planes</span>
          </button>
        </nav>
        <button type="button" className="search-box" onClick={() => openEncyclopedia("articles")} aria-label="Buscar en la enciclopedia">
          <Search size={17} />
          <span>Buscar órganos, estructuras…</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="nav-dropdown account-dropdown" ref={accountRef}>
          <button
            type="button"
            className="profile"
            aria-label="Cuenta"
            aria-haspopup="menu"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
          >
            <span>{user ? initials(user.displayName) : <User size={16} />}</span>
            <ChevronDown size={15} className={accountOpen ? "chevron open" : "chevron"} />
          </button>
          {accountOpen && (
            <div className="dropdown-panel account-panel" role="menu">
              {user ? (
                <>
                  <div className="account-summary">
                    <b>{user.displayName}</b>
                    <small>{user.email}</small>
                    <span className={`plan-badge ${plan}`}>Plan {currentPlan.name}</span>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setOverlay("plans"); setAccountOpen(false); }}>
                    <CreditCard size={15} /> {plan === "free" ? "Ver planes en MXN" : "Gestionar suscripción"}
                  </button>
                  <a href={signOutHref} role="menuitem" className="dropdown-link">
                    <LogOut size={15} /> Cerrar sesión
                  </a>
                </>
              ) : (
                <>
                  <div className="account-summary">
                    <b>Invitado</b>
                    <small>Inicia sesión para guardar tu progreso</small>
                    <span className={`plan-badge ${plan}`}>Plan {currentPlan.name}</span>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setOverlay("plans"); setAccountOpen(false); }}>
                    <CreditCard size={15} /> Ver planes en MXN
                  </button>
                  <a href={signInHref} role="menuitem" className="dropdown-link primary">
                    <User size={15} /> Iniciar sesión
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="workspace">
        <aside
          className={`organ-library ${mobileLibrary ? "open" : ""}`}
          data-intro
          aria-label="Biblioteca de órganos"
        >
          <div className="panel-heading">
            <span>Biblioteca de órganos</span>
            <button
              type="button"
              aria-label="Mostrar solo guardados"
              aria-pressed={favoritesOnly}
              className={favoritesOnly ? "active" : ""}
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              <Star size={17} fill={favoritesOnly ? "currentColor" : "none"} />
            </button>
            <button type="button" aria-label="Cerrar biblioteca" className="mobile-close" onClick={() => setMobileLibrary(false)}><X size={17} /></button>
          </div>
          <label className="library-search">
            <Search size={15} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar órganos…"
              aria-label="Filtrar órganos"
            />
          </label>
          <div className="system-chips" role="group" aria-label="Filtrar por sistema">
            <button type="button" className={!activeSystem ? "active" : ""} onClick={() => setActiveSystem(null)}>Todos</button>
            {SYSTEMS.map((system) => (
              <button
                key={system}
                type="button"
                className={activeSystem === system ? "active" : ""}
                onClick={() => setActiveSystem(activeSystem === system ? null : system)}
              >
                {system}
              </button>
            ))}
          </div>
          <ul className="organ-list">
            {filteredOrgans.length === 0 && (
              <li className="empty-state">No se encontraron órganos con ese criterio.</li>
            )}
            {filteredOrgans.map((item) => (
              <li
                key={item.id}
                className={`organ-item ${organId === item.id ? "active" : ""}`}
                style={{ "--item-accent": item.accent } as React.CSSProperties}
              >
                <button
                  type="button"
                  className="organ-select"
                  aria-current={organId === item.id ? "true" : undefined}
                  onClick={() => selectOrgan(item.id)}
                  onPointerEnter={() => prefetchOrgan(item.id)}
                  onFocus={() => prefetchOrgan(item.id)}
                >
                  <span className="organ-glyph">
                    <OrganArt organ={item} asset="thumb" alt="" size={47} />
                    {item.tier === "pro" && !fullAccess && (
                      <span className="tier-badge" aria-label="Contenido Pro"><Lock size={11} /></span>
                    )}
                  </span>
                  <span className="organ-text"><b>{item.name}</b><small>{item.system}</small></span>
                </button>
                <button
                  type="button"
                  className={`favorite-toggle ${favorites.has(item.id) ? "active" : ""}`}
                  aria-label={favorites.has(item.id) ? `Quitar ${item.name} de guardados` : `Guardar ${item.name}`}
                  aria-pressed={favorites.has(item.id)}
                  onClick={() => toggleFavorite(item.id)}
                >
                  <Star size={14} fill={favorites.has(item.id) ? "currentColor" : "none"} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="view-all" onClick={() => openEncyclopedia("articles")}>
            Abrir la enciclopedia <ArrowRight size={14} />
          </button>
        </aside>

        <div className="viewer-slot" data-intro>
          <OrganViewer
            organ={organ}
            autoRotate={autoRotate}
            onAutoRotate={setAutoRotate}
            compare={compare}
            onCompare={() => setCompare(!compare)}
            locked={locked}
            onLockedAction={requestUpgrade}
          />
        </div>

        <aside className="info-panel" ref={contentRef} data-intro aria-label={`Ficha de ${organ.name.toLowerCase()}`}>
          {locked ? (
            <ProPaywall organ={organ} onUpgrade={requestUpgrade} />
          ) : (
            <>
              <div className="info-lead">
                <div className="info-kicker" data-reveal><Heart size={13} fill="currentColor" /> {organ.system}</div>
                <div className="info-title-row" data-reveal>
                  <div><h1>{organ.name}</h1><em>{organ.poetic}</em></div>
                  <span className="specimen-stamp">
                    <OrganArt organ={organ} asset="organ" alt={`Ilustración anatómica de ${organ.name.toLowerCase()}`} size={92} />
                  </span>
                </div>
                <p className="description" data-reveal>{organ.description}</p>
                <button type="button" className="ency-link" data-reveal onClick={() => openEncyclopedia("articles")}>
                  <BookOpen size={14} /> Leer artículo completo <ArrowRight size={13} />
                </button>
              </div>
              <div className="info-body">
                <h2 data-reveal>Datos clave</h2>
                <dl className="key-facts">
                  <div data-reveal><dt><span>◇</span> Tamaño</dt><dd>{organ.size}</dd></div>
                  <div data-reveal><dt><span>♙</span> Peso</dt><dd>{organ.weight}</dd></div>
                  <div data-reveal><dt><span>⌁</span> Cada día</dt><dd>{organ.dailyFact}</dd></div>
                  <div data-reveal><dt><span>⌖</span> Ubicación</dt><dd>{organ.location}</dd></div>
                  <div data-reveal><dt><span>❋</span> Riego sanguíneo</dt><dd>{organ.bloodSupply}</dd></div>
                  <div data-reveal><dt><span>◈</span> Función</dt><dd>{organ.function}</dd></div>
                </dl>
                <div className="medical-note" data-reveal><Stethoscope size={16} /><p><b>Importancia médica</b>{organ.medical}</p></div>
                <div className="fun-note" data-reveal><Sparkles size={15} /><p><b>¿Sabías que…?</b>{organ.funFact}</p></div>
                <button type="button" className="lesson-button" data-reveal onClick={() => openLearning("lesson")}>Ver lección <ArrowRight size={16} /></button>
                <div className="action-grid" data-reveal>
                  <button type="button" onClick={() => openLearning("animation")}><Play size={15} /> Animar</button>
                  <button type="button" onClick={() => openLearning("quiz")}><CircleHelp size={15} /> Cuestionario</button>
                  <button type="button" onClick={() => setCompare(!compare)} className={compare ? "active" : ""} aria-pressed={compare}><Share2 size={15} /> Comparar</button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {compare && !locked && (
        <section className="compare-strip" aria-label="Comparación de órganos">
          <div className="compare-organ"><OrganArt organ={organ} asset="thumb" alt="" /><span>Comparando</span><strong>{organ.name}</strong><small>{organ.system}</small></div>
          <b>vs.</b>
          <div className="compare-organ"><OrganArt organ={reference} asset="thumb" alt="" /><span>Referencia</span><strong>{reference.name}</strong><small>{reference.system}</small></div>
          <dl><div><dt>Función principal</dt><dd>{organ.function}</dd></div><div><dt>Escala</dt><dd>{organ.size}</dd></div></dl>
          <button type="button" onClick={() => setCompare(false)} aria-label="Cerrar comparación"><X size={16} /></button>
        </section>
      )}

      {locked ? (
        <section className="learning-cards locked-cards" ref={cardsRef} data-intro aria-label={`Funciones Pro para ${organ.name}`}>
          <ProFeatureTeaser icon={<Microscope size={18} />} label="Vista microscópica" />
          <ProFeatureTeaser icon={<Share2 size={18} />} label="Comparativa de órganos" />
          <ProFeatureTeaser icon={<Play size={18} />} label="Animación de función" />
          <ProFeatureTeaser icon={<FileText size={18} />} label="Notas clínicas" />
          <ProFeatureTeaser icon={<CircleHelp size={18} />} label="Cuestionario" />
          <button type="button" className="pro-teaser-cta" onClick={requestUpgrade}>
            <Lock size={16} /> Desbloquear desde $129 MXN/mes <ArrowRight size={14} />
          </button>
        </section>
      ) : (
        <section className="learning-cards" ref={cardsRef} data-intro aria-label={`Recursos de aprendizaje de ${organ.name}`}>
          <article className="curiosity-card">
            <span>✿</span><p>Aprender es<br />un acto de curiosidad.</p><em>¡Sigue explorando!</em>
            <button type="button" className="curiosity-cta" onClick={() => openEncyclopedia("flashcards")}>
              Estudiar con tarjetas <ArrowRight size={14} />
            </button>
          </article>
          <article>
            <header><div><em>Vista microscópica</em><h3>{organ.tissue}</h3></div><Microscope size={17} /></header>
            <div className="microscope-visual organ-card-image"><OrganArt organ={organ} asset="microscopic" alt={`Vista microscópica de tejido de ${organ.name.toLowerCase()}`} /></div>
            <button type="button" onClick={() => openLearning("lesson")}>Explorar tejido <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>Comparar órganos</em><h3>{organ.comparison}</h3></div><Share2 size={17} /></header>
            <div className="comparison-visual organ-card-image"><OrganArt organ={organ} asset="compare" alt={`Comparación anatómica: ${organ.comparison.toLowerCase()}`} /></div>
            <button type="button" onClick={() => setCompare(true)}>Abrir comparación <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>Animación de función</em><h3>{organ.function}</h3></div><Play size={17} /></header>
            {/* The artwork itself is the control, so the play badge inside it is
                decorative rather than a nested button. */}
            <button
              type="button"
              className="function-visual organ-card-image"
              onClick={() => openLearning("animation")}
              aria-label={`Reproducir la animación de función de ${organ.name.toLowerCase()}`}
            >
              <OrganArt organ={organ} asset="organ" alt="" />
              <i className="function-pulse" />
              <span className="play-badge"><Play size={18} fill="currentColor" /></span>
            </button>
            <button type="button" onClick={() => openLearning("animation")}>Reproducir animación <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>Notas clínicas</em><h3>Condiciones frecuentes</h3></div><FileText size={17} /></header>
            <ul>{organ.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
            <button type="button" onClick={() => openEncyclopedia("articles")}>Leer en la enciclopedia <ArrowRight size={14} /></button>
          </article>
          <article className="system-card">
            <header><div><em>Dónde actúa</em><h3>{organ.system}</h3></div><BrainCircuit size={17} /></header>
            <button
              type="button"
              className="system-visual organ-card-image"
              onClick={() => openLearning("system")}
              aria-label={`Ver dónde se ubica ${organ.name.toLowerCase()} en el cuerpo`}
            >
              <OrganArt organ={organ} asset="location" alt="" />
            </button>
            <button type="button" onClick={() => openLearning("system")}>Ver el sistema <ArrowRight size={14} /></button>
          </article>
        </section>
      )}

      <nav className="mobile-tabbar" aria-label="Navegación móvil">
        <button type="button" className={!mobileLibrary && overlay === null ? "active" : ""} onClick={goHome}>
          <Compass size={20} /><span>Explorar</span>
        </button>
        <button
          type="button"
          className={mobileLibrary ? "active" : ""}
          aria-expanded={mobileLibrary}
          onClick={() => { setOverlay(null); setMobileLibrary((open) => !open); }}
        >
          <LayoutGrid size={20} /><span>Órganos</span>
        </button>
        <button type="button" className={overlay === "encyclopedia" ? "active" : ""} onClick={() => openEncyclopedia()}>
          <Library size={20} /><span>Enciclopedia</span>
        </button>
        <button type="button" className={overlay === "plans" ? "active" : ""} onClick={() => { setMobileLibrary(false); setOverlay("plans"); }}>
          <CreditCard size={20} /><span>Planes</span>
        </button>
      </nav>

      <LearningDialog open={overlay === "learning"} type={learningType} organ={organ} onClose={closeOverlay} />
      <PlansDialog open={overlay === "plans"} plan={plan} onSetPlan={setPlan} onClose={closeOverlay} />
      <Encyclopedia
        open={overlay === "encyclopedia"}
        onClose={closeOverlay}
        organId={organId}
        initialTab={encyclopediaTab}
        plan={plan}
        onUpgrade={requestUpgrade}
        onViewIn3D={(id) => { selectOrgan(id); closeOverlay(); }}
      />
      <button
        type="button"
        className={`drawer-backdrop ${mobileLibrary || accountOpen ? "visible" : ""}`}
        aria-hidden={!(mobileLibrary || accountOpen)}
        tabIndex={-1}
        aria-label="Cerrar panel"
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
  return (
    <div className="pro-paywall" data-reveal>
      <span className="pro-paywall-icon"><Lock size={22} /></span>
      <em>Contenido Pro</em>
      <h1>{organ.name}</h1>
      <p>{organ.description}</p>
      <ul>
        <li><Check size={14} /> Datos clave y relevancia clínica completa</li>
        <li><Check size={14} /> Artículo de enciclopedia y tarjetas de estudio</li>
        <li><Check size={14} /> Cuestionarios, comparativas y animaciones</li>
      </ul>
      <button className="lesson-button" type="button" onClick={onUpgrade}>
        Ver planes desde $129 MXN <ArrowRight size={16} />
      </button>
      <small>El modelo 3D y sus estructuras siguen disponibles para explorar libremente.</small>
    </div>
  );
}

const LEARNING_ICON: Record<LearningType, string> = {
  quiz: "?",
  animation: "▶",
  system: "⌖",
  lesson: "✦",
};

function LearningDialog({ open, type, organ, onClose }: { open: boolean; type: LearningType; organ: Organ; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="modal-title"
      variant={type === "system" ? "wide" : "center"}
      className="learning-modal"
    >
      <LearningContent type={type} organ={organ} onClose={onClose} />
    </Dialog>
  );
}

function LearningContent({ type, organ, onClose }: { type: LearningType; organ: Organ; onClose: () => void }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const organName = organ.name;
  const title =
    type === "quiz" ? `Cuestionario rápido: ${organName.toLowerCase()}`
    : type === "animation" ? `${organName} en movimiento`
    : type === "system" ? `${organName} en el cuerpo`
    : `Dentro del ${organName.toLowerCase()}`;
  return (
    <>
      <span className="modal-icon">{LEARNING_ICON[type]}</span>
      <em>Descubrimiento guiado</em>
      <h2 id="modal-title">{title}</h2>
      {type === "quiz" ? (
        <div className="quiz-options">
          <p>{organ.quiz.question}</p>
          {organ.quiz.options.map((option, index) => {
            const isCorrect = index === organ.quiz.correctIndex;
            const isChosen = answer === index;
            const revealed = answer !== null;
            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                className={revealed ? (isCorrect ? "correct" : isChosen ? "incorrect" : "") : ""}
                onClick={() => setAnswer(index)}
              >
                {option}
                {revealed && isCorrect && <Check size={15} />}
                {revealed && isChosen && !isCorrect && <X size={15} />}
              </button>
            );
          })}
          {answer !== null && (
            <p className={`quiz-feedback ${answer === organ.quiz.correctIndex ? "correct" : "incorrect"}`} role="status">
              {answer === organ.quiz.correctIndex ? "¡Correcto! " : "No exactamente. "}
              {organ.quiz.explanation}
            </p>
          )}
          {answer !== null && (
            <button type="button" className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
          )}
        </div>
      ) : type === "system" ? (
        <>
          <p>{organ.location}. Sigue cómo el {organName.toLowerCase()} se conecta con el resto del cuerpo.</p>
          <figure className="modal-figure">
            <OrganArt organ={organ} asset="location" alt={`${organName} ubicado dentro del ${organ.system.toLowerCase()}`} />
          </figure>
          <dl className="modal-facts">
            <div><dt>Sistema</dt><dd>{organ.system}</dd></div>
            <div><dt>Función principal</dt><dd>{organ.function}</dd></div>
            <div><dt>Riego sanguíneo</dt><dd>{organ.bloodSupply}</dd></div>
          </dl>
          <button type="button" className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
        </>
      ) : type === "lesson" ? (
        <>
          <p>Sigue las estructuras resaltadas, gira el espécimen y conecta la forma con la función. Este breve momento de estudio está diseñado para construir un modelo mental duradero.</p>
          <dl className="modal-facts lesson-facts">
            <div><dt>Tejido</dt><dd>{organ.tissue}</dd></div>
            <div><dt>Relevancia clínica</dt><dd>{organ.medical}</dd></div>
            <div><dt>Condiciones frecuentes</dt><dd>{organ.conditions.slice(0, 3).join(", ")}</dd></div>
          </dl>
          <button type="button" className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
        </>
      ) : (
        <>
          <p>Sigue las estructuras resaltadas, gira el espécimen y conecta la forma con la función. Este breve momento de estudio está diseñado para construir un modelo mental duradero.</p>
          <div className="modal-demo moving"><OrganArt organ={organ} asset="organ" alt={`Ilustración de ${organName.toLowerCase()}`} /></div>
          <button type="button" className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
        </>
      )}
    </>
  );
}
