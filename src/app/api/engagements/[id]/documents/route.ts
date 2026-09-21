import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_ENGAGEMENT,
  isAllowedDocument,
  storeUploadedDocument,
} from "@/lib/documents";
import { getEngagement, updateEngagement } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const engagement = await getEngagement(id);
  if (!engagement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((engagement.documents || []).length >= MAX_DOCUMENTS_PER_ENGAGEMENT) {
    return NextResponse.json(
      { error: `This engagement already has ${MAX_DOCUMENTS_PER_ENGAGEMENT} documents. Remove one before uploading another.` },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "Files must be 4 MB or smaller." }, { status: 413 });
  }
  if (!isAllowedDocument(file.name, file.type)) {
    return NextResponse.json(
      { error: "Upload a PDF, TXT, MD, CSV, JSON, HTML, or XLSX file." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const document = await storeUploadedDocument({
    engagementId: id,
    file: { name: file.name, type: file.type, size: file.size },
    buffer,
    user,
  });

  const next = await updateEngagement(id, (current) => ({
    ...current,
    documents: [...(current.documents || []), document],
  }));

  return NextResponse.json({ document, engagement: next });
}
