"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { composerPlaceholder, findingsReadyToScore, JOURNEY_STAGES, nextAction, pendingFindingCount, signOffComplete, methodologyReady } from "@/lib/stages";
import type { Engagement, IssueScore, MethodologyProgress, PricingScope, SessionUser, SignOffState, UserReaction } from "@/lib/types";
import { LeftSidebar } from "@/components/workspace/left-sidebar";
import type { WorkspaceView } from "@/components/workspace/views";
import { RightSidebar } from "@/components/workspace/right-sidebar";
import { SignOffGate } from "@/components/workspace/sign-off-gate";
import { ComposerAttach, DocumentLibrary, documentReviewPrompt } from "@/components/workspace/document-library";
import { DiscoveryBrief } from "@/components/workspace/discovery-brief";
import {
  HypothesisCards,
  LockedPricing,
  MetricsGrid,
  ModelBuilder,
  ProfileView,
  ResearchCards,
  ScopePicker,
  ScoringPanel,
  TeachForm,
  TimelineLog,
} from "@/components/workspace/stage-views";

function partText(part: UIMessage["parts"][number]) {
  if (part.type === "text") return part.text;
  return "";
}

function stageTitle(stage: number) {
  if (stage <= 1) return "Find what's hidden";
  if (stage === 2) return "Audit what they hide";
  if (stage === 3) return "Probe, then score";
  if (stage === 4) return "Lock your assessment";
  return "Model the impact";
}

function LastAgentNote({
  messages,
  onOpenChat,
}: {
  messages: UIMessage[];
  onOpenChat: () => void;
}) {
  const last = [...messages].reverse().find((message) => message.role === "assistant");
  const text = last?.parts.map(partText).join("\n").trim();
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">Latest from the agent</p>
      <p className="mt-2 line-clamp-5 text-[14px] leading-6 text-ink">{text}</p>
      <button type="button" onClick={onOpenChat} className="mt-2 text-[12px] text-sage">
        Open full conversation
      </button>
    </div>
  );
}

function firstSelectedIssue(engagement: Engagement) {
  const cards = engagement.artifacts.discoveryCards || [];
  const firstPending = cards.find((card) => {
    const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
    return !reaction || reaction === "pending";
  });
  return firstPending?.issue || cards[0]?.issue || null;
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
  const [view, setView] = useState<WorkspaceView>("workspace");
  const [selectedIssue, setSelectedIssue] = useState<string | null>(() => firstSelectedIssue(initial));
  const [rightOpen, setRightOpen] = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [journeyFocus, setJourneyFocus] = useState<"audit" | "dma" | "pricing" | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const seenCardCount = useRef(initial.artifacts.discoveryCards?.length || 0);

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

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (engagement.stage !== 2 || !findingsReadyToScore(engagement)) return;
    void patchEngagement({ stage: 3 });
  }, [engagement.stage, engagement.discoveryLog, engagement.artifacts.discoveryCards]);

  useEffect(() => {
    if (engagement.stage === 4 && !signOffComplete(engagement.signOff)) {
      setSignOffOpen(true);
    }
  }, [engagement.stage]);

  useEffect(() => {
    const n = engagement.artifacts.discoveryCards?.length || 0;
    if (n > seenCardCount.current) {
      seenCardCount.current = n;
      setView("workspace");
      window.requestAnimationFrame(() => {
        document.getElementById("review-findings")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      seenCardCount.current = n;
    }
    if (selectedIssue) return;
    const cards = engagement.artifacts.discoveryCards || [];
    const firstPending = cards.find((card) => {
      const reaction = engagement.discoveryLog.find((item) => item.issue === card.issue)?.reaction;
      return !reaction || reaction === "pending";
    });
    const first = firstPending || cards[0];
    if (first) {
      setSelectedIssue(first.issue);
      if (firstPending) setRightOpen(true);
    }
  }, [engagement.artifacts.discoveryCards, engagement.discoveryLog, selectedIssue]);

  async function refresh() {
    const response = await fetch(`/api/engagements/${initial.id}`);
    const data = (await response.json()) as { engagement?: Engagement };
    if (data.engagement) setEngagement(data.engagement);
  }

  async function patchEngagement(body: Record<string, unknown>) {
    const response = await fetch(`/api/engagements/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { engagement?: Engagement };
    if (data.engagement) setEngagement(data.engagement);
    return data.engagement;
  }

  async function onSignOff(signOff: SignOffState) {
    const wasComplete = signOffComplete(engagement.signOff);
    const next = await patchEngagement({ signOff });
    if (next && !wasComplete && signOffComplete(next.signOff) && next.stage >= 5) {
      setSignOffOpen(false);
      void sendText(
        "DMA sign-off is complete. Help me pick 2 to 4 issues with a clear P&L path, then save_pricing_scope.",
      );
    }
  }

  async function onMethodology(methodology: MethodologyProgress) {
    const wasReady = methodologyReady(engagement.methodology);
    const next = await patchEngagement({ methodology });
    if (next && !wasReady && methodologyReady(next.methodology) && next.stage >= 7) {
      void sendText(
        "Methodology teaching is complete. Start Stage 7B and save_financial_model for each scoped issue.",
      );
    }
  }

  async function onScores(issueScores: IssueScore[]) {
    await patchEngagement({ issueScores });
  }

  async function selectCompany(company: string) {
    await patchEngagement({ selectedCompany: company });
    setView("workspace");
    void sendText(
      `I selected ${company}. Call save_discovery_cards first with 6 to 8 likely-material issues from uploaded filings or what you already know. Never fewer than 6. Then STOP. Do not run the full 2A-2G audit this turn.`,
    );
  }

  async function decideFinding(issue: string, reaction: UserReaction, note = "") {
    setSelectedIssue(issue);
    setRightOpen(true);
    const next = await patchEngagement({ discoveryReaction: { issue, reaction, notes: note } });
    if (!next) return;
    if (pendingFindingCount(next) > 0) return;
    const accepted = next.discoveryLog
      .filter((item) => item.reaction === "accepted")
      .map((item) => item.issue);
    if (next.stage < 3 && findingsReadyToScore(next)) {
      await patchEngagement({ stage: 3 });
    }
    void sendText(
      `I locked these as material: ${accepted.join("; ") || "none"}. Call save_scoring_framework now with climate change (E1) plus two more environmental topics and three social, with rationale and evidence. Then STOP. Do not score IROs until I accept the key.`,
    );
  }

  async function lockScope(issues: string[]) {
    const pricingScope: PricingScope = {
      issues,
      horizonYears: 5,
      scenarios: "base-stress-upside",
      publicDataOnly: true,
      includeUndisclosed: true,
      modelTypes: [],
      buildMode: "unset",
      notes: `User selected ${issues.join(", ")} for pricing.`,
    };
    await patchEngagement({ pricingScope });
    void sendText(
      `I locked pricing scope on: ${issues.join(", ")}. Walk Stage 6 methodology (five types, eight anatomy components, then a build mode) and save_methodology.`,
    );
  }

  async function sendText(text: string) {
    if (!text.trim() || busy) return;
    await sendMessage({ text });
  }

  async function send() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    await sendText(text);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await send();
  }

  function selectIssue(issue: string) {
    setSelectedIssue(issue);
    setRightOpen(true);
  }

  function go(next: WorkspaceView) {
    if (next === "signoff") {
      setSignOffOpen(true);
      return;
    }
    if (next === "workspace") setJourneyFocus("audit");
    setView(next);
  }

  function onJourney(key: (typeof JOURNEY_STAGES)[number]["key"]) {
    if (key === "signoff") {
      setSignOffOpen(true);
      return;
    }
    setView("workspace");
    setJourneyFocus(key === "pricing" ? "pricing" : key === "dma" ? "dma" : "audit");
    const id = key === "dma" ? "dma-scoring" : key === "pricing" ? "pricing-scope" : "review-findings";
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cloud">
      {mobileNav ? (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <LeftSidebar
            engagement={engagement}
            view={view}
            onView={(next) => {
              go(next);
              setMobileNav(false);
            }}
            onJourney={(key) => {
              onJourney(key);
              setMobileNav(false);
            }}
          />
          <button type="button" className="flex-1 bg-forest/50" aria-label="Close menu" onClick={() => setMobileNav(false)} />
        </div>
      ) : null}
      <div className="hidden md:flex">
        <LeftSidebar engagement={engagement} view={view} onView={go} onJourney={onJourney} collapsed={navCollapsed} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-cloud/90 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] px-2 py-1 text-[12px] md:hidden"
              onClick={() => setMobileNav(true)}
            >
              Menu
            </button>
            <button
              type="button"
              className="hidden shrink-0 rounded-lg border border-[var(--line)] px-2 py-1 text-[12px] md:inline"
              onClick={() => setNavCollapsed((value) => !value)}
            >
              {navCollapsed ? "Expand nav" : "Collapse nav"}
            </button>
            <h2 className="section-kicker min-w-0 flex-1 text-[16px] md:text-[20px]">{stageTitle(engagement.stage)}</h2>
          </div>
          <div className="flex items-center gap-2">
            {engagement.stage === 4 && !signOffComplete(engagement.signOff) ? (
              <button
                type="button"
                className="rounded-full border border-sage/40 px-3 py-1 text-[12px] text-sage"
                onClick={() => setSignOffOpen(true)}
              >
                Open sign-off
              </button>
            ) : null}
            <p className="hidden text-[12px] text-ink-soft lg:block">
              {user.name}
              {engagement.artifacts.selectedCompany ? ` · ${engagement.artifacts.selectedCompany}` : ""}
            </p>
          </div>
        </header>

        <div className="border-b border-[var(--line)] bg-white/70 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-taupe">Now</p>
          <p className="mt-1 text-[13px] leading-6 text-forest">
            {busy
              ? "Extracting findings now. Review findings cards appear as soon as they are saved, usually in about 15 seconds. You do not need to wait for the chat to finish."
              : nextAction(engagement)}
          </p>
        </div>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 lg:px-8">
              <div className={`mx-auto w-full space-y-8 ${engagement.stage <= 1 ? "max-w-none" : "max-w-[1200px]"}`}>
                {view === "workspace" || view === "issues" ? (
                  <>
                    {engagement.stage <= 1 && !engagement.artifacts.selectedCompany ? (
                      engagement.artifacts.researchCandidates?.length ? (
                        <ResearchCards engagement={engagement} onSelect={selectCompany} />
                      ) : (
                        <DiscoveryBrief
                          busy={busy}
                          onSubmit={(text) => {
                            setView("chat");
                            void sendText(text);
                          }}
                        />
                      )
                    ) : null}
                    {engagement.stage >= 2 ||
                    engagement.artifacts.selectedCompany ||
                    engagement.artifacts.discoveryCards?.length ? (
                      <div id="review-findings">
                        <HypothesisCards
                          engagement={engagement}
                          busy={busy}
                          onSelect={selectIssue}
                          onDecide={(issue, reaction) => void decideFinding(issue, reaction)}
                        />
                      </div>
                    ) : null}
                    {engagement.stage === 2 &&
                    (engagement.artifacts.selectedCompany || engagement.artifacts.discoveryCards?.length) ? (
                      <ProfileView engagement={engagement} />
                    ) : null}
                    {engagement.stage <= 4 &&
                    (engagement.stage >= 2 ||
                      engagement.artifacts.selectedCompany ||
                      engagement.artifacts.discoveryCards?.length) ? (
                      <div id="dma-scoring">
                        <ScoringPanel
                          engagement={engagement}
                          selected={selectedIssue}
                          onSelect={selectIssue}
                          onScores={onScores}
                        />
                        <MetricsGrid engagement={engagement} />
                      </div>
                    ) : null}
                    {engagement.stage >= 5 || journeyFocus === "pricing" ? (
                      <div id="pricing-scope">
                        {engagement.stage < 5 ? (
                          <LockedPricing engagement={engagement} onOpenSignOff={() => setSignOffOpen(true)} />
                        ) : engagement.stage === 5 ? (
                          <ScopePicker engagement={engagement} onScope={(issues) => void lockScope(issues)} />
                        ) : engagement.stage === 6 ? (
                          <TeachForm engagement={engagement} onMethodology={onMethodology} />
                        ) : (
                          <ModelBuilder engagement={engagement} />
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {view === "documents" ? (
                  <DocumentLibrary
                    engagement={engagement}
                    onChange={setEngagement}
                    onAskAgent={(text) => {
                      setView("workspace");
                      setRightOpen(true);
                      void sendText(text);
                    }}
                  />
                ) : null}

                {view === "discovery" ? (
                  <div className="space-y-8">
                    {engagement.artifacts.discoveryCards?.length ? (
                      <HypothesisCards
                        engagement={engagement}
                        busy={busy}
                        onSelect={selectIssue}
                        onDecide={(issue, reaction) => void decideFinding(issue, reaction)}
                      />
                    ) : null}
                    <TimelineLog engagement={engagement} mode="discovery" />
                  </div>
                ) : null}
                {view === "probing" ? <TimelineLog engagement={engagement} mode="probing" /> : null}
                {view === "assumptions" ? <TimelineLog engagement={engagement} mode="assumptions" /> : null}

                {view === "workspace" ? (
                  <LastAgentNote
                    messages={messages}
                    onOpenChat={() => setView("chat")}
                  />
                ) : null}

                {view === "chat" && (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <article
                        key={message.id}
                        className={`animate-fade-up max-w-3xl ${message.role === "user" ? "ml-auto" : ""}`}
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                          {message.role === "user" ? user.name : "Agent"}
                        </p>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-sage text-white"
                              : "border border-[var(--line)] bg-white/90"
                          }`}
                        >
                          <div className="prose-chat text-[14px] leading-7">
                            {message.parts.map((part, index) => {
                              if (part.type === "text") {
                                return <Markdown key={`${message.id}-${index}`}>{part.text}</Markdown>;
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
                                    className="my-2 rounded-lg bg-cloud-2 px-2 py-1 font-mono text-[12px] text-ink-soft"
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
                    {error ? <p className="text-sm text-rust">{error.message}</p> : null}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={onSubmit} className="border-t border-[var(--line)] bg-white/90 p-4">
              <div className="mx-auto max-w-[1200px]">
                {(engagement.documents || []).length > 0 ? (
                  <button
                    type="button"
                    className="mb-2 text-left text-[11px] text-ink-soft hover:text-sage"
                    onClick={() => setView("documents")}
                  >
                    {engagement.documents.length} source document{engagement.documents.length === 1 ? "" : "s"} attached
                  </button>
                ) : null}
                <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={composerPlaceholder(engagement.stage)}
                  className="field-input h-24 flex-1 resize-none rounded-2xl px-3 py-2 text-[14px]"
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
                    <button type="submit" className="btn-primary rounded-full px-4 py-2 text-sm font-medium">
                      Send
                    </button>
                  )}
                  <ComposerAttach
                    engagementId={initial.id}
                    disabled={busy}
                    onUploaded={(next, names) => {
                      setEngagement(next);
                      setView("workspace");
                      setRightOpen(true);
                      void sendText(documentReviewPrompt(names));
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-full border border-sage/40 px-4 py-2 text-[12px] text-sage xl:hidden"
                    onClick={() => setRightOpen(true)}
                  >
                    Probe
                  </button>
                </div>
                </div>
              </div>
            </form>
          </section>

          {engagement.stage > 1 || rightOpen ? (
          <RightSidebar
            engagement={engagement}
            selectedIssue={selectedIssue}
            open={rightOpen || engagement.stage > 1}
            onClose={() => setRightOpen(false)}
            onSelect={selectIssue}
            onConfirm={(issue, note) => void decideFinding(issue, "accepted", note)}
            onChallenge={(issue, note) => void decideFinding(issue, "disputed", note)}
            onFlag={(issue, note) => void decideFinding(issue, "deeper-investigation", note)}
          />
          ) : null}
        </div>
      </div>

      <SignOffGate
        engagement={engagement}
        open={signOffOpen}
        onClose={() => setSignOffOpen(false)}
        onSignOff={onSignOff}
      />
    </div>
  );
}
