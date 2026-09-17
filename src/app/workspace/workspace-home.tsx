"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STAGES } from "@/lib/stages";
import type { SessionUser } from "@/lib/types";

type Summary = {
  id: string;
  title: string;
  stage: number;
  selectedCompany: string | null;
  createdBy: SessionUser;
  createdAt: string;
  updatedAt: string;
};

export function WorkspaceHome({
  user,
  initialEngagements,
}: {
  user: SessionUser;
  initialEngagements: Summary[];
}) {
  const router = useRouter();
  const [engagements] = useState(initialEngagements);
  const [pending, setPending] = useState(false);

  async function createEngagement() {
    setPending(true);
    const response = await fetch("/api/engagements", { method: "POST" });
    const data = (await response.json()) as { engagement?: { id: string } };
    setPending(false);
    if (data.engagement?.id) {
      router.push(`/workspace/${data.engagement.id}`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <header className="mx-auto flex max-w-5xl items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-moss">PAMSA</p>
          <h1 className="serif mt-2 text-4xl">Engagements</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Signed in as {user.name} ({user.email}). Only people on the team
            allowlist can enter this workspace. Teammates who are listed can open
            the same engagements and continue from the last saved stage.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={logout}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          >
            Sign out
          </button>
          <button
            onClick={createEngagement}
            disabled={pending}
            className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
          >
            {pending ? "Opening..." : "New engagement"}
          </button>
        </div>
      </header>

      <section className="mx-auto mt-10 grid max-w-5xl gap-4">
        {engagements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] p-10 text-ink-soft">
            No engagements yet. Start a new one and the agent will ask for industry,
            geography, scale, constraints, how hard you want it to hunt for undisclosed
            issues, whether you already have a DMA, and whether you want to build the
            pricing models yourself or have the agent build them with you.
          </div>
        ) : (
          engagements.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`/workspace/${item.id}`)}
              className="rounded-3xl border border-[var(--line)] bg-white/70 p-5 text-left transition hover:border-moss"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="serif text-2xl">{item.title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {item.selectedCompany || "Company not selected yet"}{" "}
                    ({STAGES.find((stage) => stage.id === item.stage)?.name})
                  </p>
                </div>
                <span className="rounded-full bg-paper-2 px-3 py-1 text-xs">
                  Stage {item.stage}
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Updated {new Date(item.updatedAt).toLocaleString()}. Opened by{" "}
                {item.createdBy.name}.
              </p>
            </button>
          ))
        )}
      </section>
    </main>
  );
}
