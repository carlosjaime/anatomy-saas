"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Box,
  CircleDashed,
  Layers3,
  Lock,
  Maximize2,
  MousePointerClick,
  Pause,
  Play,
  Route,
  RotateCcw,
  ScanLine,
  Search,
  X,
} from "lucide-react";
import type { Hotspot, Organ } from "../lib/anatomy-data";
import { MOTION_BY_ORGAN } from "../lib/three/motion";
import type { AnatomyViewer } from "../lib/three/viewer";

/** Time each tour step stays on screen while autoplay is on. */
const TOUR_STEP_MS = 5200;

export type OrganViewerHandle = {
  startTour: () => void;
};

type Props = {
  ref?: Ref<OrganViewerHandle>;
  organ: Organ;
  autoRotate: boolean;
  onAutoRotate: (enabled: boolean) => void;
  physiology: boolean;
  onPhysiology: (enabled: boolean) => void;
  compare: boolean;
  onCompare: () => void;
  locked: boolean;
  onLockedAction: () => void;
  onTourComplete: () => void;
};

type Tour = { step: number; playing: boolean };

export function OrganViewer({
  ref,
  organ,
  autoRotate,
  onAutoRotate,
  physiology,
  onPhysiology,
  compare,
  onCompare,
  locked,
  onLockedAction,
  onTourComplete,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<AnatomyViewer | null>(null);
  const organRef = useRef(organ);
  const autoRotateRef = useRef(autoRotate);
  const physiologyRef = useRef(physiology);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [tourOrganId, setTourOrganId] = useState(organ.id);
  const motion = MOTION_BY_ORGAN[organ.id];

  // A tour belongs to the organ it started on; switching organs ends it.
  // Derived during render rather than in an effect (React's recommended
  // pattern for resetting state when a prop changes).
  if (tourOrganId !== organ.id) {
    setTourOrganId(organ.id);
    setTour(null);
  }

  // A typical organ is ready well inside a second — flashing a loading panel for
  // that reads as jank. It only appears if the fetch is genuinely slow; the flag
  // is cleared by onLoading when the next load starts.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlowLoad(true), 900);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    organRef.current = organ;
  }, [organ]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    physiologyRef.current = physiology;
  }, [physiology]);

  useEffect(() => {
    let cancelled = false;
    let viewer: AnatomyViewer | null = null;

    void import("../lib/three/viewer").then(({ AnatomyViewer: Viewer }) => {
      if (cancelled || !mountRef.current) return;
      viewer = new Viewer(mountRef.current, {
        onSelect: setSelected,
        onLoading: (isLoading, value) => {
          setLoading(isLoading);
          setProgress(value);
          if (isLoading) setSlowLoad(false);
        },
      });
      viewerRef.current = viewer;
      viewer.setAutoRotate(autoRotateRef.current);
      viewer.setPhysiology(physiologyRef.current);
      const current = organRef.current;
      viewer.setOrgan(current.model, current.hotspots, current.accent, MOTION_BY_ORGAN[current.id].profile).catch(() => {
        setLoading(false);
        setProgress(0);
      });
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      viewer?.dispose();
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setOrgan(organ.model, organ.hotspots, organ.accent, MOTION_BY_ORGAN[organ.id].profile).catch(() => {
      setLoading(false);
      setProgress(0);
    });
  }, [organ]);

  useEffect(() => viewerRef.current?.setAutoRotate(autoRotate), [autoRotate]);
  useEffect(() => viewerRef.current?.setPhysiology(physiology), [physiology]);

  // Drive the camera to the current tour stop. Retries briefly if the organ is
  // still loading, since the hotspots only exist once the model is placed.
  const step = tour?.step ?? -1;
  useEffect(() => {
    if (step < 0) return;
    const hotspot = organ.hotspots[step];
    if (!hotspot) return;
    let attempts = 0;
    let timer = 0;
    const tryFocus = () => {
      if (viewerRef.current?.focusHotspot(hotspot.id)) return;
      if (attempts++ < 20) timer = window.setTimeout(tryFocus, 150);
    };
    tryFocus();
    return () => window.clearTimeout(timer);
  }, [step, organ]);

  const finishTour = useCallback(() => {
    setTour(null);
    viewerRef.current?.reset();
    onTourComplete();
  }, [onTourComplete]);

  const goToStep = useCallback((next: number) => {
    if (next >= organRef.current.hotspots.length) {
      finishTour();
      return;
    }
    setTour((current) => (current ? { ...current, step: Math.max(0, next) } : current));
  }, [finishTour]);

  // Autoplay advances on a timer; any manual step restarts the countdown.
  useEffect(() => {
    if (!tour?.playing) return;
    const timer = window.setTimeout(() => goToStep(tour.step + 1), TOUR_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [tour, goToStep]);

  const startTour = useCallback(() => {
    if (organRef.current.hotspots.length === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTour({ step: 0, playing: !reduced });
  }, []);

  const exitTour = () => {
    setTour(null);
    viewerRef.current?.reset();
  };

  useImperativeHandle(ref, () => ({ startTour }), [startTour]);

  // The viewer drives the callout's position directly, so a spinning model
  // never costs a React render.
  const calloutRef = useCallback((node: HTMLDivElement | null) => {
    viewerRef.current?.attachCallout(node);
  }, []);

  const handleTool = (tool: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (tool === "compare" && locked) { onLockedAction(); return; }
    if (tool === "rotate") onAutoRotate(!autoRotate);
    if (tool === "zoom") viewer.zoom(-1);
    if (tool === "isolate") setActiveTool(viewer.toggleIsolate() ? tool : null);
    if (tool === "section") setActiveTool(viewer.toggleCrossSection() ? tool : null);
    if (tool === "layers") setActiveTool(viewer.toggleLayers() ? tool : null);
    if (tool === "compare") onCompare();
    if (tool === "reset") {
      viewer.reset();
      setActiveTool(null);
      setTour(null);
    }
  };

  const tools = [
    { id: "rotate", label: "Rotar", icon: RotateCcw, pressed: autoRotate },
    { id: "zoom", label: "Acercar", icon: Search, pressed: false },
    { id: "isolate", label: "Aislar", icon: CircleDashed, pressed: activeTool === "isolate" },
    { id: "section", label: "Corte", icon: ScanLine, pressed: activeTool === "section" },
    { id: "layers", label: "Malla", icon: Layers3, pressed: activeTool === "layers" },
    { id: "compare", label: "Comparar", icon: locked ? Lock : Box, pressed: compare },
    { id: "reset", label: "Reiniciar", icon: RotateCcw, pressed: false },
  ];

  const currentStop = tour ? organ.hotspots[tour.step] : null;

  return (
    <section className={`viewer-shell ${tour ? "touring" : ""}`} aria-label={`Visor interactivo de ${organ.name.toLowerCase()}`}>
      <div className="viewer-glow" style={{ "--organ-accent": organ.accent } as React.CSSProperties} />
      <div className="viewer-grid" aria-hidden="true" />
      <div ref={mountRef} className="three-mount" />

      <div className="viewer-tools" role="toolbar" aria-label="Herramientas del visor 3D">
        {tools.map(({ id, label, icon: Icon, pressed }) => (
          <button
            key={id}
            type="button"
            className={`tool-button ${pressed ? "active" : ""}`}
            onClick={() => handleTool(id)}
            aria-pressed={id === "zoom" || id === "reset" ? undefined : pressed}
            title={label}
          >
            <Icon size={19} strokeWidth={1.65} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="viewer-actions">
        <button type="button" className="tour-launch" onClick={tour ? exitTour : startTour} aria-pressed={Boolean(tour)}>
          <Route size={15} /> {tour ? "Salir del recorrido" : "Recorrido guiado"}
        </button>
        <button
          type="button"
          className={`physiology-toggle ${physiology ? "on" : ""}`}
          onClick={() => onPhysiology(!physiology)}
          aria-pressed={physiology}
          title={motion.description}
        >
          <Activity size={15} className="physiology-icon" /> {motion.label}
          <span className={`switch ${physiology ? "on" : ""}`} aria-hidden="true"><i /></span>
        </button>
      </div>

      {!tour && (
        <aside className="tip-note" aria-label="Controles del visor">
          <span><MousePointerClick size={14} /> Controles</span>
          <ul>
            <li><kbd>Arrastrar</kbd> rotar</li>
            <li><kbd>Rueda</kbd> / <kbd>pellizco</kbd> zoom</li>
            <li><kbd>Clic</kbd> en un punto: estructura</li>
          </ul>
        </aside>
      )}

      {selected && (
        <div className="hotspot-callout" ref={calloutRef} data-side="right">
          <div className="callout-body" style={{ "--hotspot-color": selected.color } as React.CSSProperties}>
            <button className="callout-close" type="button" onClick={() => viewerRef.current?.clearSelection()} aria-label="Cerrar">
              <X size={13} />
            </button>
            <b>{selected.label}</b>
            <small>{selected.detail}</small>
          </div>
        </div>
      )}

      {tour && currentStop && (
        <div className="tour-panel" role="region" aria-label="Recorrido guiado" aria-live="polite">
          <div className="tour-progress" aria-hidden="true">
            {organ.hotspots.map((hotspot, index) => (
              <i
                key={hotspot.id}
                className={index < tour.step ? "done" : index === tour.step ? "current" : ""}
                style={index === tour.step && tour.playing ? ({ "--step-ms": `${TOUR_STEP_MS}ms` } as React.CSSProperties) : undefined}
              />
            ))}
          </div>
          <div className="tour-body" key={currentStop.id}>
            <span className="tour-step">Estructura {tour.step + 1} de {organ.hotspots.length}</span>
            <strong style={{ "--hotspot-color": currentStop.color } as React.CSSProperties}>{currentStop.label}</strong>
            <p>{currentStop.detail}.</p>
          </div>
          <div className="tour-controls">
            <button type="button" onClick={() => goToStep(tour.step - 1)} disabled={tour.step === 0} aria-label="Estructura anterior">
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setTour({ ...tour, playing: !tour.playing })}
              aria-label={tour.playing ? "Pausar recorrido" : "Reproducir recorrido"}
            >
              {tour.playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button type="button" className="primary" onClick={() => goToStep(tour.step + 1)}>
              {tour.step === organ.hotspots.length - 1 ? "Finalizar" : "Siguiente"} <ArrowRight size={15} />
            </button>
            <button type="button" onClick={exitTour} aria-label="Salir del recorrido"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Screen-reader equivalent of the dots, which live in the canvas. */}
      <ul className="hotspot-index">
        {organ.hotspots.map((hotspot) => (
          <li key={hotspot.id}>{hotspot.label}: {hotspot.detail}</li>
        ))}
      </ul>

      {loading && slowLoad && (
        <div className="model-loader" role="status" aria-live="polite">
          <div className="loader-orbit"><Maximize2 size={20} /></div>
          <strong>Preparando {organ.name.toLowerCase()}</strong>
          <span className="loader-bar"><i style={{ transform: `scaleX(${Math.max(0.08, progress)})` }} /></span>
          <span>{Math.max(8, Math.round(progress * 100))}%</span>
        </div>
      )}

      {!tour && (
        <div className="view-caption">
          <span>Espécimen 3D · {organ.hotspots.length} estructuras</span>
          <strong>{organ.scientificName}</strong>
        </div>
      )}
    </section>
  );
}
