"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Dialog } from "./Dialog";
import { useToast } from "./ui/Toast";
import { startNavigationProgress } from "./ui/NavigationProgress";
import { useI18n } from "../i18n/client";
import { postJson } from "../lib/client-api";
import {
  ANNUAL_DISCOUNT,
  PLANS,
  annualSavings,
  billedAmount,
  formatMXN,
  monthlyEquivalent,
  type BillingCycle,
  type PlanId,
} from "../lib/plans";

/**
 * Cifra que interpola entre valores al cambiar el ciclo de facturación.
 * Escribe directamente en el DOM para no provocar un render por fotograma.
 */
function AnimatedPrice({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const state = { amount: current.current };
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.55;
    const settle = () => {
      current.current = value;
      node.textContent = formatMXN(value);
    };
    const tween = gsap.to(state, {
      amount: value,
      duration,
      ease: "power3.out",
      onUpdate: () => {
        current.current = state.amount;
        node.textContent = formatMXN(state.amount);
      },
      onComplete: settle,
    });
    // Si el navegador pausa requestAnimationFrame (pestaña en segundo plano,
    // CPU saturada), el precio nunca debe quedarse en un valor intermedio.
    const fallback = window.setTimeout(() => {
      tween.kill();
      settle();
    }, duration * 1000 + 200);
    return () => {
      window.clearTimeout(fallback);
      tween.kill();
    };
  }, [value]);

  return <span ref={ref}>{formatMXN(value)}</span>;
}

export type PlansViewer = { trialAvailable: boolean; emailVerified: boolean } | null;

type Props = {
  open: boolean;
  plan: PlanId;
  onClose: () => void;
  /** `null` para invitados: los planes de pago requieren una cuenta. */
  viewer: PlansViewer;
};

export function PlansDialog({ open, plan, onClose, viewer }: Props) {
  const { m, t } = useI18n();
  const toast = useToast();
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const discountLabel = `${Math.round(ANNUAL_DISCOUNT * 100)} %`;
  const trial = Boolean(viewer?.trialAvailable);
  const p = m.plans;

  const checkout = async (target: PlanId) => {
    setPendingPlan(target);
    setError(null);
    const result = await postJson<{ checkoutUrl: string }>("/api/billing/checkout", { plan: target, cycle });
    if (result.ok) {
      toast.info(m.toasts.redirecting);
      startNavigationProgress();
      // Mercado Pago aloja el formulario de pago; volvemos a /cuenta al terminar.
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setPendingPlan(null);
    setError(result.error);
    toast.error(result.error);
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="plans-title" variant="wide" className="plans-modal">
      <span className="modal-icon clinical animate__animated animate__bounceIn"><CreditCard size={24} /></span>
      <em>{p.kicker}</em>
      <h2 id="plans-title">{p.title}</h2>
      <p>
        {p.intro}
        {trial && <> <b className="trial-note">{p.trialNote}</b></>}
      </p>

      <div className="billing-toggle" role="radiogroup" aria-label={p.cycle} data-cycle={cycle}>
        <span className="billing-indicator" aria-hidden="true" />
        <button type="button" role="radio" aria-checked={cycle === "monthly"} onClick={() => setCycle("monthly")}>
          {p.monthly}
        </button>
        <button type="button" role="radio" aria-checked={cycle === "annual"} onClick={() => setCycle("annual")}>
          {p.annual} <span className="discount-pill">−{discountLabel}</span>
        </button>
      </div>

      <div className="plans-grid">
        {PLANS.map((item, index) => {
          const copy = p.catalog[item.id];
          const isCurrent = item.id === plan;
          const isFree = item.monthlyPrice === 0;
          return (
            <article
              key={item.id}
              className={`plan-card ${item.highlight ? "highlight" : ""} ${isCurrent ? "current" : ""}`}
              style={{ "--i": index } as React.CSSProperties}
              aria-label={t(p.planLabel, { name: copy.name })}
            >
              {item.highlight && <span className="plan-ribbon">{p.ribbon}</span>}
              <b>{copy.name}</b>
              <small className="plan-tagline">{copy.tagline}</small>
              <strong className="plan-price">
                <AnimatedPrice value={monthlyEquivalent(item.id, cycle)} />
                <small> {isFree ? p.mxn : p.perMonth}</small>
              </strong>
              <small className="plan-billing">
                {isFree
                  ? p.noCard
                  : cycle === "annual"
                    ? t(p.annualBilling, { total: formatMXN(billedAmount(item.id, "annual")), savings: formatMXN(annualSavings(item.id)) })
                    : p.monthlyBilling}
              </small>
              <ul>
                {copy.perks.map((perk) => (
                  <li key={perk}><Check size={14} /> {perk}</li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="current-badge">{p.current}</span>
              ) : isFree ? (
                <Link className="plan-link" href={viewer ? "/cuenta" : "/registro?next=/atlas"}>
                  {viewer ? p.manage : p.createFree}
                </Link>
              ) : !viewer ? (
                <Link className={`plan-link ${item.highlight ? "primary" : ""}`} href="/registro?next=%2Fatlas%3Fpanel%3Dplans">
                  {p.createAndTry}
                </Link>
              ) : (
                <button
                  type="button"
                  className={item.highlight ? "primary" : ""}
                  disabled={pendingPlan !== null}
                  aria-busy={pendingPlan === item.id}
                  onClick={() => checkout(item.id)}
                  data-testid={`checkout-${item.id}`}
                >
                  {pendingPlan === item.id ? <Loader2 size={15} className="spin" /> : null}
                  {pendingPlan === item.id ? p.opening : trial ? p.tryFree : t(p.choose, { name: copy.name })}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {error && (
        <p className="form-alert animate__animated animate__headShake" role="alert">
          {error} {viewer && !viewer.emailVerified && <Link href="/cuenta">{p.resend}</Link>}
        </p>
      )}
      <p className="plans-trust"><ShieldCheck size={15} /> {p.trust}</p>
      <small className="plans-disclaimer">
        {viewer ? (trial ? p.trialDisclaimer : p.renewDisclaimer) : <>{p.guestDisclaimer} <Link href="/registro?next=%2Fatlas%3Fpanel%3Dplans">{p.guestCta}</Link>.</>}
      </small>
    </Dialog>
  );
}
