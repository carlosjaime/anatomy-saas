"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { useI18n } from "./i18n/client";

/** Límite de error por segmento: mantiene el layout (idioma, toasts) y permite reintentar. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { m } = useI18n();
  const p = m.pages;

  useEffect(() => {
    console.error("[ui]", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="status-page" id="main">
      <div className="status-card animate__animated animate__zoomIn" role="alert">
        <span className="modal-icon danger animate__animated animate__headShake"><AlertTriangle size={26} /></span>
        <h1>{p.errorTitle}</h1>
        <p>{p.errorText}</p>
        <div className="status-actions">
          <Link className="btn btn-outline" href="/"><ArrowLeft size={16} /> {p.goHome}</Link>
          <button type="button" className="btn btn-primary" onClick={reset}><RotateCcw size={16} /> {p.retry}</button>
        </div>
      </div>
    </main>
  );
}
