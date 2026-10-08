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
import { GameBestCard } from "../game/GameBestCard";
import { ResendVerificationButton } from "../AccountForms";
import { CountUp } from "../ui/CountUp";
import { DashShell, roleLabel } from "./DashShell";
import type { AtlasContent } from "../../content";
import type { Locale } from "../../i18n/config";
import { format } from "../../i18n/format";
import type { Messages } from "../../i18n/messages/es-MX";
import { organById as baseOrganById, type OrganId } from "../../lib/anatomy-data";
import { PLANS, formatMXN, hasFeature } from "../../lib/plans";
import type { SessionUser } from "../../lib/server/auth-store";
import type { DashboardStats, OrganProgress } from "../../lib/server/progress-store";

function timeAgo(relativeTime: Intl.RelativeTimeFormat, timestamp: number, now: number): string {
  const minutes = Math.round((timestamp - now) / 60_000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour");
  return relativeTime.format(Math.round(hours / 24), "day");
}

function greeting(now: number, d: Messages["dashboard"]): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Mexico_City" }).format(now));
  if (hour < 12) return d.morning;
  if (hour < 19) return d.afternoon;
  return d.evening;
}

/** Siguiente órgano a estudiar: el de menor dominio al que el plan da acceso. */
function recommend(progress: readonly OrganProgress[], user: SessionUser): OrganProgress {
  const accessible = progress.filter((item) => baseOrganById[item.organId].tier === "free" || hasFeature(user.plan, "allOrgans"));
  return [...accessible].sort((a, b) => a.mastery - b.mastery || (a.lastStudiedAt ?? 0) - (b.lastStudiedAt ?? 0))[0] ?? progress[0];
}

function nextStepFor(item: OrganProgress, d: Messages["dashboard"]): string {
  if (item.views === 0) return d.nextExplore;
  if (item.toursCompleted === 0) return d.nextTour;
  if (item.quizAttempts === 0 || item.quizCorrect < item.quizAttempts) return d.nextQuiz;
  return d.nextReview;
}

type Props = {
  user: SessionUser;
  stats: DashboardStats;
  now: number;
  passwordUpdated?: boolean;
  locale: Locale;
  m: Messages;
  content: Pick<AtlasContent, "organs" | "guides">;
};

export function Dashboard({ user, stats, now, passwordUpdated = false, locale, m, content }: Props) {
  const d = m.dashboard;
  const organById = Object.fromEntries(content.organs.map((organ) => [organ.id, organ])) as Record<OrganId, AtlasContent["organs"][number]>;
  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const kindLabel = { view: d.kindView, tour: d.kindTour, quiz: d.kindQuiz, placement: d.kindPlacement } as const;
  const studentPrice = PLANS.find((item) => item.id === "student")?.monthlyPrice ?? 0;
  const firstName = user.name.split(" ")[0];
  const next = recommend(stats.organs, user);
  const nextOrgan = organById[next.organId];
  const sorted = [...stats.organs].sort((a, b) => b.mastery - a.mastery);

  const kpis = [
    { icon: Eye, label: d.organsStudied, value: stats.organsStudied, suffix: `/ ${stats.organs.length}` },
    { icon: Target, label: d.averageMastery, value: stats.averageMastery, suffix: "%" },
    { icon: CircleHelp, label: d.quizAccuracy, value: stats.quizAccuracy, suffix: stats.quizAccuracy === null ? "" : "%" },
    { icon: Flame, label: d.streak, value: stats.streakDays, suffix: stats.streakDays === 1 ? d.day : d.days },
  ];

  return (
    <DashShell user={user} active="dashboard" m={m}>
        <header className="dash-header animate__animated animate__fadeInDown">
          <div>
            <span className="eyebrow">{format(d.greeting, { greeting: greeting(now, d), name: firstName })}</span>
            <h1>{d.title}</h1>
            <p>{roleLabel(user, m)}{user.institution ? ` · ${user.institution}` : ""}</p>
          </div>
          <div className={`dash-plan ${user.plan}`}>
            <small>{d.planCurrent}</small>
            <b>{m.plans.catalog[user.plan].name}</b>
            {user.plan === "free" ? (
              <Link href="/atlas?panel=plans">{format(d.upgrade, { price: formatMXN(studentPrice) })} <ArrowRight size={14} /></Link>
            ) : (
              <Link href="/cuenta">{d.manage} <ArrowRight size={14} /></Link>
            )}
          </div>
        </header>

        {passwordUpdated && <p className="form-success animate__animated animate__fadeInDown" role="status">{d.passwordUpdated}</p>}
        {!user.emailVerified && (
          <div className="verify-banner animate__animated animate__fadeInUp" role="status">
            <MailWarning size={18} className="animate__animated animate__headShake animate__delay-1s" />
            <p><b>{d.verifyTitle}</b> {format(d.verifyText, { email: user.email })}</p>
            <ResendVerificationButton />
          </div>
        )}

        <section className="kpi-grid" aria-label={d.kpis}>
          {kpis.map(({ icon: Icon, label, value, suffix }, index) => (
            <article key={index} className="kpi" style={{ "--i": index } as React.CSSProperties}>
              <span className="kpi-icon"><Icon size={18} /></span>
              <p>{label}</p>
              <strong>{value === null ? "—" : <CountUp value={value} />}<small> {suffix}</small></strong>
            </article>
          ))}
        </section>

        <div className="dash-grid">
          <section className="dash-card next-card" aria-labelledby="next-title" style={{ "--accent": nextOrgan.accent } as React.CSSProperties}>
            <span className="eyebrow"><Sparkles size={14} /> {d.next}</span>
            <div className="next-body">
              <img src={`/anatomy/${nextOrgan.id}/organ.webp`} alt="" width={120} height={120} />
              <div>
                <h2 id="next-title">{nextOrgan.name}</h2>
                <small>{nextOrgan.system}</small>
                <p>{nextStepFor(next, d)}</p>
                <p className="next-objective"><Target size={14} /> {content.guides[next.organId].objectives[0]}</p>
              </div>
            </div>
            <Link className="btn btn-primary" href={`/atlas?organ=${nextOrgan.id}`}>
              <Route size={16} /> {format(d.study, { organ: nextOrgan.name.toLowerCase() })}
            </Link>
          </section>

          <section className="dash-card" aria-label={d.activityRegion}>
            <ActivityChart days={stats.activity} />
          </section>

          <GameBestCard />

          <section className="dash-card mastery-card" aria-labelledby="mastery-title">
            <header>
              <h2 id="mastery-title"><TrendingUp size={17} /> {d.masteryTitle}</h2>
              <small>{d.masteryLegend}</small>
            </header>
            <ul className="mastery-list">
              {sorted.map((item, index) => {
                const organ = organById[item.organId as OrganId];
                const locked = organ.tier === "pro" && !hasFeature(user.plan, "allOrgans");
                return (
                  <li key={item.organId} style={{ "--i": index } as React.CSSProperties}>
                    <Link href={`/atlas?organ=${item.organId}`}>
                      <img src={`/anatomy/${item.organId}/thumb.webp`} alt="" width={40} height={40} loading="lazy" />
                      <span className="mastery-name"><b>{organ.name}</b><small>{locked ? d.requiresStudent : item.lastStudiedAt ? format(d.lastStudied, { time: timeAgo(relativeTime, item.lastStudiedAt, now) }) : d.notStarted}</small></span>
                      <span className="mastery-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.mastery} aria-label={format(d.masteryOf, { organ: organ.name })}>
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
            <header><h2 id="recent-title"><BookOpenCheck size={17} /> {d.recentTitle}</h2></header>
            {stats.recent.length === 0 ? (
              <div className="dash-empty">
                <p>{d.emptyRecent}</p>
                <Link className="btn btn-outline" href="/atlas"><Box size={16} /> {d.openAtlas}</Link>
              </div>
            ) : (
              <ul className="recent-list">
                {stats.recent.map((event, index) => (
                  <li key={`${event.kind}-${event.organId}-${event.createdAt}`} style={{ "--i": index } as React.CSSProperties}>
                    <span className={`recent-dot ${event.kind}`} aria-hidden="true" />
                    <p>
                      {kindLabel[event.kind]} <b>{organById[event.organId].name.toLowerCase()}</b>
                      {(event.kind === "quiz" || event.kind === "placement") && <em className={event.correct ? "ok" : "ko"}>{event.correct ? d.correct : d.incorrect}</em>}
                    </p>
                    <time dateTime={new Date(event.createdAt).toISOString()}>{timeAgo(relativeTime, event.createdAt, now)}</time>
                  </li>
                ))}
              </ul>
            )}
            <dl className="recent-totals">
              <div><dt>{d.tours}</dt><dd><CountUp value={stats.toursCompleted} /></dd></div>
              <div><dt>{d.quizzes}</dt><dd><CountUp value={stats.quizAttempts} /></dd></div>
            </dl>
          </section>
        </div>
    </DashShell>
  );
}
