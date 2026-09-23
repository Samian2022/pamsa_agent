"use client";

import { useMemo, useState } from "react";
import { confidencePercent } from "@/lib/format";
import type { Engagement } from "@/lib/types";

export function RightSidebar({
  engagement,
  selectedIssue,
  open,
  onClose,
  onSelect,
  onConfirm,
  onChallenge,
  onFlag,
}: {
  engagement: Engagement;
  selectedIssue: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (issue: string) => void;
  onConfirm: (issue: string, note: string) => void;
  onChallenge: (issue: string, note: string) => void;
  onFlag: (issue: string, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const score = engagement.artifacts.issueScores?.find((item) => item.issue === selectedIssue);
  const card = engagement.artifacts.discoveryCards?.find((item) => item.issue === selectedIssue);
  const probes = engagement.probeLog.filter(
    (item) =>
      item.originalClaim.includes(selectedIssue || "___") ||
      item.revisedClaim.includes(selectedIssue || "___"),
  );
  const discovery = engagement.discoveryLog.find((item) => item.issue === selectedIssue);
  const citations = engagement.citations.filter((item) =>
    selectedIssue ? item.claim.toLowerCase().includes(selectedIssue.toLowerCase()) : true,
  );
  const snapshot = engagement.artifacts.snapshot;
  const confidence = score?.confidence || card?.confidence || "medium";

  const nextStep = useMemo(() => {
    if (!selectedIssue) return "Open a finding card. The agent proposes. You decide.";
    if (discovery?.reaction === "accepted") return "You marked this as material. It stays in your DMA unless you change your call.";
    if (discovery?.reaction === "disputed") return "You marked this as not material. The agent should bring new evidence before you rescore.";
    if (discovery?.reaction === "deeper-investigation") return "You asked for more evidence. Wait for the next batch, then decide.";
    return "Let's test this finding together. Do you agree this is material?";
  }, [discovery, selectedIssue]);

  return (
    <aside
      className={`${
        open ? "flex" : "hidden"
      } fixed inset-y-0 right-0 z-20 w-[280px] shrink-0 flex-col border-l-[2px] border-sage bg-cloud shadow-xl xl:static xl:flex xl:shadow-none`}
    >
      <div className="flex items-center justify-between border-b border-sage/20 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-forest">
          {selectedIssue ? `Probing: ${selectedIssue}` : "Context"}
        </p>
        <button type="button" onClick={onClose} className="text-[12px] text-ink-soft xl:hidden">
          Close
        </button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-[13px] leading-5">
        {!selectedIssue ? (
          <>
            {(engagement.artifacts.discoveryCards || []).length ? (
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-taupe">Findings to decide</h3>
                <ul className="mt-2 space-y-2">
                  {(engagement.artifacts.discoveryCards || []).map((item) => {
                    const reaction = engagement.discoveryLog.find((entry) => entry.issue === item.issue)?.reaction;
                    const pending = !reaction || reaction === "pending";
                    return (
                      <li key={item.issue}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-left text-[12px] text-forest"
                          onClick={() => onSelect(item.issue)}
                        >
                          {item.issue}
                          <span className="mt-1 block text-[11px] uppercase tracking-wide text-rust">
                            {pending ? "Waiting for your call" : reaction}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <>
            <section>
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-taupe">Company snapshot</h3>
              <p className="mt-2 text-ink-soft">
                {engagement.artifacts.selectedCompany || "Search companies. Surface risks. Let's begin."}
              </p>
              {snapshot ? (
                <p className="mt-2 text-[12px] text-ink-soft">{snapshot.businessModel}</p>
              ) : null}
            </section>
            <section>
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-taupe">Regulatory horizon</h3>
              <p className="mt-2 text-[12px] text-ink-soft">
                {snapshot?.regulatoryExposure || "Peer benchmarks and upcoming rules appear here after profiling."}
              </p>
            </section>
              </>
            )}
          </>
        ) : (
          <section className="animate-slide-right space-y-3 rounded-xl border border-sage/25 bg-white p-3">
            <p className="text-[12px] text-ink-soft">The agent proposes. You decide with the three buttons below.</p>
            <p className="text-[12px]">
              <span className="font-medium">What they disclose: </span>
              {card?.companyDisclosure || score?.disclosureStatus || "Not yet mapped."}
            </p>
            <p className="text-[12px]">
              <span className="font-medium">ESRS / best practice: </span>
              {card?.esrsExpectation || score?.esrs || "Assign a metric after probing."}
            </p>
            <p className="text-[12px]">
              <span className="font-medium">Agent proposes: </span>
              {card?.whyExposure || score?.financialEvidence || "Waiting on evidence."}{" "}
              {score?.disclosed === false ? "The company is silent on this. " : ""}
              Estimated financial materiality: {score ? `F${score.financialScore} / I${score.impactScore}` : "not yet scored"}.
            </p>
            {card?.operationsSignal ? (
              <p className="text-[12px] text-ink-soft">
                <span className="font-medium">Operations signal: </span>
                {card.operationsSignal}
              </p>
            ) : null}
            <p className="text-[12px] text-ink-soft">
              This issue surfaced from {discovery?.source || card?.evidence || "research in this engagement"}.
              Confidence: {confidencePercent(confidence)}%. Your input shapes the final assessment.
            </p>
            {probes[0] ? (
              <p className="animate-[pulse-status_0.6s_ease-out] text-[12px] text-rust">
                You previously said: {probes[0].userChallenge}
              </p>
            ) : discovery?.notes ? (
              <p className="text-[12px] text-amber">Your previous reaction: {discovery.notes}</p>
            ) : null}
            <p className="text-[12px] text-teal">{card?.nextInvestigation || nextStep}</p>
          </section>
        )}

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.16em] text-taupe">Evidence base</h3>
          {citations.length ? (
            citations.slice(0, 6).map((item, index) => (
              <p
                key={item.id}
                className="mt-2 text-[12px] text-ink-soft"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {item.source}
                {item.date ? ` (${item.date})` : ""}
                {item.url ? (
                  <a className="ml-1 text-sage underline" href={item.url} target="_blank" rel="noreferrer">
                    open
                  </a>
                ) : null}
              </p>
            ))
          ) : (
            <p className="mt-2 text-[12px] text-ink-soft">Sources will appear as the agent cites them. Every claim should be sourced.</p>
          )}
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.16em] text-taupe">Open data gaps</h3>
          {engagement.dataGapLog.filter((item) => item.status === "open").length ? (
            engagement.dataGapLog
              .filter((item) => item.status === "open")
              .slice(0, 4)
              .map((item) => (
                <p key={item.id} className="mt-2 text-[12px] text-rust">
                  {item.gap}
                </p>
              ))
          ) : (
            <p className="mt-2 text-[12px] text-ink-soft">No open gaps logged yet.</p>
          )}
        </section>

        {selectedIssue ? (
          <label className="block text-[12px] font-medium text-forest">
            What's your assessment?
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Agree this is material? Have better evidence? Concerns about the scoring?"
              className="field-input mt-1 h-20 w-full resize-none rounded-xl px-2 py-2 text-[12px] font-normal"
            />
          </label>
        ) : null}
      </div>

      <div className="sticky bottom-0 space-y-2 border-t border-sage/20 bg-cloud p-3">
        <button
          type="button"
          disabled={!selectedIssue}
          onClick={() => selectedIssue && onConfirm(selectedIssue, note)}
          className="btn-primary w-full rounded-full px-3 py-2 text-[13px] font-medium"
        >
          This is material
        </button>
        <button
          type="button"
          disabled={!selectedIssue}
          onClick={() => selectedIssue && onChallenge(selectedIssue, note)}
          className="w-full rounded-full bg-rust px-3 py-2 text-[13px] font-medium text-white disabled:opacity-40"
        >
          Not material
        </button>
        <button
          type="button"
          disabled={!selectedIssue}
          onClick={() => selectedIssue && onFlag(selectedIssue, note)}
          className="w-full rounded-full bg-amber px-3 py-2 text-[12px] font-medium text-forest disabled:opacity-40"
        >
          Need more evidence
        </button>
      </div>
    </aside>
  );
}
