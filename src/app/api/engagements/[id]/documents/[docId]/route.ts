import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUploadedDocument, readOriginalDocument } from "@/lib/documents";
import { getEngagement, updateEngagement } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string; docId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, docId } = await context.params;
  const engagement = await getEngagement(id);
  const document = engagement?.documents.find((item) => item.id === docId);
  if (!engagement || !document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bytes = await readOriginalDocument(id, document);
  if (!bytes) {
    return NextResponse.json({ error: "File is missing from storage." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${document.storageName.replace(/"/g, "")}"`,
    },
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, docId } = await context.params;
  const engagement = await getEngagement(id);
  if (!engagement?.documents.some((item) => item.id === docId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteUploadedDocument(id, docId);
  const next = await updateEngagement(id, (current) => ({
    ...current,
    documents: (current.documents || []).filter((item) => item.id !== docId),
  }));
  return NextResponse.json({ engagement: next });
}
