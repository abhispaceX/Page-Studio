"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        "text-sm font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
      }
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
