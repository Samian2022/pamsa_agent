"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { JOURNEY_STAGES, SIGN_OFF_ITEMS, pendingFindingCount, workspaceNavLabel } from "@/lib/stages";
import { RelativeTime } from "@/components/relative-time";
import type { Engagement } from "@/lib/types";
import { MaterialityMatrix } from "./materiality-matrix";
import type { WorkspaceView } from "./views";

export type { WorkspaceView };

function Icon({ name, className }: { name: string; className?: string }) {
  const common = `h-3.5 w-3.5 shrink-0 ${className || ""}`;
  if (name === "research") {
    return (
      <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "profile") {
    return (
      <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 13V6l5-3 5 3v7H3Z" stroke="currentColor" />
        <path d="M7 13V9h2v4" stroke="currentColor" />
      </svg>
    );
  }
  if (name === "dma") {
    return (
      <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="11" height="11" stroke="currentColor" />
        <path d="M2.5 8h11M8 2.5v11" stroke="currentColor" />
      </svg>
    );
  }
  if (name === "signoff") {
    return (
      <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" />
        <path d="M5.5 8.2l1.8 1.8 3.4-3.6" stroke="currentColor" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="2.5" width="10" height="11" rx="1" stroke="currentColor" />
      <path d="M6 6h4M6 8.5h4M6 11h2" stroke="currentColor" />
    </svg>
  );
}

export function LeftSidebar({
  engagement,
  view,
  onView,
  onJourney,
  collapsed,
}: {
  engagement: Engagement;
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
  onJourney?: (key: (typeof JOURNEY_STAGES)[number]["key"]) => void;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const company = engagement.artifacts.selectedCompany;
  const project = company ? `${company} Materiality Study 2026` : engagement.title;
  const signed = SIGN_OFF_ITEMS.filter((item) => engagement.signOff[item.id]?.agreed).length;
  const pendingAssumptions = engagement.assumptionCheckpoints.filter((item) => item.userDecision === "pending").length
    + engagement.assumptions.length;
  const pendingFindings = pendingFindingCount(engagement);
  const visualStep = engagement.stage >= 5 ? 5 : engagement.stage;
  const links: { id: WorkspaceView; label: string }[] = [
    {
      id: "workspace",
      label: pendingFindings
        ? `Review findings (${pendingFindings} to decide)`
        : workspaceNavLabel(engagement.stage),
    },
    { id: "discovery", label: `Discovery log (${engagement.discoveryLog.length})` },
    { id: "probing", label: `Probing log (${engagement.probeLog.length})` },
    { id: "assumptions", label: `Assumptions (${pendingAssumptions})` },
    { id: "signoff", label: `Sign-off (${signed}/${SIGN_OFF_ITEMS.length})` },
    { id: "documents", label: `Documents (${engagement.documents?.length || 0})` },
    { id: "chat", label: "Research chat" },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (collapsed) {
    return (
      <aside className="flex w-14 flex-col items-center gap-3 bg-forest py-4 text-white">
        <Link href="/workspace" className="text-[10px] tracking-[0.2em]" title="All engagements">
          P
        </Link>
        {JOURNEY_STAGES.map((stage) => (
          <button
            key={stage.key}
            type="button"
            onClick={() => (onJourney ? onJourney(stage.key) : onView("workspace"))}
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              stage.done(engagement.stage)
                ? "bg-sage text-white"
                : stage.active(engagement.stage)
                  ? "bg-white text-sage"
                  : "bg-white/10 text-white/50"
            }`}
            title={`${stage.name}: ${stage.line}`}
          >
            {stage.done(engagement.stage) ? "✓" : <Icon name={stage.key} />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onView("documents")}
          title="Documents"
          aria-label="Documents"
          className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] ${
            view === "documents" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          D
        </button>
        <button
          type="button"
          onClick={() => onView("chat")}
          title="Research chat"
          aria-label="Research chat"
          className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] ${
            view === "chat" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          C
        </button>
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="focus-ring mt-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 3H4.5A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H6" stroke="currentColor" />
            <path d="M7 8h6M10.5 5.5 13 8l-2.5 2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col bg-forest text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <Link href="/workspace" className="text-[10px] uppercase tracking-[0.28em] text-sage">
          All engagements
        </Link>
        <h1 className="serif mt-2 text-[20px] leading-6 text-white">{project}</h1>
        <p className="mt-1 text-[12px] text-white/70">Your research journey</p>
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">
          {JOURNEY_STAGES.filter((stage) => stage.done(engagement.stage)).length}/5 stages complete
        </p>
        <div className="mt-3 space-y-2">
          {JOURNEY_STAGES.map((stage) => {
            const done = stage.done(engagement.stage);
            const current = stage.active(engagement.stage);
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => (onJourney ? onJourney(stage.key) : onView("workspace"))}
                className="flex w-full items-start gap-2 rounded-lg text-left hover:bg-white/5"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    done ? "bg-sage text-white" : current ? "bg-white text-sage" : "bg-white/10 text-white/40"
                  }`}
                >
                  {done ? "✓" : <Icon name={stage.key} />}
                </span>
                <div className="min-w-0">
                  <p className={`text-[12px] ${current ? "font-medium text-sage" : done ? "text-white" : "text-white/70"}`}>
                    {stage.name}
                  </p>
                  <p className="text-[11px] text-white/50">{stage.line}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-sage transition-[width] duration-500"
            style={{ width: `${(visualStep / 5) * 100}%` }}
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => onView(link.id)}
            className={`focus-ring w-full rounded-lg px-3 py-2 text-left text-[12px] leading-4 transition ${
              view === link.id ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(45,90,74,0.6)]" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </button>
        ))}
        <button
          type="button"
          onClick={logout}
          className="focus-ring mt-3 w-full rounded-lg px-3 py-2 text-left text-[12px] leading-4 text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          Sign out
        </button>
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-[11px] text-white/60">
          <RelativeTime iso={engagement.updatedAt} prefix="Last updated " suffix=" by you" />
        </p>
        {engagement.artifacts.issueScores?.length ? (
          <div className="mt-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-white/50">Your DMA at a glance</p>
            <MaterialityMatrix
              issues={engagement.artifacts.issueScores}
              discoveryLog={engagement.discoveryLog}
              compact
            />
          </div>
        ) : null}
        <a
          href={`/api/engagements/${engagement.id}/export`}
          className="mt-4 inline-flex text-[12px] text-sage underline-offset-2 hover:underline"
        >
          Download your model
        </a>
      </div>
    </aside>
  );
}
