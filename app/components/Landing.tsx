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
import { organs } from "../lib/anatomy-data";
import { glossary } from "../lib/encyclopedia-data";
import { PLANS, formatMXN, monthlyEquivalent } from "../lib/plans";
import type { SessionUser } from "../lib/server/auth-store";

const FEATURES = [
  { icon: Box, title: "Especímenes 3D interactivos", text: "Rota, aísla, corta y haz zoom sobre modelos anatómicos con estructuras señaladas en la superficie del órgano." },
  { icon: Route, title: "Recorridos guiados", text: "La cámara te lleva estructura por estructura, con la descripción de cada una, a tu ritmo o en reproducción automática." },
  { icon: Activity, title: "Fisiología en movimiento", text: "Observa el ciclo cardíaco a 72 lpm, la mecánica ventilatoria, las sacadas oculares y la peristalsis." },
  { icon: BookOpenCheck, title: "Enciclopedia clínica", text: "Anatomía, relaciones, histología, inervación, embriología y correlación clínica, con búsqueda sin acentos." },
  { icon: ClipboardCheck, title: "Objetivos y alto rendimiento", text: "Cada órgano incluye objetivos de aprendizaje, puntos clave para exámenes y una perla clínica." },
  { icon: LayoutDashboard, title: "Panel de progreso", text: "Dominio por órgano, precisión en cuestionarios, racha de estudio y recomendaciones de qué estudiar después." },
];

const AUDIENCES = [
  { icon: GraduationCap, title: "Estudiantes de medicina", text: "Construye un modelo mental tridimensional desde los primeros semestres de anatomía y fisiología." },
  { icon: ClipboardCheck, title: "Internos y residentes", text: "Repasa relaciones anatómicas y puntos de alto rendimiento antes de guardias, rotaciones y el ENARM." },
  { icon: Stethoscope, title: "Médicos", text: "Refresca anatomía aplicada y apóyate en los modelos para explicar diagnósticos a tus pacientes." },
  { icon: School, title: "Docentes", text: "Proyecta especímenes en clase y guía a tu grupo con recorridos y cuestionarios por órgano." },
];

const STEPS = [
  { title: "Crea tu cuenta", text: "Registro gratuito en menos de un minuto. Indica tu perfil para personalizar tu panel." },
  { title: "Explora y estudia", text: "Elige un órgano, inicia el recorrido guiado y responde el cuestionario de cada unidad." },
  { title: "Mide tu avance", text: "Tu panel muestra el dominio por órgano y te recomienda el siguiente tema." },
];

const FAQ = [
  { q: "¿Necesito instalar algo?", a: "No. Atlas Anatómico funciona en el navegador de tu computadora, tableta o teléfono, con modelos 3D optimizados para cargar rápido." },
  { q: "¿El contenido sustituye al libro de texto?", a: "No. Es un complemento visual e interactivo para tu bibliografía de referencia y tus clases. Está pensado para reforzar la comprensión espacial y repasar." },
  { q: "¿Puedo usarlo sin crear cuenta?", a: "Sí, en modo invitado puedes explorar el visor 3D. Con una cuenta gratuita además guardas tu progreso y accedes a tu panel de estudio." },
  { q: "¿Hay planes para universidades u hospitales?", a: "Sí. El plan Institucional incluye hasta 25 licencias y acompañamiento para docentes." },
];

export function Landing({ user }: { user: SessionUser | null }) {
  const featured = PLANS.filter((plan) => plan.id !== "institution");
  return (
    <div className="landing">
      <RevealOnScroll />
      <header className="landing-nav">
        <Link href="/" className="brand" aria-label="Atlas Anatómico, inicio"><BrandLockup /></Link>
        <nav aria-label="Secciones">
          <a href="#plataforma">Plataforma</a>
          <a href="#para-quien">Para quién</a>
          <a href="#planes">Planes</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <div className="landing-nav-actions">
          {user ? (
            <Link className="btn btn-primary" href="/dashboard"><LayoutDashboard size={16} /> Mi panel</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">Iniciar sesión</Link>
              <Link className="btn btn-primary" href="/registro">Crear cuenta</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><HeartPulse size={14} /> Plataforma de anatomía clínica</span>
            <h1>Anatomía humana en 3D, pensada para la <em>práctica médica</em>.</h1>
            <p>
              Especímenes interactivos, recorridos guiados y una enciclopedia con correlación clínica para estudiantes
              de medicina, residentes y médicos. Estudia la forma, entiende la función y mide tu avance.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-lg" href={user ? "/dashboard" : "/registro"}>
                {user ? "Continuar estudiando" : "Comenzar gratis"} <ArrowRight size={18} />
              </a>
              <Link className="btn btn-outline btn-lg" href="/atlas"><Box size={18} /> Explorar el atlas</Link>
            </div>
            <ul className="hero-trust">
              <li><Check size={15} /> Sin tarjeta de crédito</li>
              <li><Check size={15} /> Funciona en móvil y escritorio</li>
              <li><Check size={15} /> Precios en MXN</li>
            </ul>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-ring" />
            <div className="hero-ring ring-2" />
            <img src="/anatomy/heart/organ.webp" alt="" width={520} height={520} className="hero-organ" />
            <span className="hero-tag tag-1"><i style={{ "--c": "#e2614f" } as React.CSSProperties} /> Aorta<small>Arteria principal</small></span>
            <span className="hero-tag tag-2"><i style={{ "--c": "#f2a33b" } as React.CSSProperties} /> Ventrículo izquierdo<small>Bombea hacia el cuerpo</small></span>
            <span className="hero-tag tag-3"><i style={{ "--c": "#4f7fd1" } as React.CSSProperties} /> Aurícula derecha<small>Recibe sangre venosa</small></span>
            <div className="hero-ecg">
              <span><HeartPulse size={14} /> 72 lpm</span>
              <svg viewBox="0 0 220 40" preserveAspectRatio="none">
                <path pathLength="1" d="M0 22h40l6-8 6 8h18l5-18 7 34 6-16h16l8-6 8 6h95" />
              </svg>
            </div>
          </div>
        </section>

        <section className="stats-strip" aria-label="La plataforma en cifras">
          <div data-animate><strong>{organs.length}</strong><span>órganos en 3D</span></div>
          <div data-animate><strong>{organs.reduce((total, organ) => total + organ.hotspots.length, 0)}</strong><span>estructuras señaladas</span></div>
          <div data-animate><strong>{glossary.length}</strong><span>términos de glosario</span></div>
          <div data-animate><strong>7</strong><span>secciones por artículo</span></div>
        </section>

        <section className="landing-section" id="plataforma">
          <header data-animate>
            <span className="eyebrow"><Layers size={14} /> Plataforma</span>
            <h2>Todo lo que necesitas para estudiar anatomía con rigor</h2>
            <p>Diseñada con criterios de educación médica: de la estructura a la función y de la función a la clínica.</p>
          </header>
          <div className="feature-grid">
            {FEATURES.map(({ icon: Icon, title, text }, index) => (
              <article key={title} data-animate style={{ "--i": index } as React.CSSProperties}>
                <span className="feature-icon"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section organ-showcase" aria-labelledby="showcase-title">
          <header data-animate>
            <span className="eyebrow"><Microscope size={14} /> Biblioteca</span>
            <h2 id="showcase-title">Nueve sistemas, un mismo método de estudio</h2>
          </header>
          <ul className="showcase-grid">
            {organs.map((organ, index) => (
              <li key={organ.id} data-animate style={{ "--i": index, "--accent": organ.accent } as React.CSSProperties}>
                <Link href={`/atlas?organ=${organ.id}`}>
                  <img src={`/anatomy/${organ.id}/thumb.webp`} alt="" width={72} height={72} loading="lazy" decoding="async" />
                  <span><b>{organ.name}</b><small>{organ.system}</small></span>
                  {organ.tier === "pro" && <em>Pro</em>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section" id="para-quien">
          <header data-animate>
            <span className="eyebrow"><UserRound size={14} /> Para quién</span>
            <h2>Del aula a la práctica clínica</h2>
          </header>
          <div className="audience-grid">
            {AUDIENCES.map(({ icon: Icon, title, text }, index) => (
              <article key={title} data-animate style={{ "--i": index } as React.CSSProperties}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section steps-section" aria-labelledby="steps-title">
          <header data-animate>
            <span className="eyebrow"><Brain size={14} /> Cómo funciona</span>
            <h2 id="steps-title">Tres pasos para estudiar mejor</h2>
          </header>
          <ol className="steps">
            {STEPS.map((step, index) => (
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
            <span className="eyebrow"><ShieldCheck size={14} /> Planes</span>
            <h2>Precios claros en pesos mexicanos</h2>
            <p>IVA incluido. Mostramos el precio mensual con facturación anual; también puedes pagar mes a mes.</p>
          </header>
          <div className="landing-plans">
            {featured.map((plan, index) => (
              <article key={plan.id} className={plan.highlight ? "highlight" : ""} data-animate style={{ "--i": index } as React.CSSProperties}>
                {plan.highlight && <span className="plan-ribbon">Más elegido</span>}
                <b>{plan.name}</b>
                <small>{plan.tagline}</small>
                <strong>{formatMXN(monthlyEquivalent(plan.id, "annual"))}<small> MXN/mes</small></strong>
                <ul>
                  {plan.perks.map((perk) => <li key={perk}><Check size={14} /> {perk}</li>)}
                </ul>
                <a className={`btn ${plan.highlight ? "btn-primary" : "btn-outline"}`} href={user ? "/atlas?panel=plans" : "/registro"}>
                  {plan.monthlyPrice === 0 ? "Empezar gratis" : `Elegir ${plan.name}`}
                </a>
              </article>
            ))}
          </div>
          <p className="landing-note" data-animate>¿Universidad u hospital? El plan Institucional cubre hasta 25 licencias desde {formatMXN(monthlyEquivalent("institution", "annual"))} MXN/mes.</p>
        </section>

        <section className="landing-section faq" id="preguntas">
          <header data-animate>
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2>Resolvemos tus dudas</h2>
          </header>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details key={item.q} data-animate>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta" data-animate>
          <h2>Empieza hoy a estudiar anatomía en tres dimensiones</h2>
          <p>Gratis para siempre en el plan básico. Mejora cuando lo necesites.</p>
          <a className="btn btn-light btn-lg" href={user ? "/dashboard" : "/registro"}>
            {user ? "Ir a mi panel" : "Crear cuenta gratis"} <ArrowRight size={18} />
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandLockup compact />
        <p>Contenido con fines educativos. No sustituye el juicio clínico ni la consulta con un profesional de la salud.</p>
        <nav aria-label="Enlaces del pie">
          <Link href="/atlas">Atlas</Link>
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/registro">Registro</Link>
        </nav>
      </footer>
    </div>
  );
}
