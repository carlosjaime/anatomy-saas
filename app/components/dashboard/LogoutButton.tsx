"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { logout } from "../../lib/client-api";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await logout();
        window.location.assign("/");
      }}
    >
      {pending ? <Loader2 size={17} className="spin" /> : <LogOut size={17} />}
      <span>Cerrar sesión</span>
    </button>
  );
}
