import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Box,
  CircleHelp,
  Eye,
  Flame,
  MailWarning,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { ActivityChart } from "./ActivityChart";
import { ResendVerificationButton } from "../AccountForms";
import { DashShell } from "./DashShell";
import { organById, type OrganId } from "../../lib/anatomy-data";
import { studyGuides } from "../../lib/encyclopedia-data";
import { hasFeature, planById } from "../../lib/plans";
import { ROLE_OPTIONS } from "../../lib/validation";
import type { SessionUser } from "../../lib/server/auth-store";
import type { DashboardStats, OrganProgress } from "../../lib/server/progress-store";

const KIND_LABEL = { view: "Exploraste", tour: "Completaste el recorrido de", quiz: "Respondiste el cuestionario de" } as const;
const relativeTime = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });

function timeAgo(timestamp: number, now: number): string {
  const minutes = Math.round((timestamp - now) / 60_000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour");
  return relativeTime.format(Math.round(hours / 24), "day");
}

function greeting(now: number): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Mexico_City" }).format(now));
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Siguiente órgano a estudiar: el de menor dominio al que el plan da acceso. */
function recommend(progress: readonly OrganProgress[], user: SessionUser): OrganProgress {
  const accessible = progress.filter((item) => organById[item.organId].tier === "free" || hasFeature(user.plan, "allOrgans"));
  return [...accessible].sort((a, b) => a.mastery - b.mastery || (a.lastStudiedAt ?? 0) - (b.lastStudiedAt ?? 0))[0] ?? progress[0];
}

function nextStepFor(item: OrganProgress): string {
  if (item.views === 0) return "Explora el modelo 3D y lee los objetivos de aprendizaje.";
  if (item.toursCompleted === 0) return "Completa el recorrido guiado por sus estructuras.";
  if (item.quizAttempts === 0 || item.quizCorrect < item.quizAttempts) return "Responde el cuestionario para consolidar lo aprendido.";
  return "Repasa la correlación clínica en la enciclopedia.";
}

export function Dashboard({ user, stats, now, passwordUpdated = false }: { user: SessionUser; stats: DashboardStats; now: number; passwordUpdated?: boolean }) {
  const plan = planById[user.plan];
  const role = ROLE_OPTIONS.find((option) => option.id === user.role)?.label ?? "Profesional de la salud";
  const firstName = user.name.split(" ")[0];
  const next = recommend(stats.organs, user);
  const nextOrgan = organById[next.organId];
  const sorted = [...stats.organs].sort((a, b) => b.mastery - a.mastery);

  const kpis = [
    { icon: Eye, label: "Órganos estudiados", value: `${stats.organsStudied}`, suffix: `/ ${stats.organs.length}` },
    { icon: Target, label: "Dominio promedio", value: `${stats.averageMastery}`, suffix: "%" },
    { icon: CircleHelp, label: "Precisión en cuestionarios", value: stats.quizAccuracy === null ? "—" : `${stats.quizAccuracy}`, suffix: stats.quizAccuracy === null ? "" : "%" },
    { icon: Flame, label: "Racha de estudio", value: `${stats.streakDays}`, suffix: stats.streakDays === 1 ? "día" : "días" },
  ];

  return (
    <DashShell user={user} active="dashboard">
        <header className="dash-header" data-animate-in>
          <div>
            <span className="eyebrow">{greeting(now)}, {firstName}</span>
            <h1>Tu panel de estudio</h1>
            <p>{role}{user.institution ? ` · ${user.institution}` : ""}</p>
          </div>
          <div className={`dash-plan ${user.plan}`}>
            <small>Plan actual</small>
            <b>{plan.name}</b>
            {user.plan === "free" ? (
              <Link href="/atlas?panel=plans">Mejorar desde $129 MXN <ArrowRight size={14} /></Link>
            ) : (
              <Link href="/cuenta">Gestionar suscripción <ArrowRight size={14} /></Link>
            )}
          </div>
        </header>

        {passwordUpdated && <p className="form-success" role="status">Tu contraseña se actualizó y cerramos tus demás sesiones.</p>}
        {!user.emailVerified && (
          <div className="verify-banner" role="status">
            <MailWarning size={18} />
            <p><b>Confirma tu correo</b> para poder suscribirte. Te enviamos un enlace a {user.email}.</p>
            <ResendVerificationButton />
          </div>
        )}

        <section className="kpi-grid" aria-label="Indicadores">
          {kpis.map(({ icon: Icon, label, value, suffix }, index) => (
            <article key={label} className="kpi" style={{ "--i": index } as React.CSSProperties}>
              <span className="kpi-icon"><Icon size={18} /></span>
              <p>{label}</p>
              <strong>{value}<small> {suffix}</small></strong>
            </article>
          ))}
        </section>

        <div className="dash-grid">
          <section className="dash-card next-card" aria-labelledby="next-title" style={{ "--accent": nextOrgan.accent } as React.CSSProperties}>
            <span className="eyebrow"><Sparkles size={14} /> Siguiente recomendado</span>
            <div className="next-body">
              <img src={`/anatomy/${nextOrgan.id}/organ.webp`} alt="" width={120} height={120} />
              <div>
                <h2 id="next-title">{nextOrgan.name}</h2>
                <small>{nextOrgan.system}</small>
                <p>{nextStepFor(next)}</p>
                <p className="next-objective"><Target size={14} /> {studyGuides[next.organId].objectives[0]}</p>
              </div>
            </div>
            <Link className="btn btn-primary" href={`/atlas?organ=${nextOrgan.id}`}>
              <Route size={16} /> Estudiar {nextOrgan.name.toLowerCase()}
            </Link>
          </section>

          <section className="dash-card" aria-label="Actividad">
            <ActivityChart days={stats.activity} />
          </section>

          <section className="dash-card mastery-card" aria-labelledby="mastery-title">
            <header>
              <h2 id="mastery-title"><TrendingUp size={17} /> Dominio por órgano</h2>
              <small>Exploración 25 % · Recorrido 35 % · Cuestionario 40 %</small>
            </header>
            <ul className="mastery-list">
              {sorted.map((item) => {
                const organ = organById[item.organId as OrganId];
                const locked = organ.tier === "pro" && !hasFeature(user.plan, "allOrgans");
                return (
                  <li key={item.organId}>
                    <Link href={`/atlas?organ=${item.organId}`}>
                      <img src={`/anatomy/${item.organId}/thumb.webp`} alt="" width={40} height={40} loading="lazy" />
                      <span className="mastery-name"><b>{organ.name}</b><small>{locked ? "Requiere plan Estudiante" : item.lastStudiedAt ? `Último estudio ${timeAgo(item.lastStudiedAt, now)}` : "Sin iniciar"}</small></span>
                      <span className="mastery-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.mastery} aria-label={`Dominio de ${organ.name}`}>
                        <i style={{ "--v": item.mastery / 100 } as React.CSSProperties} />
                      </span>
                      <span className="mastery-value">{item.mastery}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="dash-card recent-card" aria-labelledby="recent-title">
            <header><h2 id="recent-title"><BookOpenCheck size={17} /> Actividad reciente</h2></header>
            {stats.recent.length === 0 ? (
              <div className="dash-empty">
                <p>Aún no hay actividad. Abre el atlas, elige un órgano e inicia su recorrido guiado.</p>
                <Link className="btn btn-outline" href="/atlas"><Box size={16} /> Abrir el atlas</Link>
              </div>
            ) : (
              <ul className="recent-list">
                {stats.recent.map((event) => (
                  <li key={`${event.kind}-${event.organId}-${event.createdAt}`}>
                    <span className={`recent-dot ${event.kind}`} aria-hidden="true" />
                    <p>
                      {KIND_LABEL[event.kind]} <b>{organById[event.organId].name.toLowerCase()}</b>
                      {event.kind === "quiz" && <em className={event.correct ? "ok" : "ko"}>{event.correct ? "Correcta" : "Incorrecta"}</em>}
                    </p>
                    <time dateTime={new Date(event.createdAt).toISOString()}>{timeAgo(event.createdAt, now)}</time>
                  </li>
                ))}
              </ul>
            )}
            <dl className="recent-totals">
              <div><dt>Recorridos</dt><dd>{stats.toursCompleted}</dd></div>
              <div><dt>Cuestionarios</dt><dd>{stats.quizAttempts}</dd></div>
            </dl>
          </section>
        </div>
    </DashShell>
  );
}
