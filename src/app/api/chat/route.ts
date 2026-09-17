import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { createAgentTools } from "@/lib/agent/tools";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { getCurrentUser } from "@/lib/auth";
import { getModel } from "@/lib/model";
import { getEngagement, updateEngagement } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const tools = createAgentTools(engagementId);

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(engagement),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(12),
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
