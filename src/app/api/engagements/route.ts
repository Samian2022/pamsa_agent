import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createEngagement, listEngagements, saveEngagement, summarizeEngagement } from "@/lib/storage";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const engagements = await listEngagements();
  return NextResponse.json({ engagements: engagements.map(summarizeEngagement) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const engagement = createEngagement(user, body.title || "New engagement");
  await saveEngagement(engagement);
  return NextResponse.json({ engagement });
}
