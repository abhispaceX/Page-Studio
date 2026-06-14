"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, LogIn, Pencil, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SeededUser } from "@/lib/auth/users";
import type { Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const ROLE_META: Record<
  Role,
  {
    Icon: React.ComponentType<{ className?: string }>;
    tint: string;
    border: string;
    iconBg: string;
  }
> = {
  viewer: {
    Icon: Eye,
    tint: "from-slate-50 to-slate-100",
    border: "border-slate-300",
    iconBg: "bg-slate-200 text-slate-700",
  },
  editor: {
    Icon: Pencil,
    tint: "from-sky-50 to-sky-100",
    border: "border-sky-300",
    iconBg: "bg-sky-200 text-sky-800",
  },
  publisher: {
    Icon: ShieldCheck,
    tint: "from-violet-50 to-fuchsia-100",
    border: "border-violet-300",
    iconBg: "bg-violet-200 text-violet-800",
  },
};

export function LoginForm({
  users,
  next,
}: {
  users: SeededUser[];
  next: string;
}) {
  const router = useRouter();
  const [username, setUsername] = React.useState(
    users[users.length - 1]?.username ?? users[0]?.username ?? ""
  );
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Sign-in failed.");
        return;
      }
      router.push(next || "/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset className="space-y-2.5">
        <legend className="mb-1 text-sm font-semibold">Choose role</legend>

        {users.map((u) => {
          const { Icon, tint, border, iconBg } = ROLE_META[u.role];
          const selected = username === u.username;
          return (
            <label
              key={u.username}
              htmlFor={`role-${u.username}`}
              className={cn(
                "relative flex cursor-pointer items-start gap-3 rounded-xl border bg-gradient-to-br p-4 transition-all",
                selected
                  ? `${tint} ${border} shadow-sm ring-2 ring-offset-2 ring-violet-300/60`
                  : "border-border bg-card hover:border-foreground/20"
              )}
            >
              <input
                id={`role-${u.username}`}
                type="radio"
                name="username"
                value={u.username}
                checked={selected}
                onChange={(e) => setUsername(e.target.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid h-9 w-9 place-items-center rounded-lg",
                  selected ? iconBg : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold capitalize">
                  {u.role}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {u.label}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "mt-1 grid h-5 w-5 place-items-center rounded-full border",
                  selected ? "border-violet-600 bg-violet-600" : "border-border"
                )}
              >
                {selected ? <Check className="h-3 w-3 text-white" /> : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full">
        <LogIn className="h-4 w-4" aria-hidden />
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
