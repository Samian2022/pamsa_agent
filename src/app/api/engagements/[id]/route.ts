import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteEngagement, getEngagement, updateEngagement } from "@/lib/storage";
import type { MethodologyProgress, SignOffState } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const engagement = await getEngagement(id);
  if (!engagement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
  };
  try {
    const engagement = await updateEngagement(id, (current) => ({
      ...current,
      title: body.title ?? current.title,
      signOff: body.signOff ?? current.signOff,
      methodology: body.methodology ?? current.methodology,
    }));
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
