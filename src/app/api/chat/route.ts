import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
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
  const decisionTurn = /this is material|do not treat|more evidence|log_discovery|log_probe/i.test(userText);
  const cardCount = engagement.artifacts.discoveryCards?.length || 0;
  const findingExtract =
    !decisionTurn &&
    (/uploaded|save_discovery_cards|discovery cards|read_uploaded_document|ask agent to review/i.test(userText) ||
      (engagement.stage >= 2 && cardCount < 6));
  const tools = createAgentTools(engagementId);
  const documentBodies = await loadDocumentTextForPrompt(engagementId, engagement.documents || []);

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(engagement, { documentBodies }),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    timeout: { totalMs: 50_000, toolMs: 12_000 },
    stopWhen: stepCountIs(findingExtract ? 2 : decisionTurn ? 3 : 5),
    activeTools: findingExtract
      ? ["save_discovery_cards"]
      : decisionTurn
        ? ["log_discovery", "log_probe", "save_discovery_cards"]
        : undefined,
    prepareStep: ({ stepNumber }) => {
      if (findingExtract) {
        if (stepNumber === 0) {
          return {
            toolChoice: { type: "tool" as const, toolName: "save_discovery_cards" as const },
            activeTools: ["save_discovery_cards"] as const,
          };
        }
        return { toolChoice: "none" as const };
      }
      return {};
    },
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
