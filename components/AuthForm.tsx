"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Field = { name: string; label: string; type?: string; autoComplete?: string; placeholder?: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
            className="w-full rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-base transition outline-none placeholder:text-muted/60 focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
          />
        </label>
      ))}
      {state?.error && <p className="rounded-xl bg-alert-soft px-3 py-2 text-sm text-alert">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "處理中…" : submitLabel}
      </button>
    </form>
  );
}
