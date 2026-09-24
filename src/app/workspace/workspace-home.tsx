"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { STAGES } from "@/lib/stages";
import { RelativeTime } from "@/components/relative-time";
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
  const [engagements, setEngagements] = useState(initialEngagements);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/engagements")
      .then((response) => response.json() as Promise<{ engagements?: Summary[] }>)
      .then((data) => {
        if (!cancelled && data.engagements) setEngagements(data.engagements);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <main className="organic-bg min-h-screen">
      <header className="border-b border-[var(--line)] bg-forest px-6 py-8 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <p className="text-[12px] uppercase tracking-[0.28em] text-sage">PAMSA</p>
            <h1 className="serif mt-2 text-[32px]">Engagements</h1>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/75">
              Signed in as {user.name} ({user.email}). Your assessments live here. Research, probe,
              score, lock, then model. Materiality hidden is risk unpriced.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={logout}
              className="rounded-full border border-white/25 px-4 py-2 text-[14px] text-white"
            >
              Sign out
            </button>
            <button
              onClick={createEngagement}
              disabled={pending}
              className="btn-primary rounded-full px-4 py-2 text-[14px] font-medium disabled:opacity-60"
            >
              {pending ? "Opening..." : "New engagement"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-10 grid max-w-5xl gap-4 px-6 pb-16">
        {engagements.length === 0 ? (
          <div className="animate-fade-up rounded-3xl border border-dashed border-[var(--line)] bg-white/70 p-10 text-ink-soft">
            No engagements yet. Start a new one. Search companies. Surface risks. Let's begin.
          </div>
        ) : (
          engagements.map((item, index) => (
            <Link
              key={item.id}
              href={`/workspace/${item.id}`}
              className="lift animate-slide-left rounded-3xl border border-[var(--line)] bg-white/80 p-5 text-left"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="serif text-[24px] text-forest">{item.title}</h2>
                  <p className="mt-1 text-[14px] text-ink-soft">
                    {item.selectedCompany || "Company not selected yet"}{" "}
                    ({STAGES.find((stage) => stage.id === item.stage)?.name})
                  </p>
                </div>
                <span className="rounded-full bg-sage/15 px-3 py-1 text-[12px] text-sage">
                  Stage {item.stage}
                </span>
              </div>
              <p className="mt-3 text-[12px] text-ink-soft">
                <RelativeTime iso={item.updatedAt} prefix="Updated " suffix={` by ${item.createdBy.name}.`} />
              </p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
