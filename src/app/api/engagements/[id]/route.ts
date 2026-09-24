import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hydrateStuckResearch } from "@/lib/agent/research";
import { applyStageGates, canEnterStage } from "@/lib/stages";
import { deleteEngagement, getEngagement, updateEngagement } from "@/lib/storage";
import type { IssueScore, MethodologyProgress, PricingScope, ResearchCandidate, SignOffState, StageId, UserReaction } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const found = await getEngagement(id);
  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const engagement = await hydrateStuckResearch(found);
  return NextResponse.json({ engagement });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    signOff?: SignOffState;
    methodology?: MethodologyProgress;
    issueScores?: IssueScore[];
    selectedCompany?: string;
    stage?: StageId;
    pricingScope?: PricingScope;
    researchCandidates?: ResearchCandidate[];
    searchCriteria?: string;
    discoveryReaction?: { issue: string; reaction: UserReaction; notes?: string };
  };
  try {
    const engagement = await updateEngagement(id, (current) => {
      const nextSignOff = body.signOff ?? current.signOff;
      const nextMethodology = body.methodology ?? current.methodology;
      const nextLog = body.discoveryReaction
        ? [
            ...current.discoveryLog.filter(
              (item) => item.issue.toLowerCase() !== body.discoveryReaction!.issue.toLowerCase(),
            ),
            {
              id: `d-${Date.now()}`,
              issue: body.discoveryReaction.issue,
              raisedAt: new Date().toISOString(),
              source: current.discoveryLog.find((item) => item.issue === body.discoveryReaction!.issue)?.source || "user review",
              confidence:
                current.discoveryLog.find((item) => item.issue === body.discoveryReaction!.issue)?.confidence ||
                current.artifacts.discoveryCards?.find((item) => item.issue === body.discoveryReaction!.issue)?.confidence ||
                "medium",
              reaction: body.discoveryReaction.reaction,
              notes: body.discoveryReaction.notes,
            },
          ]
        : current.discoveryLog;
      let nextStage = current.stage;
      if (typeof body.stage === "number" && canEnterStage(body.stage, current.stage, nextSignOff, nextMethodology)) {
        nextStage = body.stage;
      }

      return applyStageGates({
        ...current,
        title: body.title ?? (body.selectedCompany ? `${body.selectedCompany} Materiality Study` : current.title),
        stage: nextStage,
        signOff: nextSignOff,
        methodology: nextMethodology,
        discoveryLog: nextLog,
        artifacts: {
          ...current.artifacts,
          issueScores: body.issueScores ?? current.artifacts.issueScores,
          selectedCompany: body.selectedCompany ?? current.artifacts.selectedCompany,
          pricingScope: body.pricingScope ?? current.artifacts.pricingScope,
          researchCandidates: body.researchCandidates ?? current.artifacts.researchCandidates,
          searchCriteria: body.searchCriteria ?? current.artifacts.searchCriteria,
        },
      });
    });
    return NextResponse.json({ engagement });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  await deleteEngagement(id);
  return NextResponse.json({ ok: true });
}
