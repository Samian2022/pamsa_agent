"use client";

import { useRef, useState, type DragEvent } from "react";
import { formatFileSize } from "@/lib/format";
import { RelativeTime } from "@/components/relative-time";
import type { Engagement, UploadedDocument } from "@/lib/types";

const ACCEPT = ".pdf,.txt,.md,.csv,.json,.html,.htm,.xlsx";

export function documentReviewPrompt(names: string[]) {
  const files = names.join(", ");
  return `I uploaded ${files}. Filing text is already in context. Call save_discovery_cards now with 6 to 8 findings, never fewer than 6 distinct issues. Then a short numbered list (issue, one sentence, filename). Then STOP. Do not search, fetch URLs, or write a memo.`;
}

function statusLabel(doc: UploadedDocument) {
  if (doc.extractStatus === "ok") return `${doc.charCount.toLocaleString()} characters extracted`;
  if (doc.extractStatus === "empty") return "Stored, no extractable text";
  if (doc.extractStatus === "unsupported") return "Stored, text not extracted";
  return "Stored, extraction failed";
}

export function DocumentLibrary({
  engagement,
  onChange,
  onAskAgent,
}: {
  engagement: Engagement;
  onChange: (engagement: Engagement) => void;
  onAskAgent: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [error, setError] = useState("");

  const documents = engagement.documents || [];

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setError("");
    const uploaded: string[] = [];
    for (const file of list) {
      setBusyName(file.name);
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/engagements/${engagement.id}/documents`, {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { engagement?: Engagement; error?: string };
      if (!response.ok || !data.engagement) {
        setError(data.error || `Could not upload ${file.name}.`);
        break;
      }
      onChange(data.engagement);
      uploaded.push(file.name);
    }
    setBusyName(null);
    if (uploaded.length > 0) {
      onAskAgent(documentReviewPrompt(uploaded));
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    void uploadFiles(event.dataTransfer.files);
  }

  async function remove(doc: UploadedDocument) {
    setError("");
    setBusyName(doc.name);
    const response = await fetch(`/api/engagements/${engagement.id}/documents/${doc.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { engagement?: Engagement; error?: string };
    setBusyName(null);
    if (!response.ok || !data.engagement) {
      setError(data.error || `Could not remove ${doc.name}.`);
      return;
    }
    onChange(data.engagement);
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="section-kicker text-[16px] md:text-[20px]">Source documents</h2>
        <p className="mt-2 text-[13px] leading-6 text-ink-soft">
          Upload a filing, ESG report, or notes. The agent reads it, turns the important points into a few review
          cards, and waits. You decide what is material. PDF, TXT, MD, CSV, JSON, HTML, and XLSX, up to 4 MB each.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-6 text-ink-soft">
          <li>You upload. PAMSA extracts the text.</li>
          <li>The agent saves at least 6 findings as cards. You do not wait for a long memo.</li>
          <li>You press This is material, Not material, or Need more evidence on each card.</li>
          <li>Accepted items go into your Discovery log and become the DMA. Ask for another batch when you are ready.</li>
        </ol>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed px-4 py-8 text-center transition ${
          dragOver ? "border-sage bg-sage/5" : "border-[var(--line)] bg-white/80"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <p className="text-[14px] text-ink">Drop files here, or choose from your computer.</p>
        <button
          type="button"
          className="btn-primary mt-3 rounded-full px-4 py-2 text-sm"
          disabled={Boolean(busyName)}
          onClick={() => inputRef.current?.click()}
        >
          {busyName ? `Uploading ${busyName}...` : "Upload documents"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rust">{error}</p> : null}

      {documents.length === 0 ? (
        <p className="mt-6 text-[13px] text-ink-soft">No documents yet. Annual reports and ESG PDFs are the most useful start.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{doc.name}</p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    {formatFileSize(doc.size)} · {statusLabel(doc)} · uploaded <RelativeTime iso={doc.uploadedAt} />
                  </p>
                  {doc.notes ? <p className="mt-1 text-[12px] text-amber">{doc.notes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-[12px]"
                    href={`/api/engagements/${engagement.id}/documents/${doc.id}`}
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    className="rounded-full border border-sage/40 px-3 py-1 text-[12px] text-sage"
                    onClick={() => onAskAgent(documentReviewPrompt([doc.name]))}
                  >
                    Ask agent to review
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rust/30 px-3 py-1 text-[12px] text-rust"
                    disabled={busyName === doc.name}
                    onClick={() => void remove(doc)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ComposerAttach({
  engagementId,
  disabled,
  onUploaded,
}: {
  engagementId: string;
  disabled?: boolean;
  onUploaded: (engagement: Engagement, names: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || disabled) return;
    setBusy(true);
    const names: string[] = [];
    let latest: Engagement | null = null;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/engagements/${engagementId}/documents`, {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { engagement?: Engagement };
      if (response.ok && data.engagement) {
        latest = data.engagement;
        names.push(file.name);
      }
    }
    setBusy(false);
    if (latest && names.length) onUploaded(latest, names);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void uploadFiles(event.target.files)}
      />
      <button
        type="button"
        title="Upload documents"
        aria-label="Upload documents"
        disabled={disabled || busy}
        className="rounded-full border border-[var(--line)] px-3 py-2 text-[12px] disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading..." : "Attach"}
      </button>
    </>
  );
}
