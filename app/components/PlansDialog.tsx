"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { postJson } from "../lib/client-api";
import { Dialog } from "./Dialog";
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
    const tween = gsap.to(state, {
      amount: value,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.55,
      ease: "power3.out",
      onUpdate: () => {
        current.current = state.amount;
        node.textContent = formatMXN(state.amount);
      },
    });
    return () => {
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
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const discountLabel = `${Math.round(ANNUAL_DISCOUNT * 100)} %`;
  const trial = Boolean(viewer?.trialAvailable);

  const checkout = async (target: PlanId) => {
    setPendingPlan(target);
    setError(null);
    const result = await postJson<{ checkoutUrl: string }>("/api/billing/checkout", { plan: target, cycle });
    if (result.ok) {
      // Mercado Pago aloja el formulario de pago; volvemos a /cuenta al terminar.
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setPendingPlan(null);
    setError(result.error);
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="plans-title" variant="wide" className="plans-modal">
      <span className="modal-icon clinical"><CreditCard size={24} /></span>
      <em>Planes de Atlas Anatómico</em>
      <h2 id="plans-title">Elige cómo quieres aprender</h2>
      <p>
        Precios en pesos mexicanos con IVA incluido. Cambia o cancela cuando quieras.
        {trial && <> <b className="trial-note">Tu primera suscripción incluye 7 días gratis.</b></>}
      </p>

      <div className="billing-toggle" role="radiogroup" aria-label="Ciclo de facturación" data-cycle={cycle}>
        <span className="billing-indicator" aria-hidden="true" />
        <button type="button" role="radio" aria-checked={cycle === "monthly"} onClick={() => setCycle("monthly")}>
          Mensual
        </button>
        <button type="button" role="radio" aria-checked={cycle === "annual"} onClick={() => setCycle("annual")}>
          Anual <span className="discount-pill">−{discountLabel}</span>
        </button>
      </div>

      <div className="plans-grid">
        {PLANS.map((item, index) => {
          const isCurrent = item.id === plan;
          const isFree = item.monthlyPrice === 0;
          const savings = annualSavings(item.id);
          return (
            <article
              key={item.id}
              className={`plan-card ${item.highlight ? "highlight" : ""} ${isCurrent ? "current" : ""}`}
              style={{ "--i": index } as React.CSSProperties}
              aria-label={`Plan ${item.name}`}
            >
              {item.highlight && <span className="plan-ribbon">Más elegido</span>}
              <b>{item.name}</b>
              <small className="plan-tagline">{item.tagline}</small>
              <strong className="plan-price">
                <AnimatedPrice value={monthlyEquivalent(item.id, cycle)} />
                <small>{isFree ? " MXN" : " MXN/mes"}</small>
              </strong>
              <small className="plan-billing">
                {isFree
                  ? "Sin tarjeta de crédito"
                  : cycle === "annual"
                    ? `${formatMXN(billedAmount(item.id, "annual"))} MXN al año · ahorras ${formatMXN(savings)}`
                    : "Facturación mensual"}
              </small>
              <ul>
                {item.perks.map((perk) => (
                  <li key={perk}><Check size={14} /> {perk}</li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="current-badge">Tu plan actual</span>
              ) : isFree ? (
                <Link className="plan-link" href={viewer ? "/cuenta" : "/registro?next=/atlas"}>
                  {viewer ? "Gestionar en Mi cuenta" : "Crear cuenta gratis"}
                </Link>
              ) : !viewer ? (
                <Link className={`plan-link ${item.highlight ? "primary" : ""}`} href="/registro?next=%2Fatlas%3Fpanel%3Dplans">
                  Crear cuenta y probar gratis
                </Link>
              ) : (
                <button
                  type="button"
                  className={item.highlight ? "primary" : ""}
                  disabled={pendingPlan !== null}
                  aria-busy={pendingPlan === item.id}
                  onClick={() => checkout(item.id)}
                >
                  {pendingPlan === item.id ? <Loader2 size={15} className="spin" /> : null}
                  {pendingPlan === item.id ? "Abriendo Mercado Pago…" : trial ? "Probar 7 días gratis" : `Elegir ${item.name}`}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {error && (
        <p className="form-alert" role="alert">
          {error} {viewer && !viewer.emailVerified && <Link href="/cuenta">Reenviar correo de confirmación</Link>}
        </p>
      )}
      <p className="plans-trust"><ShieldCheck size={15} /> Pago seguro con Mercado Pago · Cancela cuando quieras desde Mi cuenta</p>
      <small className="plans-disclaimer">
        {viewer
          ? trial
            ? "No se hace ningún cargo durante la prueba. Si cancelas antes de que termine, no pagas nada."
            : "El cargo se renueva automáticamente cada periodo hasta que canceles."
          : <>Para suscribirte necesitas una cuenta. <Link href="/registro?next=%2Fatlas%3Fpanel%3Dplans">Créala gratis</Link>.</>}
      </small>
    </Dialog>
  );
}
