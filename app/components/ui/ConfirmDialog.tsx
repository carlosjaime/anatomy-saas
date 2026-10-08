"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "../Dialog";
import { useI18n } from "../../i18n/client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  icon?: ReactNode;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

/** Modal de confirmación accesible con estado de carga mientras se ejecuta la acción. */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, tone = "default", icon, onConfirm, onClose }: Props) {
  const { m } = useI18n();
  const [pending, setPending] = useState(false);
  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onClose={pending ? () => {} : onClose} labelledBy="confirm-title" className="confirm-dialog" initialFocus=".confirm-actions .btn-outline">
      {icon && <span className={`modal-icon ${tone === "danger" ? "danger" : "clinical"} animate__animated animate__bounceIn`}>{icon}</span>}
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="confirm-actions">
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={pending}>{cancelLabel ?? m.common.cancel}</button>
        <button type="button" className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={confirm} disabled={pending} data-testid="confirm-action">
          {pending && <Loader2 size={16} className="spin" />} {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
