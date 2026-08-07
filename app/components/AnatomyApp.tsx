"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { organById, organs, type Organ, type OrganId } from "../lib/anatomy-data";
import type { ChatGPTUser } from "../chatgpt-auth";

type Modal = "lesson" | "quiz" | "animation" | "system" | "plans" | null;
type Plan = "free" | "pro";

const PLAN_KEY = "atlas-anatomico:plan";
const FAVORITES_KEY = "atlas-anatomico:favoritos";

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
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState("");
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [plan, setPlanState] = useState<Plan>("free");
  const [favorites, setFavorites] = useState<Set<OrganId>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<OrganId>());
  const organ = organById[organId];
  const reference = organById[organId === "heart" ? "brain" : "heart"];
  const locked = organ.tier === "pro" && plan === "free";

  // A one-time read after mount, deliberately outside the initial render: the
  // server has no localStorage, so seeding state from it during render would
  // desync the SSR markup from the client's first paint. This single
  // post-hydration sync is the correct fix for that, not a cascading loop.
  useEffect(() => {
    try {
      const storedPlan = window.localStorage.getItem(PLAN_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedPlan === "pro") setPlanState("pro");
      const storedFavorites = window.localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) setFavorites(new Set(JSON.parse(storedFavorites)));
    } catch {
      // Private browsing or a disabled storage API — the app still works,
      // it just won't remember the plan or favorites between visits.
    }
  }, []);

  const setPlan = (next: Plan) => {
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

  const filteredOrgans = useMemo(
    () =>
      organs.filter((item) => {
        if (favoritesOnly && !favorites.has(item.id)) return false;
        if (activeSystem && item.system !== activeSystem) return false;
        return `${item.name} ${item.system}`.toLowerCase().includes(query.toLowerCase());
      }),
    [query, activeSystem, favoritesOnly, favorites],
  );

  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current.querySelectorAll("[data-reveal]"),
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.48, stagger: 0.035, ease: "power2.out", overwrite: true },
    );
  }, [organId, locked]);

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
    selectOrgan("heart");
  };

  // Warms the model in the HTTP cache while the pointer is still travelling,
  // so the switch usually renders without a visible loading pass.
  const prefetchOrgan = (id: OrganId) => {
    if (id === organId || prefetched.current.has(id)) return;
    prefetched.current.add(id);
    void fetch(organById[id].model, { priority: "low" } as RequestInit).catch(() => {});
  };

  const requestUpgrade = () => setModal("plans");

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={goHome} aria-label="Atlas Anatómico, inicio">
          <strong>Atlas Anatómico<sup>✦</sup></strong>
          <em>Anatomía 3D para profesionales de la salud</em>
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className={!activeSystem && !favoritesOnly ? "active" : ""} type="button" onClick={goHome}>
            <Compass size={17} /> <span>Explorar</span>
          </button>
          <button type="button" onClick={() => setModal("lesson")}><BookOpen size={17} /> <span>Lecciones</span></button>
          <button type="button" className="plan-nav-button" onClick={() => setModal("plans")}>
            <CreditCard size={17} /> <span>Planes</span>
          </button>
        </nav>
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar órganos, temas…" />
        </label>
        <div className="nav-dropdown account-dropdown">
          <button className="profile" aria-label="Cuenta" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>
            <span>{user ? initials(user.displayName) : <User size={16} />}</span>
            <ChevronDown size={15} />
          </button>
          {accountOpen && (
            <div className="dropdown-panel account-panel" role="menu">
              {user ? (
                <>
                  <div className="account-summary">
                    <b>{user.displayName}</b>
                    <small>{user.email}</small>
                    <span className={`plan-badge ${plan}`}>{plan === "pro" ? "Plan Pro" : "Plan Gratis"}</span>
                  </div>
                  <button type="button" onClick={() => { setModal("plans"); setAccountOpen(false); }}>
                    <CreditCard size={15} /> {plan === "pro" ? "Gestionar suscripción" : "Ver planes"}
                  </button>
                  <a href={signOutHref} className="dropdown-link">
                    <LogOut size={15} /> Cerrar sesión
                  </a>
                </>
              ) : (
                <>
                  <div className="account-summary">
                    <b>Invitado</b>
                    <small>Inicia sesión para guardar tu progreso</small>
                  </div>
                  <a href={signInHref} className="dropdown-link primary">
                    <User size={15} /> Iniciar sesión
                  </a>
                </>
              )}
            </div>
          )}
        </div>
        <button className="mobile-library-trigger" onClick={() => setMobileLibrary(true)} aria-label="Abrir biblioteca de órganos">
          <LayoutGrid size={20} />
        </button>
      </header>

      <div className="workspace">
        <aside className={`organ-library ${mobileLibrary ? "open" : ""}`}>
          <div className="panel-heading">
            <span>Biblioteca de órganos</span>
            <button aria-label="Cerrar biblioteca" className="mobile-close" onClick={() => setMobileLibrary(false)}><X size={17} /></button>
            <button
              aria-label="Mostrar solo guardados"
              aria-pressed={favoritesOnly}
              className={favoritesOnly ? "active" : ""}
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              <Star size={17} fill={favoritesOnly ? "currentColor" : "none"} />
            </button>
          </div>
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
          <div className="organ-list">
            {filteredOrgans.length === 0 && (
              <p className="empty-state">No se encontraron órganos con ese criterio.</p>
            )}
            {filteredOrgans.map((item) => (
              <div
                role="button"
                tabIndex={0}
                key={item.id}
                className={`organ-item ${organId === item.id ? "active" : ""}`}
                onClick={() => selectOrgan(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectOrgan(item.id); }
                }}
                onPointerEnter={() => prefetchOrgan(item.id)}
                onFocus={() => prefetchOrgan(item.id)}
                style={{ "--item-accent": item.accent } as React.CSSProperties}
              >
                <span className="organ-glyph">
                  <OrganArt organ={item} asset="thumb" alt={`Miniatura de ${item.name}`} size={47} />
                  {item.tier === "pro" && plan === "free" && (
                    <span className="tier-badge" aria-label="Contenido Pro"><Lock size={11} /></span>
                  )}
                </span>
                <span><b>{item.name}</b><small>{item.system}</small></span>
                <button
                  type="button"
                  className={`favorite-toggle ${favorites.has(item.id) ? "active" : ""}`}
                  aria-label={favorites.has(item.id) ? `Quitar ${item.name} de guardados` : `Guardar ${item.name}`}
                  onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }}
                >
                  <Star size={14} fill={favorites.has(item.id) ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>
          <button className="view-all" onClick={() => { setQuery(""); setActiveSystem(null); setFavoritesOnly(false); }}>
            Ver todos los órganos <ArrowRight size={14} />
          </button>
          <blockquote>
            <Sparkles size={18} />
            <p>Aprender es<br />un acto de curiosidad.</p>
            <em>¡Sigue explorando!</em>
          </blockquote>
        </aside>

        <OrganViewer
          organ={organ}
          autoRotate={autoRotate}
          onAutoRotate={setAutoRotate}
          compare={compare}
          onCompare={() => setCompare(!compare)}
          locked={locked}
          onLockedAction={requestUpgrade}
        />

        <aside className="info-panel" ref={contentRef}>
          {locked ? (
            <ProPaywall organ={organ} onUpgrade={requestUpgrade} />
          ) : (
            <>
              <div className="info-kicker" data-reveal><Heart size={13} fill="currentColor" /> {organ.name}</div>
              <div className="info-title-row" data-reveal>
                <div><h1>{organ.name}</h1><em>{organ.poetic}</em></div>
                <span className="specimen-stamp">
                  <OrganArt organ={organ} asset="organ" alt={`Ilustración anatómica de ${organ.name.toLowerCase()}`} size={92} />
                </span>
              </div>
              <p className="description" data-reveal>{organ.description}</p>
              <div className="rule" />
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
              <button className="lesson-button" data-reveal onClick={() => setModal("lesson")}>Ver lección <ArrowRight size={16} /></button>
              <div className="action-grid" data-reveal>
                <button onClick={() => setModal("animation")}><Play size={15} /> Animar</button>
                <button onClick={() => setModal("quiz")}><CircleHelp size={15} /> Cuestionario</button>
                <button onClick={() => setCompare(!compare)} className={compare ? "active" : ""}><Share2 size={15} /> Comparar</button>
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
          <button onClick={() => setCompare(false)} aria-label="Cerrar comparación"><X size={16} /></button>
        </section>
      )}

      {locked ? (
        <section className="learning-cards locked-cards" aria-label={`Funciones Pro para ${organ.name}`}>
          <ProFeatureTeaser icon={<Microscope size={18} />} label="Vista microscópica" />
          <ProFeatureTeaser icon={<Share2 size={18} />} label="Comparativa de órganos" />
          <ProFeatureTeaser icon={<Play size={18} />} label="Animación de función" />
          <ProFeatureTeaser icon={<FileText size={18} />} label="Notas clínicas" />
          <ProFeatureTeaser icon={<CircleHelp size={18} />} label="Cuestionario" />
          <button type="button" className="pro-teaser-cta" onClick={requestUpgrade}>
            <Lock size={16} /> Desbloquear con Plan Pro <ArrowRight size={14} />
          </button>
        </section>
      ) : (
        <section className="learning-cards" aria-label={`Recursos de aprendizaje de ${organ.name}`}>
          <article className="curiosity-card">
            <span>✿</span><p>Aprender es<br />un acto de curiosidad.</p><em>¡Sigue explorando!</em>
          </article>
          <article>
            <header><div><em>Vista microscópica</em><h3>{organ.tissue}</h3></div><Microscope size={17} /></header>
            <div className="microscope-visual organ-card-image"><OrganArt organ={organ} asset="microscopic" alt={`Vista microscópica de tejido de ${organ.name.toLowerCase()}`} /></div>
            <button onClick={() => setModal("lesson")}>Explorar tejido <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>Comparar órganos</em><h3>{organ.comparison}</h3></div><Share2 size={17} /></header>
            <div className="comparison-visual organ-card-image"><OrganArt organ={organ} asset="compare" alt={`Comparación anatómica: ${organ.comparison.toLowerCase()}`} /></div>
            <button onClick={() => setCompare(true)}>Abrir comparación <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>Animación de función</em><h3>{organ.function}</h3></div><Play size={17} /></header>
            {/* The artwork itself is the control, so the play badge inside it is
                decorative rather than a nested button. */}
            <button
              type="button"
              className="function-visual organ-card-image"
              onClick={() => setModal("animation")}
              aria-label={`Reproducir la animación de función de ${organ.name.toLowerCase()}`}
            >
              <OrganArt organ={organ} asset="organ" alt="" />
              <i className="function-pulse" />
              <span className="play-badge"><Play size={18} fill="currentColor" /></span>
            </button>
            <button onClick={() => setModal("animation")}>Reproducir animación <ArrowRight size={14} /></button>
          </article>
          <article>
            <header><div><em>Notas clínicas</em><h3>Condiciones frecuentes</h3></div><FileText size={17} /></header>
            <ul>{organ.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
            <button onClick={() => setModal("lesson")}>Ver todas <ArrowRight size={14} /></button>
          </article>
          <article className="system-card">
            <header><div><em>Dónde actúa</em><h3>{organ.system}</h3></div><BrainCircuit size={17} /></header>
            <button
              type="button"
              className="system-visual organ-card-image"
              onClick={() => setModal("system")}
              aria-label={`Ver dónde se ubica ${organ.name.toLowerCase()} en el cuerpo`}
            >
              <OrganArt organ={organ} asset="location" alt="" />
            </button>
            <button onClick={() => setModal("system")}>Ver el sistema <ArrowRight size={14} /></button>
          </article>
        </section>
      )}

      {modal && modal !== "plans" && <LearningModal type={modal} organ={organ} onClose={() => setModal(null)} />}
      {modal === "plans" && <PlansModal plan={plan} onSetPlan={setPlan} onClose={() => setModal(null)} />}
      {(mobileLibrary || accountOpen) && (
        <button
          className="drawer-backdrop"
          aria-label="Cerrar panel"
          onClick={() => { setMobileLibrary(false); setAccountOpen(false); }}
        />
      )}
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
        <li><Check size={14} /> Condiciones médicas frecuentes</li>
        <li><Check size={14} /> Cuestionarios, comparativas y animaciones</li>
      </ul>
      <button className="lesson-button" type="button" onClick={onUpgrade}>
        Desbloquear con Plan Pro <ArrowRight size={16} />
      </button>
      <small>El modelo 3D y sus estructuras siguen disponibles para explorar libremente.</small>
    </div>
  );
}

function PlansModal({ plan, onSetPlan, onClose }: { plan: Plan; onSetPlan: (plan: Plan) => void; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="learning-modal wide plans-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plans-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <span className="modal-icon"><CreditCard size={24} /></span>
        <em>Planes de Atlas Anatómico</em>
        <h2 id="plans-title">Elige cómo quieres aprender</h2>
        <p>Pensado para estudiantes, docentes y profesionales clínicos que necesitan referencia anatómica confiable.</p>
        <div className="plans-grid">
          <div className={`plan-card ${plan === "free" ? "current" : ""}`}>
            <b>Gratis</b>
            <strong>$0<small>/mes</small></strong>
            <ul>
              <li><Check size={14} /> 4 órganos con detalle clínico</li>
              <li><Check size={14} /> Visor 3D interactivo completo</li>
              <li><Check size={14} /> Descripciones flotantes por estructura</li>
            </ul>
            {plan === "free" ? <span className="current-badge">Tu plan actual</span> : (
              <button type="button" onClick={() => onSetPlan("free")}>Volver a Gratis</button>
            )}
          </div>
          <div className={`plan-card highlight ${plan === "pro" ? "current" : ""}`}>
            <b>Pro</b>
            <strong>$9.99<small>/mes</small></strong>
            <ul>
              <li><Check size={14} /> Los 9 órganos, sin restricciones</li>
              <li><Check size={14} /> Cuestionarios y notas clínicas</li>
              <li><Check size={14} /> Comparativas y animaciones de función</li>
              <li><Check size={14} /> Guardado ilimitado de favoritos</li>
            </ul>
            {plan === "pro" ? <span className="current-badge">Tu plan actual</span> : (
              <button type="button" className="primary" onClick={() => onSetPlan("pro")}>Activar Plan Pro</button>
            )}
          </div>
        </div>
        <small className="plans-disclaimer">Vista de demostración: el cambio de plan es local a este dispositivo y no procesa pagos reales.</small>
      </section>
    </div>
  );
}

const MODAL_ICON: Record<Exclude<Modal, null | "plans">, string> = {
  quiz: "?",
  animation: "▶",
  system: "⌖",
  lesson: "✦",
};

function LearningModal({ type, organ, onClose }: { type: Exclude<Modal, null | "plans">; organ: Organ; onClose: () => void }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const organName = organ.name;
  const title =
    type === "quiz" ? `Cuestionario rápido: ${organName.toLowerCase()}`
    : type === "animation" ? `${organName} en movimiento`
    // Avoids gluing onto `system`, whose wording varies per organ
    // ("Cardiovascular" vs "Nervous System"), and stays grammatical for the
    // plural organs too.
    : type === "system" ? `${organName} en el cuerpo`
    : `Dentro del ${organName.toLowerCase()}`;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`learning-modal ${type === "system" ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <span className="modal-icon">{MODAL_ICON[type]}</span>
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
              <p className={`quiz-feedback ${answer === organ.quiz.correctIndex ? "correct" : "incorrect"}`}>
                {answer === organ.quiz.correctIndex ? "¡Correcto! " : "No exactamente. "}
                {organ.quiz.explanation}
              </p>
            )}
            {answer !== null && (
              <button className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
            )}
          </div>
        ) : type === "system" ? (
          <>
            <p>{organ.location}. Sigue cómo el {organName.toLowerCase()} se conecta con el resto del cuerpo.</p>
            {/* Shown whole rather than cropped into the circular demo — the
                point of this view is the figure and its vessels. */}
            <figure className="modal-figure">
              <OrganArt organ={organ} asset="location" alt={`${organName} ubicado dentro del ${organ.system.toLowerCase()}`} />
            </figure>
            <dl className="modal-facts">
              <div><dt>Sistema</dt><dd>{organ.system}</dd></div>
              <div><dt>Función principal</dt><dd>{organ.function}</dd></div>
              <div><dt>Riego sanguíneo</dt><dd>{organ.bloodSupply}</dd></div>
            </dl>
            <button className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
          </>
        ) : type === "lesson" ? (
          <>
            <p>Sigue las estructuras resaltadas, gira el espécimen y conecta la forma con la función. Este breve momento de estudio está diseñado para construir un modelo mental duradero.</p>
            <dl className="modal-facts lesson-facts">
              <div><dt>Tejido</dt><dd>{organ.tissue}</dd></div>
              <div><dt>Relevancia clínica</dt><dd>{organ.medical}</dd></div>
              <div><dt>Condiciones frecuentes</dt><dd>{organ.conditions.slice(0, 3).join(", ")}</dd></div>
            </dl>
            <button className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
          </>
        ) : (
          <>
            <p>Sigue las estructuras resaltadas, gira el espécimen y conecta la forma con la función. Este breve momento de estudio está diseñado para construir un modelo mental duradero.</p>
            <div className={`modal-demo ${type === "animation" ? "moving" : ""}`}><OrganArt organ={organ} asset="organ" alt={`Ilustración de ${organName.toLowerCase()}`} /></div>
            <button className="lesson-button" onClick={onClose}>Continuar explorando <ArrowRight size={16} /></button>
          </>
        )}
      </section>
    </div>
  );
}
