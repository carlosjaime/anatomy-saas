"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  BookMarked,
  Box,
  Layers,
  Library,
  Lock,
  Search,
  Stethoscope,
  X,
} from "lucide-react";
import { Dialog } from "./Dialog";
import { Flashcards } from "./Flashcards";
import { organById, organs, type Organ, type OrganId } from "../lib/anatomy-data";
import {
  ARTICLE_SECTIONS,
  articles,
  glossary,
  indexLetter,
  normalize,
  searchEncyclopedia,
  type ArticleSectionId,
  type GlossaryEntry,
  type SearchHit,
} from "../lib/encyclopedia-data";
import { hasFeature, type PlanId } from "../lib/plans";

export type EncyclopediaTab = "articles" | "glossary" | "flashcards";

const TABS: readonly { id: EncyclopediaTab; label: string; icon: typeof Library }[] = [
  { id: "articles", label: "Artículos", icon: Library },
  { id: "glossary", label: "Glosario", icon: BookMarked },
  { id: "flashcards", label: "Tarjetas", icon: Layers },
];

const HIT_LABEL: Record<SearchHit["kind"], string> = {
  organ: "Órgano",
  section: "Artículo",
  structure: "Estructura",
  condition: "Condición",
  term: "Glosario",
};

type Props = {
  open: boolean;
  onClose: () => void;
  organId: OrganId;
  initialTab: EncyclopediaTab;
  plan: PlanId;
  onViewIn3D: (id: OrganId) => void;
  onUpgrade: () => void;
};

export function Encyclopedia({ open, onClose, organId, initialTab, plan, onViewIn3D, onUpgrade }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="ency-title"
      variant="fullscreen"
      className="encyclopedia"
      initialFocus=".ency-search input"
      hideCloseButton
    >
      {/* El contenido se monta con cada apertura, así que su estado inicial
          refleja siempre el órgano y la pestaña con los que se abrió. */}
      <EncyclopediaContent
        initialOrganId={organId}
        initialTab={initialTab}
        plan={plan}
        onClose={onClose}
        onViewIn3D={onViewIn3D}
        onUpgrade={onUpgrade}
      />
    </Dialog>
  );
}

type ContentProps = Omit<Props, "open" | "organId"> & { initialOrganId: OrganId };

function EncyclopediaContent({ initialOrganId, initialTab, plan, onClose, onViewIn3D, onUpgrade }: ContentProps) {
  const [tab, setTab] = useState<EncyclopediaTab>(initialTab);
  const [articleId, setArticleId] = useState<OrganId>(initialOrganId);
  const [query, setQuery] = useState("");
  const [pendingSection, setPendingSection] = useState<ArticleSectionId | null>(null);
  const deferredQuery = useDeferredValue(query);

  const hits = useMemo(() => searchEncyclopedia(deferredQuery, organs), [deferredQuery]);
  const searching = tab === "articles" && normalize(deferredQuery).length >= 2;

  const openArticle = useCallback((id: OrganId, section: ArticleSectionId | null = null) => {
    setArticleId(id);
    setPendingSection(section);
    setQuery("");
    setTab("articles");
  }, []);

  const openHit = (hit: SearchHit) => {
    if (hit.kind === "term") {
      setTab("glossary");
      setQuery(hit.title);
      return;
    }
    openArticle(hit.organId, hit.kind === "section" ? hit.sectionId : null);
  };

  return (
    <div className="ency-shell">
      <header className="ency-header">
        <div className="ency-title">
          <span className="ency-mark" aria-hidden="true"><Library size={18} /></span>
          <div>
            <em>Atlas Anatómico</em>
            <h2 id="ency-title">Enciclopedia</h2>
          </div>
        </div>
        <div className="ency-tabs" role="tablist" aria-label="Secciones de la enciclopedia" data-active={tab}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`ency-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`ency-panel-${id}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} /> <span>{label}</span>
            </button>
          ))}
        </div>
        {tab !== "flashcards" && (
          <label className="ency-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === "glossary" ? "Filtrar términos…" : "Buscar órganos, estructuras, enfermedades…"}
              aria-label="Buscar en la enciclopedia"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X size={14} /></button>
            )}
          </label>
        )}
        <button className="modal-close ency-close" type="button" onClick={onClose} aria-label="Cerrar enciclopedia">
          <X size={18} />
        </button>
      </header>

      <div
        key={tab}
        className="ency-panel"
        role="tabpanel"
        id={`ency-panel-${tab}`}
        aria-labelledby={`ency-tab-${tab}`}
      >
        {tab === "articles" && (
          searching ? (
            <SearchResults hits={hits} query={deferredQuery} onOpen={openHit} />
          ) : (
            <ArticlesView
              articleId={articleId}
              pendingSection={pendingSection}
              onSectionHandled={() => setPendingSection(null)}
              plan={plan}
              onSelect={openArticle}
              onViewIn3D={onViewIn3D}
              onUpgrade={onUpgrade}
            />
          )
        )}
        {tab === "glossary" && <GlossaryView query={deferredQuery} onOpenOrgan={openArticle} />}
        {tab === "flashcards" && (
          <Flashcards canAccessAll={hasFeature(plan, "allFlashcards")} onUpgrade={onUpgrade} />
        )}
      </div>
    </div>
  );
}

function SearchResults({ hits, query, onOpen }: { hits: SearchHit[]; query: string; onOpen: (hit: SearchHit) => void }) {
  if (hits.length === 0) {
    return (
      <div className="ency-empty">
        <Search size={22} />
        <p>Sin resultados para «{query}». Prueba con otro término, como «nefrona» o «válvula».</p>
      </div>
    );
  }
  return (
    <div className="search-results">
      <p className="results-count" aria-live="polite">{hits.length} resultados</p>
      <ul>
        {hits.map((hit, index) => {
          const organ = hit.organId ? organById[hit.organId] : null;
          return (
            <li key={`${hit.kind}-${hit.title}-${index}`} style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
              <button type="button" onClick={() => onOpen(hit)}>
                <span className="hit-kind" style={organ ? ({ "--hit-accent": organ.accent } as React.CSSProperties) : undefined}>
                  {HIT_LABEL[hit.kind]}
                </span>
                <strong><Highlight text={hit.title} query={query} /></strong>
                <small><Highlight text={hit.snippet} query={query} /></small>
                <ArrowRight size={15} className="hit-arrow" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Resalta la coincidencia respetando acentos del texto original. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = normalize(query);
  if (needle.length < 2) return <>{text}</>;
  // NFD conserva la longitud solo sin diacríticos, así que se mapea por
  // carácter para ubicar la coincidencia en el texto original.
  const folded = Array.from(text, (char) => normalize(char) || char);
  const haystack = folded.join("");
  const start = haystack.indexOf(needle);
  if (start < 0) return <>{text}</>;
  let offset = 0;
  let from = -1;
  let to = text.length;
  for (let i = 0; i < folded.length; i += 1) {
    if (offset === start) from = i;
    offset += folded[i].length;
    if (offset >= start + needle.length && from >= 0) { to = i + 1; break; }
  }
  if (from < 0) return <>{text}</>;
  const chars = Array.from(text);
  return (
    <>
      {chars.slice(0, from).join("")}
      <mark>{chars.slice(from, to).join("")}</mark>
      {chars.slice(to).join("")}
    </>
  );
}

type ArticlesViewProps = {
  articleId: OrganId;
  pendingSection: ArticleSectionId | null;
  onSectionHandled: () => void;
  plan: PlanId;
  onSelect: (id: OrganId) => void;
  onViewIn3D: (id: OrganId) => void;
  onUpgrade: () => void;
};

function ArticlesView({ articleId, pendingSection, onSectionHandled, plan, onSelect, onViewIn3D, onUpgrade }: ArticlesViewProps) {
  const organ = organById[articleId];
  const article = articles[articleId];
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [activeSection, setActiveSection] = useState<ArticleSectionId>("anatomy");
  const articleLocked = organ.tier === "pro" && !hasFeature(plan, "fullEncyclopedia");
  const clinicalLocked = !hasFeature(plan, "clinicalCorrelation");
  const sectionLocked = (id: ArticleSectionId) =>
    (articleLocked && id !== "anatomy") || (id === "clinical" && clinicalLocked);

  // Barra de progreso de lectura: escribe el transform directo al DOM para
  // no re-renderizar en cada evento de scroll.
  useEffect(() => {
    const scroller = scrollRef.current;
    const bar = progressRef.current;
    if (!scroller || !bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      bar.style.transform = `scaleX(${max > 0 ? scroller.scrollTop / max : 0})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [articleId]);

  // Scrollspy: marca en el índice la sección visible.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveSection(top.target.getAttribute("data-section") as ArticleSectionId);
      },
      { root: scroller, rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    scroller.querySelectorAll("[data-section]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [articleId]);

  // Entrada escalonada al cambiar de artículo y salto a la sección pedida.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (pendingSection) {
      scroller.querySelector(`[data-section="${pendingSection}"]`)?.scrollIntoView({ block: "start" });
      onSectionHandled();
    } else {
      scroller.scrollTop = 0;
    }
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        scroller.querySelectorAll("[data-ency-reveal]"),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.045, ease: "power3.out", clearProps: "transform" },
      );
    });
    return () => media.revert();
    // Solo al cambiar de artículo; la sección pendiente se consume una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const jumpTo = (id: ArticleSectionId) => {
    const target = scrollRef.current?.querySelector(`[data-section="${id}"]`);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="articles-layout">
      <nav className="article-nav" aria-label="Artículos de órganos">
        {organs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === articleId ? "active" : ""}
            aria-current={item.id === articleId ? "page" : undefined}
            onClick={() => onSelect(item.id)}
            style={{ "--item-accent": item.accent } as React.CSSProperties}
          >
            <span className="nav-dot" aria-hidden="true">{item.icon}</span>
            <span>{item.name}</span>
            {item.tier === "pro" && !hasFeature(plan, "fullEncyclopedia") && <Lock size={11} aria-label="Contenido Pro" />}
          </button>
        ))}
      </nav>

      <div className="article-scroll" ref={scrollRef}>
        <span className="reading-progress" aria-hidden="true"><span ref={progressRef} /></span>
        <article className="article" style={{ "--organ-accent": organ.accent } as React.CSSProperties}>
          <header className="article-hero" data-ency-reveal>
            <div className="article-hero-art">
              <img src={`/anatomy/${organ.id}/organ.webp`} alt={`Ilustración anatómica de ${organ.name.toLowerCase()}`} width={140} height={140} loading="lazy" decoding="async" />
            </div>
            <div>
              <span className="article-system">{organ.system}</span>
              <h3>{organ.name} <i>{organ.scientificName}</i></h3>
              <p className="article-lead">{organ.description}</p>
              <p className="article-etymology"><b>Etimología.</b> {article.etymology}</p>
              <button type="button" className="view-3d" onClick={() => onViewIn3D(organ.id)}>
                <Box size={15} /> Ver en 3D
              </button>
            </div>
          </header>

          <dl className="article-facts" data-ency-reveal>
            <div><dt>Tamaño</dt><dd>{organ.size}</dd></div>
            <div><dt>Peso</dt><dd>{organ.weight}</dd></div>
            <div><dt>Ubicación</dt><dd>{organ.location}</dd></div>
            <div><dt>Irrigación</dt><dd>{organ.bloodSupply}</dd></div>
          </dl>

          <nav className="article-toc" aria-label="Índice del artículo" data-ency-reveal>
            {ARTICLE_SECTIONS.map(({ id, title }) => (
              <button
                key={id}
                type="button"
                className={activeSection === id ? "active" : ""}
                aria-current={activeSection === id ? "location" : undefined}
                onClick={() => jumpTo(id)}
              >
                {sectionLocked(id) && <Lock size={11} aria-hidden="true" />}
                {title}
              </button>
            ))}
          </nav>

          {ARTICLE_SECTIONS.map(({ id, title }) => (
            <section key={id} className="article-section" data-section={id} data-ency-reveal aria-labelledby={`sec-${id}`}>
              <h4 id={`sec-${id}`}>
                {id === "clinical" && <Stethoscope size={16} aria-hidden="true" />}
                {title}
              </h4>
              {sectionLocked(id) ? (
                <LockedSection
                  label={id === "clinical" && !articleLocked ? "Plan Profesional" : "Plan Estudiante"}
                  onUpgrade={onUpgrade}
                />
              ) : (
                <p>{article.sections[id]}</p>
              )}
              {id === "anatomy" && <StructureList organ={organ} />}
            </section>
          ))}

          <section className="article-section" data-ency-reveal aria-labelledby="sec-conditions">
            <h4 id="sec-conditions">Condiciones frecuentes</h4>
            <ul className="condition-chips">
              {organ.conditions.map((condition) => <li key={condition}>{condition}</li>)}
            </ul>
          </section>

          <section className="article-section" data-ency-reveal aria-labelledby="sec-related">
            <h4 id="sec-related">Artículos relacionados</h4>
            <div className="related-grid">
              {article.related.map((id) => {
                const related = organById[id];
                return (
                  <button key={id} type="button" onClick={() => onSelect(id)} style={{ "--item-accent": related.accent } as React.CSSProperties}>
                    <img src={`/anatomy/${id}/thumb.webp`} alt="" width={44} height={44} loading="lazy" decoding="async" />
                    <span><b>{related.name}</b><small>{related.system}</small></span>
                    <ArrowRight size={14} />
                  </button>
                );
              })}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

function StructureList({ organ }: { organ: Organ }) {
  return (
    <ul className="structure-list" aria-label={`Estructuras del ${organ.name.toLowerCase()}`}>
      {organ.hotspots.map((hotspot) => (
        <li key={hotspot.id} style={{ "--dot": hotspot.color } as React.CSSProperties}>
          <b>{hotspot.label}</b>
          <small>{hotspot.detail}</small>
        </li>
      ))}
    </ul>
  );
}

function LockedSection({ label, onUpgrade }: { label: string; onUpgrade: () => void }) {
  return (
    <div className="locked-section">
      <span className="locked-lines" aria-hidden="true"><i /><i /><i /></span>
      <button type="button" onClick={onUpgrade}>
        <Lock size={14} /> Disponible con el {label} <ArrowRight size={14} />
      </button>
    </div>
  );
}

function GlossaryView({ query, onOpenOrgan }: { query: string; onOpenOrgan: (id: OrganId) => void }) {
  const needle = normalize(query);
  const filtered = useMemo(
    () =>
      needle
        ? glossary.filter((entry) => normalize(`${entry.term} ${entry.definition}`).includes(needle))
        : glossary,
    [needle],
  );
  const groups = useMemo(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const entry of [...filtered].sort((a, b) => a.term.localeCompare(b.term, "es"))) {
      const letter = indexLetter(entry.term);
      map.set(letter, [...(map.get(letter) ?? []), entry]);
    }
    return map;
  }, [filtered]);
  const letters = useMemo(() => Array.from(new Set(glossary.map((entry) => indexLetter(entry.term)))).sort(), []);
  const listRef = useRef<HTMLDivElement>(null);

  const jump = (letter: string) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current
      ?.querySelector(`[data-letter="${letter}"]`)
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="glossary">
      <nav className="letter-bar" aria-label="Índice alfabético">
        {letters.map((letter) => (
          <button key={letter} type="button" disabled={!groups.has(letter)} onClick={() => jump(letter)}>
            {letter}
          </button>
        ))}
      </nav>
      <div className="glossary-list" ref={listRef}>
        <p className="results-count" aria-live="polite">{filtered.length} términos</p>
        {filtered.length === 0 && (
          <div className="ency-empty"><Search size={22} /><p>Ningún término coincide con «{query}».</p></div>
        )}
        {[...groups.entries()].map(([letter, entries]) => (
          <section key={letter} data-letter={letter} aria-label={`Letra ${letter}`}>
            <h4>{letter}</h4>
            <dl>
              {entries.map(({ term, definition, organId }) => (
                <div key={term} className="glossary-entry">
                  <dt>{term}</dt>
                  <dd>
                    {definition}
                    {organId && (
                      <button
                        type="button"
                        className="organ-tag"
                        style={{ "--item-accent": organById[organId].accent } as React.CSSProperties}
                        onClick={() => onOpenOrgan(organId)}
                      >
                        {organById[organId].name} <ArrowRight size={12} />
                      </button>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
