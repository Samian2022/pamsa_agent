import { randomUUID } from "crypto";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { del, get, list, put } from "@vercel/blob";
import { emptyMethodology, emptySignOff, OPENING_MESSAGE } from "./stages";
import { deleteAllUploadedDocuments } from "./documents";
import type { Engagement, SessionUser } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data", "engagements");

function usesBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function blobPath(id: string) {
  return `engagements/${id}.json`;
}

const locks = new Map<string, Promise<void>>();

async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(
    id,
    previous.then(() => gate),
  );
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function createEngagement(user: SessionUser, title = "New engagement"): Engagement {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title,
    createdBy: user,
    createdAt: now,
    updatedAt: now,
    stage: 1,
    artifacts: {},
    assumptions: [],
    citations: [],
    signOff: emptySignOff(),
    discoveryLog: [],
    probeLog: [],
    dataGapLog: [],
    assumptionCheckpoints: [],
    methodology: emptyMethodology(),
    documents: [],
    messages: [
      {
        id: randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: OPENING_MESSAGE }],
      },
    ],
  };
}

function normalizeEngagement(engagement: Engagement): Engagement {
  return {
    ...engagement,
    discoveryLog: engagement.discoveryLog || [],
    probeLog: engagement.probeLog || [],
    dataGapLog: engagement.dataGapLog || [],
    assumptionCheckpoints: engagement.assumptionCheckpoints || [],
    methodology: engagement.methodology || emptyMethodology(),
    documents: engagement.documents || [],
    artifacts: {
      ...engagement.artifacts,
      pricingScope: engagement.artifacts.pricingScope
        ? {
            ...engagement.artifacts.pricingScope,
            modelTypes: engagement.artifacts.pricingScope.modelTypes || [],
            buildMode: engagement.artifacts.pricingScope.buildMode || "unset",
          }
        : engagement.artifacts.pricingScope,
      financialModels: (engagement.artifacts.financialModels || []).map((model) => ({
        ...model,
        modelType: model.modelType || "hybrid",
      })),
    },
  };
}

async function ensureLocalDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readLocal(id: string): Promise<Engagement | null> {
  try {
    const raw = await readFile(path.join(DATA_DIR, `${id}.json`), "utf8");
    return normalizeEngagement(JSON.parse(raw) as Engagement);
  } catch {
    return null;
  }
}

async function writeLocal(engagement: Engagement) {
  await ensureLocalDir();
  await writeFile(
    path.join(DATA_DIR, `${engagement.id}.json`),
    JSON.stringify(engagement, null, 2),
    "utf8",
  );
}

async function readBlob(id: string): Promise<Engagement | null> {
  const result = await get(blobPath(id), {
    access: "private",
    useCache: false,
  }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as Engagement;
}

async function writeBlob(engagement: Engagement) {
  await put(blobPath(engagement.id), JSON.stringify(engagement), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getEngagement(id: string): Promise<Engagement | null> {
  const engagement = usesBlob() ? await readBlob(id) : await readLocal(id);
  return engagement ? normalizeEngagement(engagement) : null;
}

export async function saveEngagement(engagement: Engagement) {
  engagement.updatedAt = new Date().toISOString();
  if (usesBlob()) {
    await writeBlob(engagement);
  } else {
    await writeLocal(engagement);
  }
}

export async function updateEngagement(
  id: string,
  mutator: (current: Engagement) => Engagement,
): Promise<Engagement> {
  return withLock(id, async () => {
    const current = await getEngagement(id);
    if (!current) {
      throw new Error("Engagement not found");
    }
    const next = mutator(current);
    next.id = id;
    await saveEngagement(next);
    return next;
  });
}

export async function listEngagements(): Promise<Engagement[]> {
  if (usesBlob()) {
    const listed = await list({ prefix: "engagements/" });
    const rows = await Promise.all(
      listed.blobs
        .filter((blob) => blob.pathname.endsWith(".json"))
        .map(async (blob) => {
          const result = await get(blob.pathname, {
            access: "private",
            useCache: false,
          }).catch(() => null);
          if (!result || result.statusCode !== 200 || !result.stream) return null;
          const text = await new Response(result.stream).text();
          return normalizeEngagement(JSON.parse(text) as Engagement);
        }),
    );
    return rows
      .filter((row): row is Engagement => Boolean(row))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  await ensureLocalDir();
  const files = await readdir(DATA_DIR);
  const rows = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readLocal(file.replace(/\.json$/, ""))),
  );
  return rows
    .filter((row): row is Engagement => Boolean(row))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteEngagement(id: string) {
  await deleteAllUploadedDocuments(id);
  if (usesBlob()) {
    const listed = await list({ prefix: blobPath(id) });
    const urls = listed.blobs
      .filter((blob) => blob.pathname === blobPath(id))
      .map((blob) => blob.url);
    if (urls.length > 0) {
      await del(urls);
    }
    return;
  }
  const { unlink } = await import("fs/promises");
  await unlink(path.join(DATA_DIR, `${id}.json`)).catch(() => undefined);
}

export function summarizeEngagement(engagement: Engagement) {
  return {
    id: engagement.id,
    title: engagement.title,
    stage: engagement.stage,
    selectedCompany: engagement.artifacts.selectedCompany || null,
    createdBy: engagement.createdBy,
    createdAt: engagement.createdAt,
    updatedAt: engagement.updatedAt,
  };
}
