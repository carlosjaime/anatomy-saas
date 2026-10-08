"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useI18n } from "../../i18n/client";
import { logout } from "../../lib/client-api";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { flashToast } from "../ui/Toast";
import { startNavigationProgress } from "../ui/NavigationProgress";

/** Cierre de sesión con confirmación; el aviso se muestra ya en la portada. */
export function LogoutButton({ className = "" }: { className?: string }) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);

  const confirm = async () => {
    await logout();
    flashToast(m.toasts.loggedOut, "info");
    startNavigationProgress();
    window.location.assign("/");
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} data-testid="logout">
        <LogOut size={17} />
        <span>{m.nav.logout}</span>
      </button>
      <ConfirmDialog
        open={open}
        title={m.confirm.logoutTitle}
        message={m.confirm.logoutText}
        confirmLabel={m.confirm.logoutConfirm}
        icon={<LogOut size={22} />}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
