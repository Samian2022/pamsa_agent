import { convertToModelMessages, pruneMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { extractFindingsResponse, extractProbeResponse } from "@/lib/agent/discovery";
import { extractResearchResponse } from "@/lib/agent/research";
import { createAgentTools } from "@/lib/agent/tools";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { getCurrentUser } from "@/lib/auth";
import { loadDocumentTextForPrompt } from "@/lib/documents";
import { getModel } from "@/lib/model";
import { getEngagement, updateEngagement } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

function lastUserText(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    return message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n");
  }
  return "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = (await request.json()) as {
    messages?: UIMessage[];
    engagementId?: string;
  };
  const engagementId = body.engagementId;
  if (!engagementId) {
    return new Response(JSON.stringify({ error: "engagementId required" }), { status: 400 });
  }

  const engagement = await getEngagement(engagementId);
  if (!engagement) {
    return new Response(JSON.stringify({ error: "Engagement not found" }), { status: 404 });
  }

  const messages = body.messages || [];
  const userText = lastUserText(messages);
  const probeTurn = /need more evidence|more evidence on/i.test(userText);
  const decisionTurn = /this is material|do not treat|log_discovery|log_probe/i.test(userText);
  const cardCount = engagement.artifacts.discoveryCards?.length || 0;
  const findingExtract =
    !decisionTurn &&
    !probeTurn &&
    (/uploaded|save_discovery_cards|discovery cards|read_uploaded_document|ask agent to review/i.test(userText) ||
      (engagement.stage >= 2 && cardCount < 6));
  const candidateCount = engagement.artifacts.researchCandidates?.length || 0;
  const stage1 = engagement.stage <= 1;
  const stage1Research =
    stage1 &&
    !engagement.artifacts.selectedCompany &&
    candidateCount < 5 &&
    /research|candidates|criteria|sector|energy|see the list|where is the result|show the list/i.test(userText);
  if (probeTurn) {
    return extractProbeResponse({
      engagement,
      engagementId,
      messages,
      userText,
    });
  }
  const tools = createAgentTools(engagementId);
  const documentBodies = await loadDocumentTextForPrompt(engagementId, engagement.documents || []);
  if (findingExtract) {
    return extractFindingsResponse({
      engagement,
      engagementId,
      messages,
      documentBodies,
      userText,
    });
  }
  if (stage1Research) {
    return extractResearchResponse({
      engagement,
      engagementId,
      messages,
      userText,
    });
  }
  const modelMessages = pruneMessages({
    messages: await convertToModelMessages(messages, { tools }),
    toolCalls: "before-last-message",
    reasoning: "before-last-message",
    emptyMessages: "remove",
  });

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(engagement, { documentBodies }),
    messages: modelMessages,
    tools,
    timeout: { totalMs: 50_000, toolMs: stage1 ? 8_000 : 12_000 },
    stopWhen: stepCountIs(decisionTurn ? 3 : stage1 ? 2 : 4),
    activeTools: decisionTurn
      ? ["log_discovery", "log_probe", "save_discovery_cards"]
      : stage1
        ? ["web_search", "save_research_candidates"]
        : undefined,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: nextMessages }) => {
      await updateEngagement(engagementId, (current) => ({
        ...current,
        messages: nextMessages,
      }));
    },
  });
}
