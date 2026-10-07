"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
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

type Props = {
  open: boolean;
  plan: PlanId;
  onSetPlan: (plan: PlanId) => void;
  onClose: () => void;
};

export function PlansDialog({ open, plan, onSetPlan, onClose }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const discountLabel = `${Math.round(ANNUAL_DISCOUNT * 100)} %`;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="plans-title" variant="wide" className="plans-modal">
      <span className="modal-icon clinical"><CreditCard size={24} /></span>
      <em>Planes de Atlas Anatómico</em>
      <h2 id="plans-title">Elige cómo quieres aprender</h2>
      <p>Precios en pesos mexicanos con IVA incluido. Cambia o cancela cuando quieras.</p>

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
              ) : (
                <button
                  type="button"
                  className={item.highlight ? "primary" : ""}
                  onClick={() => onSetPlan(item.id)}
                >
                  {isFree ? "Cambiar a Gratis" : `Elegir ${item.name}`}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <p className="plans-trust"><ShieldCheck size={15} /> Pagos con tarjeta, OXXO o transferencia SPEI · Factura CFDI disponible</p>
      <small className="plans-disclaimer">Vista de demostración: el cambio de plan es local a este dispositivo y no procesa pagos reales.</small>
    </Dialog>
  );
}
