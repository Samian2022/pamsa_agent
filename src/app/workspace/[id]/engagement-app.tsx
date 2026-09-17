"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import { SIGN_OFF_ITEMS, STAGES, buildContextSummary, methodologyReady, signOffComplete } from "@/lib/stages";
import type {
  Engagement,
  IssueScore,
  MethodologyProgress,
  PricingBuildMode,
  PricingModelType,
  SessionUser,
  SignOffState,
} from "@/lib/types";

function scoreColor(value: number) {
  if (value >= 4) return "bg-danger/15 text-danger";
  if (value === 3) return "bg-warn/20 text-ink";
  return "bg-sage/20 text-moss";
}

function Matrix({ issues }: { issues: IssueScore[] }) {
  return (
    <div className="relative h-72 rounded-2xl border border-[var(--line)] bg-paper">
      <div className="absolute bottom-8 left-8 right-6 top-6">
        <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
          {Array.from({ length: 25 }).map((_, index) => (
            <div key={index} className="border border-[var(--line)]/60" />
          ))}
        </div>
        {issues.map((issue) => {
          const left = ((issue.financialScore - 0.5) / 5) * 100;
          const bottom = ((issue.impactScore - 0.5) / 5) * 100;
          const size = issue.confidence === "high" ? 18 : issue.confidence === "medium" ? 14 : 10;
          const hot = issue.financialScore >= 3 && issue.impactScore >= 3;
          return (
            <div
              key={issue.issue}
              title={`${issue.issue} · F${issue.financialScore}/I${issue.impactScore}`}
              className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full ${
                issue.disclosed ? "" : "outline outline-2 outline-offset-2 outline-copper"
              } ${hot ? "bg-danger" : "bg-moss"}`}
              style={{
                left: `${left}%`,
                bottom: `${bottom}%`,
                width: size,
                height: size,
              }}
            />
          );
        })}
      </div>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-ink-soft">
        Financial materiality →
      </span>
      <span className="absolute left-2 top-1/2 origin-left -rotate-90 text-[10px] uppercase tracking-wider text-ink-soft">
        Impact materiality →
      </span>
    </div>
  );
}

function ArtifactPanel({
  engagement,
  onSignOff,
  onMethodology,
}: {
  engagement: Engagement;
  onSignOff: (signOff: SignOffState) => Promise<void>;
  onMethodology: (methodology: MethodologyProgress) => Promise<void>;
}) {
  const { artifacts } = engagement;
  const [tab, setTab] = useState<"matrix" | "research" | "cards" | "log" | "teach" | "signoff">(
    "research",
  );

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--line)] bg-white/50">
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)] px-3 py-2 text-xs">
        {[
          ["research", "Research"],
          ["cards", "Blind spots"],
          ["matrix", "Matrix"],
          ["log", "Log"],
          ["teach", "Teach"],
          ["signoff", "Sign-off"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`rounded-full px-3 py-1 ${tab === id ? "bg-moss text-paper" : "text-ink-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4 text-sm">
        {tab === "research" ? (
          artifacts.researchCandidates?.length ? (
            <div className="space-y-3">
              {artifacts.selectedCompany ? (
                <p className="rounded-xl bg-moss/10 px-3 py-2 text-moss">
                  Selected: {artifacts.selectedCompany}
                </p>
              ) : null}
              {artifacts.researchCandidates.map((row) => (
                <div key={row.company} className="rounded-2xl border border-[var(--line)] p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold">
                      {row.rank}. {row.company}
                    </h3>
                    <span className="text-xs text-ink-soft">{row.geography}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {row.sector} · Data {row.dataAvailability} · Disclosure {row.disclosureMaturity}
                  </p>
                  <p className="mt-2 text-xs">{row.keyMaterialAngles}</p>
                  <p className="mt-1 text-xs text-copper">Blind spots: {row.likelyBlindSpots}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="The Stage 1 research table will appear here after the agent scores five to seven companies. Each row includes data availability, disclosure maturity, likely blind spots, and sources so you can choose with the gaps in view." />
          )
        ) : null}

        {tab === "cards" ? (
          artifacts.discoveryCards?.length ? (
            <div className="space-y-3">
              {artifacts.discoveryCards.map((card) => (
                <div key={card.issue} className="rounded-2xl border border-copper/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{card.issue}</h3>
                    <span className="text-[10px] uppercase tracking-wide text-copper">
                      {card.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-xs">{card.definition}</p>
                  <p className="mt-2 text-xs text-ink-soft">{card.evidence}</p>
                </div>
              ))}
              {artifacts.blindSpotSummary ? (
                <p className="whitespace-pre-wrap text-xs text-ink-soft">{artifacts.blindSpotSummary}</p>
              ) : null}
            </div>
          ) : (
            <Empty text="Discovery cards for undisclosed and emerging issues will land here in Stage 3. Each card explains why the company likely has exposure, the evidence, why it may be silent, and the financial and impact pathways." />
          )
        ) : null}

        {tab === "matrix" ? (
          artifacts.issueScores?.length ? (
            <div className="space-y-4">
              <Matrix issues={artifacts.issueScores} />
              <p className="text-[11px] leading-5 text-ink-soft">
                Solid bubbles are issues the company already discloses. Copper outlines are
                undisclosed or emerging issues. Larger bubbles mean higher confidence. Smaller
                bubbles mean the score still depends on assumptions you should challenge.
              </p>
              <div className="space-y-2">
                {artifacts.issueScores
                  .slice()
                  .sort((a, b) => b.financialScore + b.impactScore - (a.financialScore + a.impactScore))
                  .map((issue) => (
                    <div key={issue.issue} className="rounded-xl border border-[var(--line)] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{issue.issue}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${scoreColor(Math.max(issue.financialScore, issue.impactScore))}`}>
                          F{issue.financialScore} / I{issue.impactScore}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        {issue.disclosed ? "Disclosed" : "Undisclosed"} · {issue.confidence} ·{" "}
                        {issue.recommendedMetric}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <Empty text="Scored issues will plot here after DMA scoring. The horizontal axis is financial materiality. The vertical axis is impact materiality." />
          )
        ) : null}

        {tab === "log" ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-moss">Discovery</h3>
              {engagement.discoveryLog.length ? (
                engagement.discoveryLog.map((item) => (
                  <div key={item.id} className="mt-2 rounded-xl border border-[var(--line)] p-2">
                    <p className="font-medium">{item.issue}</p>
                    <p className="text-[11px] text-ink-soft">
                      {item.reaction} · {item.confidence} · {item.source}
                    </p>
                  </div>
                ))
              ) : (
                <Empty text="Issues the agent surfaces will collect here, together with whether you accepted them, disputed them, or asked for a deeper look." />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-copper">Probes</h3>
              {engagement.probeLog.length ? (
                engagement.probeLog.map((item) => (
                  <div key={item.id} className="mt-2 rounded-xl border border-copper/40 p-2">
                    <p className="text-xs">{item.userChallenge}</p>
                    <p className="mt-1 text-[11px] text-ink-soft">Revised: {item.revisedClaim}</p>
                  </div>
                ))
              ) : (
                <Empty text="If a finding does not make sense, say so in chat. The original claim, your challenge, the new evidence, and the revised conclusion will appear here." />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider">Open gaps</h3>
              {engagement.dataGapLog.filter((item) => item.status === "open").length ? (
                engagement.dataGapLog
                  .filter((item) => item.status === "open")
                  .map((item) => (
                    <p key={item.id} className="mt-2 text-xs text-ink-soft">
                      {item.gap} → {item.followUp}
                    </p>
                  ))
              ) : (
                <Empty text="No open data gaps are logged yet. When a figure is missing from public filings, it should be listed here with a follow-up, rather than treated as if the company disclosed it." />
              )}
            </div>
          </div>
        ) : null}

        {tab === "teach" ? (
          <TeachForm engagement={engagement} onMethodology={onMethodology} />
        ) : null}

        {tab === "signoff" ? (
          <SignOffForm engagement={engagement} onSignOff={onSignOff} />
        ) : null}
      </div>
    </aside>
  );
}

function SignOffForm({
  engagement,
  onSignOff,
}: {
  engagement: Engagement;
  onSignOff: (signOff: SignOffState) => Promise<void>;
}) {
  const [signOff, setSignOff] = useState(engagement.signOff);
  const complete = signOffComplete(signOff);

  function toggle(id: string) {
    const next = {
      ...signOff,
      [id]: { ...signOff[id], agreed: !signOff[id]?.agreed, notes: signOff[id]?.notes || "" },
    };
    setSignOff(next);
    void onSignOff(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-ink-soft">
        Pricing models stay locked until every item below is agreed. If a statement feels
        wrong, challenge it in the chat first and then come back to this list. Sign-off is
        the gate between the DMA and any financial work.
      </p>
      {SIGN_OFF_ITEMS.map((item) => (
        <label key={item.id} className="flex items-start gap-2 rounded-xl border border-[var(--line)] p-3">
          <input
            type="checkbox"
            checked={Boolean(signOff[item.id]?.agreed)}
            onChange={() => toggle(item.id)}
            className="mt-1"
          />
          <span>{item.label}</span>
        </label>
      ))}
      <p className={`text-xs font-semibold ${complete ? "text-moss" : "text-copper"}`}>
        {complete
          ? "Sign-off complete. Scope issues, then walk the pricing methodology before any model is locked."
          : "Sign-off is incomplete. Tick every item only after you have actually reviewed it."}
      </p>
    </div>
  );
}

function TeachForm({
  engagement,
  onMethodology,
}: {
  engagement: Engagement;
  onMethodology: (methodology: MethodologyProgress) => Promise<void>;
}) {
  const [methodology, setMethodology] = useState(engagement.methodology);
  const ready = methodologyReady(methodology);
  const types: PricingModelType[] = ["cost", "revenue", "capex", "wacc", "hybrid"];
  const modes: { id: PricingBuildMode; label: string }[] = [
    { id: "agent", label: "A. The agent builds the models. You review and challenge every assumption." },
    { id: "diy", label: "B. You build the models. The agent coaches, checks logic, and catches errors." },
    { id: "hybrid", label: "C. Hybrid. The agent drafts, then you walk through each component and refine it." },
  ];

  function patch(next: MethodologyProgress) {
    setMethodology(next);
    void onMethodology(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-ink-soft">
        Stage 6 is teaching, not modeling. Tick these only after the agent has walked the
        framework in chat and you can explain it back. Model build stays locked until you have
        walked the five types, walked the eight components, and chosen how the models will be built.
      </p>
      {(
        [
          ["typesWalked", "I walked the five model types: cost, revenue, capex, WACC, and hybrid."],
          ["anatomyWalked", "I walked the eight components, from baseline through sensitivity."],
          ["exampleWalked", "I walked a real numbered example on one of our material issues."],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-start gap-2 rounded-xl border border-[var(--line)] p-3">
          <input
            type="checkbox"
            checked={Boolean(methodology[key])}
            onChange={() => patch({ ...methodology, [key]: !methodology[key] })}
            className="mt-1"
          />
          <span>{label}</span>
        </label>
      ))}
      <p className="text-xs font-semibold">Build mode</p>
      {modes.map((mode) => (
        <label key={mode.id} className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="build-mode"
            checked={methodology.buildMode === mode.id}
            onChange={() => patch({ ...methodology, buildMode: mode.id })}
          />
          {mode.label}
        </label>
      ))}
      <p className="text-xs font-semibold">Model types that fit</p>
      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const on = methodology.selectedTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                patch({
                  ...methodology,
                  selectedTypes: on
                    ? methodology.selectedTypes.filter((item) => item !== type)
                    : [...methodology.selectedTypes, type],
                })
              }
              className={`rounded-full px-3 py-1 text-xs ${on ? "bg-moss text-paper" : "bg-paper-2"}`}
            >
              {type}
            </button>
          );
        })}
      </div>
      {engagement.assumptionCheckpoints.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold">Assumption checkpoints</p>
          {engagement.assumptionCheckpoints.map((item) => (
            <p key={item.id} className="text-xs text-ink-soft">
              {item.userDecision}: {item.statement}
            </p>
          ))}
        </div>
      ) : null}
      <p className={`text-xs font-semibold ${ready ? "text-moss" : "text-copper"}`}>
        {ready
          ? "Methodology is unlocked. You can start the Stage 7 model build."
          : "The model build stays locked until you have walked the types, walked the anatomy, and chosen a build mode."}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-ink-soft">{text}</p>;
}

function partText(part: UIMessage["parts"][number]) {
  if (part.type === "text") return part.text;
  if (part.type === "reasoning") return "";
  return "";
}

export function EngagementApp({
  initial,
  user,
}: {
  initial: Engagement;
  user: SessionUser;
}) {
  const [engagement, setEngagement] = useState(initial);
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { engagementId: initial.id },
      }),
    [initial.id],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: initial.id,
    messages: initial.messages,
    transport,
    onFinish: () => {
      void refresh();
    },
  });

  async function refresh() {
    const response = await fetch(`/api/engagements/${initial.id}`);
    const data = (await response.json()) as { engagement?: Engagement };
    if (data.engagement) setEngagement(data.engagement);
  }

  async function onSignOff(signOff: SignOffState) {
    const response = await fetch(`/api/engagements/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signOff }),
    });
    const data = (await response.json()) as { engagement?: Engagement };
    if (data.engagement) setEngagement(data.engagement);
  }

  async function onMethodology(methodology: MethodologyProgress) {
    const response = await fetch(`/api/engagements/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodology }),
    });
    const data = (await response.json()) as { engagement?: Engagement };
    if (data.engagement) setEngagement(data.engagement);
  }

  const busy = status === "submitted" || status === "streaming";

  async function send() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await send();
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="text-xs uppercase tracking-[0.28em] text-moss">
            PAMSA
          </Link>
          <span className="text-ink-soft">/</span>
          <div>
            <h1 className="serif text-xl leading-none">{engagement.title}</h1>
            <p className="text-xs text-ink-soft">
              {user.name}{" "}
              {engagement.artifacts.selectedCompany
                ? `(${engagement.artifacts.selectedCompany})`
                : "(no company selected yet)"}
            </p>
          </div>
        </div>
        <a
          href={`/api/engagements/${initial.id}/export`}
          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
        >
          Export Excel
        </a>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_380px]">
        <nav className="hidden flex-col gap-2 overflow-y-auto border-r border-[var(--line)] p-4 lg:flex">
          {STAGES.map((stage) => {
            const active = engagement.stage === stage.id;
            const done = engagement.stage > stage.id;
            return (
              <div
                key={stage.id}
                className={`rounded-2xl px-3 py-3 ${active ? "bg-moss text-paper" : "bg-transparent text-ink-soft"}`}
              >
                <p className="text-[10px] uppercase tracking-wider">Stage {stage.id}</p>
                <p className={`mt-1 text-sm ${active || done ? "font-semibold" : ""}`}>{stage.short}</p>
              </div>
            );
          })}
        </nav>

        <section className="flex min-h-0 flex-col">
          <div className="border-b border-[var(--line)] bg-moss/5 px-4 py-3 text-xs leading-5 text-ink-soft">
            {buildContextSummary(engagement)}
          </div>
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-6">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-3xl ${message.role === "user" ? "ml-auto" : ""}`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wider text-ink-soft">
                  {message.role === "user" ? user.name : "PAMSA agent"}
                </p>
                <div
                  className={`rounded-3xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-moss text-paper"
                      : "border border-[var(--line)] bg-white/80"
                  }`}
                >
                  <div className="prose-chat text-[15px] leading-7">
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <Markdown key={`${message.id}-${index}`}>{part.text}</Markdown>
                        );
                      }
                      if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                        const name =
                          "toolName" in part && typeof part.toolName === "string"
                            ? part.toolName
                            : part.type.replace("tool-", "");
                        const state = "state" in part ? String(part.state) : "";
                        return (
                          <p
                            key={`${message.id}-${index}`}
                            className="my-2 rounded-lg bg-paper-2 px-2 py-1 text-xs text-ink-soft"
                          >
                            Tool: {name}
                            {state ? ` · ${state}` : ""}
                          </p>
                        );
                      }
                      return partText(part) ? (
                        <span key={`${message.id}-${index}`}>{partText(part)}</span>
                      ) : null;
                    })}
                  </div>
                </div>
              </article>
            ))}
            {error ? <p className="text-sm text-danger">{error.message}</p> : null}
          </div>

          <form onSubmit={onSubmit} className="border-t border-[var(--line)] bg-white/80 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Reply with criteria, challenge a finding, pick a company, or paste a filing URL."
                className="h-24 flex-1 resize-none rounded-2xl border border-[var(--line)] bg-paper px-3 py-2 text-sm outline-none focus:border-moss"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                {busy ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-paper"
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>

        <div className="hidden min-h-0 lg:block">
          <ArtifactPanel
            engagement={engagement}
            onSignOff={onSignOff}
            onMethodology={onMethodology}
          />
        </div>
      </div>
    </div>
  );
}
