"use client";

import { FormEvent, useState } from "react";

const FIELDS = [
  { id: "sector", label: "Sector", placeholder: "Any, consumer, energy, materials..." },
  { id: "geography", label: "Geography", placeholder: "Global, or a region / market" },
  { id: "scale", label: "Company scale", placeholder: "Revenue, market cap, public/private" },
  { id: "constraints", label: "Constraints", placeholder: "Companies to avoid, listing, CSRD only..." },
  { id: "disclosure", label: "Disclosure preference", placeholder: "Well documented, or underdisclosed" },
  { id: "prior", label: "Prior DMA work", placeholder: "None, or name the company" },
  { id: "pricing", label: "Pricing preference", placeholder: "Cost, revenue, WACC, hybrid, or undecided" },
] as const;

export function DiscoveryBrief({ onSubmit, busy }: { onSubmit: (text: string) => void; busy?: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});

  function send(event: FormEvent) {
    event.preventDefault();
    const lines = FIELDS.map((field) => `${field.label}: ${values[field.id]?.trim() || "no preference"}`);
    onSubmit(
      `Here are my Stage 1 research criteria. Research five to seven candidates and save them with save_research_candidates.\n${lines.join("\n")}`,
    );
  }

  return (
    <form onSubmit={send} className="rounded-2xl border border-[var(--line)] bg-white/90 p-5">
      <h2 className="serif text-[18px] text-forest">Start with seven questions</h2>
      <p className="mt-1 text-[13px] leading-6 text-ink-soft">
        Fill what you know. Blank is fine. The agent will rank companies, then you press Select.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.id} className="block text-[12px] font-medium text-forest">
            {field.label}
            <input
              value={values[field.id] || ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
              placeholder={field.placeholder}
              className="field-input mt-1 w-full rounded-xl px-3 py-2 text-[13px] font-normal"
            />
          </label>
        ))}
      </div>
      <button type="submit" disabled={busy} className="btn-primary mt-4 rounded-full px-4 py-2 text-sm disabled:opacity-50">
        {busy ? "Researching..." : "Research candidates"}
      </button>
    </form>
  );
}
