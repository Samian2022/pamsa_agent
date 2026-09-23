import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { del, get, list, put } from "@vercel/blob";
import ExcelJS from "exceljs";
import type { DocumentExtractStatus, SessionUser, UploadedDocument } from "./types";

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_ENGAGEMENT = 12;
export const EXTRACT_CHAR_CAP = 180_000;
export const EXCERPT_CHAR_CAP = 1_800;
export const PROMPT_DOC_CHAR_CAP = 8_000;
export const PROMPT_DOC_MAX_FILES = 2;

const DATA_ROOT = path.join(process.cwd(), ".data");

const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "md", "csv", "json", "html", "htm", "xlsx"]);

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv",
  "application/json",
  "text/html",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function usesBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function sanitizeFilename(name: string) {
  const trimmed = name.replace(/[/\\]/g, "_").replace(/[^\w.\- ()[\]]+/g, "_").trim();
  return (trimmed || "document").slice(0, 120);
}

export function fileExtension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

export function isAllowedDocument(name: string, mimeType: string) {
  const ext = fileExtension(name);
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  return ALLOWED_MIME.has(mimeType);
}

function blobOriginalPath(engagementId: string, docId: string, storageName: string) {
  return `engagements/${engagementId}/docs/${docId}/${storageName}`;
}

function blobExtractPath(engagementId: string, docId: string) {
  return `engagements/${engagementId}/docs/${docId}/extracted.txt`;
}

function localPath(pathname: string) {
  return path.join(DATA_ROOT, pathname);
}

function collapseWhitespace(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripHtml(html: string) {
  return collapseWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"'),
  );
}

async function extractPdf(buffer: Buffer) {
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  const text = typeof result.text === "string" ? result.text : String(result.text ?? "");
  return collapseWhitespace(text);
}

async function extractSpreadsheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer) as never);
  const chunks: string[] = [];
  workbook.eachSheet((sheet, index) => {
    if (index > 12) return;
    chunks.push(`# Sheet: ${sheet.name}`);
    let rowCount = 0;
    sheet.eachRow((row) => {
      if (rowCount >= 200) return;
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const line = values
        .map((cell) => {
          if (cell == null) return "";
          if (typeof cell === "object" && "text" in cell) return String(cell.text);
          if (typeof cell === "object" && "result" in cell) return String(cell.result ?? "");
          return String(cell);
        })
        .join("\t");
      if (line.trim()) {
        chunks.push(line);
        rowCount += 1;
      }
    });
  });
  return collapseWhitespace(chunks.join("\n"));
}

export async function extractDocumentText(name: string, mimeType: string, buffer: Buffer) {
  const ext = fileExtension(name);
  try {
    if (ext === "pdf" || mimeType === "application/pdf") {
      const text = await extractPdf(buffer);
      if (!text) {
        return {
          text: "",
          status: "empty" as DocumentExtractStatus,
          notes: "No extractable text. This may be a scanned PDF. Paste key pages into chat or upload a text version.",
        };
      }
      return { text: text.slice(0, EXTRACT_CHAR_CAP), status: "ok" as DocumentExtractStatus };
    }
    if (ext === "xlsx" || mimeType.includes("spreadsheetml")) {
      const text = await extractSpreadsheet(buffer);
      if (!text) {
        return { text: "", status: "empty" as DocumentExtractStatus, notes: "The spreadsheet had no readable cells." };
      }
      return { text: text.slice(0, EXTRACT_CHAR_CAP), status: "ok" as DocumentExtractStatus };
    }
    if (["txt", "md", "csv", "json", "html", "htm"].includes(ext) || mimeType.startsWith("text/") || mimeType === "application/json") {
      let text = buffer.toString("utf8").replace(/^\uFEFF/, "");
      if (ext === "html" || ext === "htm" || mimeType === "text/html") text = stripHtml(text);
      else if (ext === "json" || mimeType === "application/json") {
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          // keep raw text
        }
      }
      text = collapseWhitespace(text);
      if (!text) {
        return { text: "", status: "empty" as DocumentExtractStatus, notes: "The file was empty after extraction." };
      }
      return { text: text.slice(0, EXTRACT_CHAR_CAP), status: "ok" as DocumentExtractStatus };
    }
    return {
      text: "",
      status: "unsupported" as DocumentExtractStatus,
      notes: "This file type is stored, but PAMSA cannot extract text from it yet. Use PDF, TXT, MD, CSV, JSON, HTML, or XLSX.",
    };
  } catch (error) {
    return {
      text: "",
      status: "failed" as DocumentExtractStatus,
      notes: error instanceof Error ? error.message : "Text extraction failed.",
    };
  }
}

async function writeBytes(pathname: string, body: Buffer | string, contentType: string) {
  if (usesBlob()) {
    await put(pathname, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return;
  }
  const full = localPath(pathname);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

async function readBytes(pathname: string): Promise<Buffer | null> {
  if (usesBlob()) {
    const result = await get(pathname, { access: "private", useCache: false }).catch(() => null);
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  try {
    return await readFile(localPath(pathname));
  } catch {
    return null;
  }
}

export async function storeUploadedDocument(options: {
  engagementId: string;
  file: { name: string; type: string; size: number };
  buffer: Buffer;
  user: SessionUser;
}): Promise<UploadedDocument> {
  const id = randomUUID();
  const storageName = sanitizeFilename(options.file.name);
  const extracted = await extractDocumentText(options.file.name, options.file.type, options.buffer);
  await writeBytes(
    blobOriginalPath(options.engagementId, id, storageName),
    options.buffer,
    options.file.type || "application/octet-stream",
  );
  if (extracted.text) {
    await writeBytes(blobExtractPath(options.engagementId, id), extracted.text, "text/plain; charset=utf-8");
  }
  return {
    id,
    name: options.file.name,
    storageName,
    mimeType: options.file.type || "application/octet-stream",
    size: options.file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: options.user,
    charCount: extracted.text.length,
    extractStatus: extracted.status,
    excerpt: extracted.text.slice(0, EXCERPT_CHAR_CAP),
    notes: extracted.notes,
  };
}

export async function readOriginalDocument(engagementId: string, doc: UploadedDocument) {
  return readBytes(blobOriginalPath(engagementId, doc.id, doc.storageName));
}

export async function readExtractedText(engagementId: string, documentId: string) {
  const buffer = await readBytes(blobExtractPath(engagementId, documentId));
  return buffer ? buffer.toString("utf8") : "";
}

export async function loadDocumentTextForPrompt(
  engagementId: string,
  documents: UploadedDocument[],
) {
  const recent = [...documents]
    .filter((item) => item.extractStatus === "ok")
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, PROMPT_DOC_MAX_FILES);

  const blocks: string[] = [];
  for (const doc of recent) {
    const text = (await readExtractedText(engagementId, doc.id)) || doc.excerpt || "";
    if (!text) continue;
    const slice = text.slice(0, PROMPT_DOC_CHAR_CAP);
    const truncated = text.length > PROMPT_DOC_CHAR_CAP ? "\n[truncated. Call read_uploaded_document only if you need a later page.]" : "";
    blocks.push(`### ${doc.name} (id: ${doc.id})\n${slice}${truncated}`);
  }
  return blocks.join("\n\n");
}

export async function deleteUploadedDocument(engagementId: string, documentId: string) {
  if (usesBlob()) {
    const listed = await list({ prefix: `engagements/${engagementId}/docs/${documentId}/` });
    const urls = listed.blobs.map((blob) => blob.url);
    if (urls.length > 0) await del(urls);
    return;
  }
  await rm(localPath(`engagements/${engagementId}/docs/${documentId}`), { recursive: true, force: true });
}

export async function deleteAllUploadedDocuments(engagementId: string) {
  if (usesBlob()) {
    const listed = await list({ prefix: `engagements/${engagementId}/docs/` });
    const urls = listed.blobs.map((blob) => blob.url);
    if (urls.length > 0) await del(urls);
    return;
  }
  await rm(localPath(`engagements/${engagementId}/docs`), { recursive: true, force: true });
}
