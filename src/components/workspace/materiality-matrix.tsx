"use client";

import { useMemo, useState } from "react";
import { confidencePercent } from "@/lib/format";
import type { DiscoveryLogEntry, IssueScore } from "@/lib/types";

function bubbleMeta(
  issue: IssueScore,
  discoveryLog: DiscoveryLogEntry[],
) {
  const reaction = discoveryLog.find((item) => item.issue === issue.issue)?.reaction;
  const probed = discoveryLog.some((item) => item.issue === issue.issue && item.reaction !== "pending");
  const disputed = reaction === "disputed" || reaction === "deeper-investigation";
  const confirmed = reaction === "accepted";
  let fill = "var(--sage)";
  if (!issue.disclosed) fill = "var(--rust)";
  if (disputed) fill = "var(--amber)";
  if (issue.emerging && issue.disclosed) fill = "var(--teal)";
  const size = issue.confidence === "high" ? 18 : issue.confidence === "medium" ? 14 : 11;
  const border = confirmed ? "solid" : probed ? "dotted" : "dashed";
  const status = !issue.disclosed
    ? "Company is silent on this"
    : disputed
      ? "You're investigating this"
      : confirmed
        ? "Disclosed by company"
        : "Disclosed by company";
  return { fill, size, border, reaction, confirmed, probed, status };
}

export function MaterialityMatrix({
  issues,
  discoveryLog = [],
  compact = false,
  selected,
  onSelect,
}: {
  issues: IssueScore[];
  discoveryLog?: DiscoveryLogEntry[];
  compact?: boolean;
  selected?: string | null;
  onSelect?: (issue: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const sizeClass = compact ? "h-20 w-20" : "aspect-square w-full max-w-[600px]";

  const plotted = useMemo(
    () =>
      issues.map((issue, index) => ({
        issue,
        index,
        left: ((issue.financialScore - 0.5) / 5) * 100,
        bottom: ((issue.impactScore - 0.5) / 5) * 100,
        ...bubbleMeta(issue, discoveryLog),
      })),
    [issues, discoveryLog],
  );

  const hovered = issues.find((item) => item.issue === hover);

  return (
    <div className={compact ? "" : "space-y-3"}>
      {compact ? null : (
        <div>
          <h2 className="section-kicker text-[16px] md:text-[20px]">Your double materiality map</h2>
          <p className="mt-2 text-[13px] leading-6 text-ink-soft">
            What impacts the company (X) meets what impacts the world (Y). Bigger bubbles mean higher
            confidence in your scoring.
          </p>
        </div>
      )}
      <div className={`relative ${sizeClass} overflow-hidden rounded-2xl border border-[var(--line)] bg-cloud`}>
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="bg-amber/15" />
          <div className="bg-forest/20" />
          <div className="bg-sage/10" />
          <div className="bg-amber/10" />
        </div>
        {compact ? null : (
          <>
            <span className="absolute right-3 top-2 text-[10px] font-medium text-forest">Material and urgent</span>
            <span className="absolute left-3 top-2 text-[10px] font-medium text-amber">Stakeholder priority</span>
            <span className="absolute bottom-8 right-3 text-[10px] font-medium text-sage">Business priority</span>
            <span className="absolute bottom-8 left-3 text-[10px] font-medium text-taupe">Monitor</span>
          </>
        )}
        <div className={`absolute ${compact ? "inset-1" : "bottom-10 left-10 right-6 top-8"}`}>
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
            {Array.from({ length: 25 }).map((_, index) => (
              <div key={index} className="border border-[var(--line)]/50" />
            ))}
          </div>
          {plotted.map((item) => {
            const active = selected === item.issue.issue || hover === item.issue.issue;
            return (
              <button
                key={item.issue.issue}
                type="button"
                title={`${item.issue.issue}. ${item.status}. Confidence: ${confidencePercent(item.issue.confidence)}%.`}
                onClick={() => onSelect?.(item.issue.issue)}
                onMouseEnter={() => setHover(item.issue.issue)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(item.issue.issue)}
                onBlur={() => setHover(null)}
                className={`absolute z-10 origin-center cursor-pointer rounded-full focus-ring ${compact ? "" : "animate-bubble"}`}
                style={{
                  left: `${item.left}%`,
                  bottom: `${item.bottom}%`,
                  width: item.size,
                  height: item.size,
                  background: item.fill,
                  border: `2px ${item.border} ${item.confirmed ? "white" : "rgba(26,58,46,0.55)"}`,
                  animationDelay: `${item.index * 0.08}s`,
                  transform: active ? "translate(-50%, 50%) scale(1.3)" : undefined,
                  boxShadow: active ? "0 6px 16px rgba(26,58,46,0.28)" : undefined,
                  zIndex: active ? 20 : 10,
                }}
                aria-label={`${item.issue.issue}, financial ${item.issue.financialScore}, impact ${item.issue.impactScore}, ${item.status}`}
              />
            );
          })}
          {!compact && hovered ? (
            <div className="pointer-events-none absolute right-0 top-0 z-30 max-w-[220px] rounded-lg bg-forest px-2 py-1 text-[11px] leading-4 text-white">
              {hovered.issue}. Financial impact: {FINANCIAL_HINT[hovered.financialScore]}. Confidence:{" "}
              {confidencePercent(hovered.confidence)}%. {bubbleMeta(hovered, discoveryLog).status}.
            </div>
          ) : null}
        </div>
        {compact ? null : (
          <>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-ink-soft">
              Financial materiality: under 0.1% of EBITDA → over 10% or business-model risk
            </span>
            <span className="absolute left-2 top-1/2 origin-left -rotate-90 text-[10px] text-ink-soft">
              Impact materiality: niche interest → regulation in force
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const FINANCIAL_HINT = ["", "<0.1% EBITDA", "0.1-0.5% EBITDA", "0.5-2% EBITDA", "2-10% EBITDA", ">10% EBITDA"];
