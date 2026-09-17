import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildEngagementWorkbook } from "@/lib/excel";
import { getEngagement } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const engagement = await getEngagement(id);
  if (!engagement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await buildEngagementWorkbook(engagement);
  const filename = `${(engagement.artifacts.selectedCompany || engagement.title)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}-dma.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
