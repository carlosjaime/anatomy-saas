"use client";

import { Suspense, type ReactNode } from "react";
import { I18nProvider } from "../i18n/client";
import type { Locale } from "../i18n/config";
import type { Messages } from "../i18n/messages/es-MX";
import { NavigationProgress } from "./ui/NavigationProgress";
import { Ripple } from "./ui/Ripple";
import { ToastProvider } from "./ui/Toast";

/** Proveedores globales del lado cliente: idioma, toasts y micro-interacciones. */
export function Providers({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ToastProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Ripple />
        <div className="locale-root">{children}</div>
      </ToastProvider>
    </I18nProvider>
  );
}
