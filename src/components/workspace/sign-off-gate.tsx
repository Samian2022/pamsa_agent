"use client";

import { useEffect, useState } from "react";
import { SIGN_OFF_ITEMS, signOffComplete } from "@/lib/stages";
import type { Engagement, SignOffState } from "@/lib/types";

export function SignOffGate({
  engagement,
  open,
  onClose,
  onSignOff,
}: {
  engagement: Engagement;
  open: boolean;
  onClose: () => void;
  onSignOff: (signOff: SignOffState) => Promise<void>;
}) {
  const [signOff, setSignOff] = useState(engagement.signOff);
  const [openId, setOpenId] = useState<string | null>(null);
  const complete = signOffComplete(signOff);
  const checkedCount = SIGN_OFF_ITEMS.filter((item) => signOff[item.id]?.agreed).length;

  useEffect(() => {
    setSignOff(engagement.signOff);
  }, [engagement.signOff]);

  if (!open) return null;

  function toggle(id: string) {
    const next = {
      ...signOff,
      [id]: { ...signOff[id], agreed: !signOff[id]?.agreed, notes: signOff[id]?.notes || "" },
    };
    setSignOff(next);
    void onSignOff(next);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-forest/70 p-4">
      <div className="animate-overlay max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cloud p-8">
        <p className="section-kicker text-[16px]">Lock your double materiality assessment</p>
        <p className="mt-3 text-[14px] leading-6 text-ink-soft">
          Before we model financial impacts, confirm you own this assessment. {checkedCount}/
          {SIGN_OFF_ITEMS.length} sign-off items confirmed. You've got this.
        </p>
        <div className="mt-6 space-y-3">
          {SIGN_OFF_ITEMS.map((item, index) => {
            const checked = Boolean(signOff[item.id]?.agreed);
            return (
              <div
                key={item.id}
                className="animate-cascade rounded-xl border border-[var(--line)] bg-white p-3"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    className="mt-1 accent-sage"
                  />
                  <span className={checked ? "text-ink-soft" : "font-medium text-forest"}>
                    {checked ? null : <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rust" />}
                    {item.label}
                  </span>
                </label>
                <button
                  type="button"
                  className="ml-7 mt-1 text-[12px] text-taupe"
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                >
                  {openId === item.id ? "Hide detail" : "Why this matters"}
                </button>
                {openId === item.id ? (
                  <p className="ml-7 mt-1 text-[13px] text-ink-soft">{item.description}</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-[13px] text-ink-soft">
            Let me revise
          </button>
          <button
            type="button"
            disabled={!complete}
            onClick={onClose}
            className={`rounded-full px-5 py-2.5 text-[14px] font-medium text-white ${
              complete ? "btn-primary animate-lock" : "bg-forest opacity-50"
            }`}
          >
            {complete
              ? "Continue to pricing"
              : "Complete checklist to unlock pricing models"}
          </button>
        </div>
      </div>
    </div>
  );
}
