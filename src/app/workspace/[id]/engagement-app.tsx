"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import { buildContextSummary, signOffComplete } from "@/lib/stages";
import type { Engagement, IssueScore, MethodologyProgress, SessionUser, SignOffState } from "@/lib/types";
import { LeftSidebar } from "@/components/workspace/left-sidebar";
import type { WorkspaceView } from "@/components/workspace/views";
import { RightSidebar } from "@/components/workspace/right-sidebar";
import { SignOffGate } from "@/components/workspace/sign-off-gate";
import {
  HypothesisCards,
  MetricsGrid,
  ModelBuilder,
  ProfileView,
  ResearchCards,
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
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

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

  useEffect(() => {
    if (engagement.stage === 4 && !signOffComplete(engagement.signOff)) {
      setSignOffOpen(true);
    }
  }, [engagement.stage]);

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

  async function onScores(issueScores: IssueScore[]) {
    const response = await fetch(`/api/engagements/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueScores }),
    });
    const data = (await response.json()) as { engagement?: Engagement };
    if (data.engagement) setEngagement(data.engagement);
  }

  const busy = status === "submitted" || status === "streaming";

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
    setView(next);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cloud">
      {mobileNav ? (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <LeftSidebar engagement={engagement} view={view} onView={(next) => { go(next); setMobileNav(false); }} />
          <button type="button" className="flex-1 bg-forest/50" aria-label="Close menu" onClick={() => setMobileNav(false)} />
        </div>
      ) : null}
      <div className="hidden md:flex">
        <LeftSidebar engagement={engagement} view={view} onView={go} collapsed={navCollapsed} />
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
          <p className="hidden text-[12px] text-ink-soft lg:block">
            {user.name}
            {engagement.artifacts.selectedCompany ? ` · ${engagement.artifacts.selectedCompany}` : ""}
          </p>
        </header>

        <div className="organic-bg border-b border-[var(--line)] px-4 py-3 text-[12px] leading-5 text-ink-soft">
          {buildContextSummary(engagement)}
        </div>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
              <div className="mx-auto w-full max-w-[1200px] space-y-8">
                {view === "workspace" || view === "issues" ? (
                  <>
                    {engagement.stage <= 1 ? (
                      <ResearchCards
                        engagement={engagement}
                        onSelect={(company) => {
                          void sendText(`Start DMA on ${company}. Use set_selected_company and begin the Stage 2 disclosure audit.`);
                        }}
                      />
                    ) : null}
                    {engagement.stage === 2 ? <ProfileView engagement={engagement} /> : null}
                    {engagement.stage >= 3 && engagement.stage <= 4 ? (
                      <>
                        <ScoringPanel
                          engagement={engagement}
                          selected={selectedIssue}
                          onSelect={selectIssue}
                          onScores={onScores}
                        />
                        <HypothesisCards engagement={engagement} onSelect={selectIssue} />
                        <MetricsGrid engagement={engagement} />
                      </>
                    ) : null}
                    {engagement.stage === 5 ? (
                      <div>
                        <p className="section-kicker mb-4 text-[16px]">Issue selection</p>
                        <p className="text-[14px] text-ink-soft">
                          {engagement.artifacts.pricingScope?.notes ||
                            "Pick 2 to 4 material issues from your DMA to model financially. Which has the clearest P&L pathway?"}
                        </p>
                      </div>
                    ) : null}
                    {engagement.stage === 6 ? (
                      <TeachForm engagement={engagement} onMethodology={onMethodology} />
                    ) : null}
                    {engagement.stage >= 7 ? <ModelBuilder engagement={engagement} /> : null}
                  </>
                ) : null}

                {view === "discovery" ? <TimelineLog engagement={engagement} mode="discovery" /> : null}
                {view === "probing" ? <TimelineLog engagement={engagement} mode="probing" /> : null}
                {view === "assumptions" ? <TimelineLog engagement={engagement} mode="assumptions" /> : null}

                {(view === "chat" || view === "workspace") && (
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
              <div className="mx-auto flex max-w-[1200px] gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="What's your assessment? Reply with criteria, challenge a finding, pick a company, or paste a filing URL."
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
                  <button
                    type="button"
                    className="rounded-full border border-sage/40 px-4 py-2 text-[12px] text-sage xl:hidden"
                    onClick={() => setRightOpen(true)}
                  >
                    Probe
                  </button>
                </div>
              </div>
            </form>
          </section>

          <RightSidebar
            engagement={engagement}
            selectedIssue={selectedIssue}
            open={rightOpen}
            onClose={() => setRightOpen(false)}
            onConfirm={(issue, note) => {
              void sendText(
                `I agree this is material: "${issue}". ${note || "Please log my validation."}`.trim(),
              );
            }}
            onChallenge={(issue, note) => {
              void sendText(
                `I disagree with the finding on "${issue}". ${note || "It does not fully hold yet. Probe it, bring new evidence, and log the revision."}`.trim(),
              );
            }}
            onFlag={(issue, note) => {
              void sendText(
                `Flag "${issue}" for investigation. ${note || "Keep it on the discovery log as needing more evidence."}`.trim(),
              );
            }}
          />
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
