"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeUploadAction,
  failUploadAction,
  prepareUploadAction,
} from "./actions";

/** Large training videos compete for the same bandwidth — upload a few
 * at a time rather than firing every file at once, so one connection
 * hiccup can't stall the whole batch simultaneously. */
const MAX_CONCURRENT_UPLOADS = 2;

interface UploadState {
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  message?: string;
}

/** Direct browser → private storage upload with real progress. */
export function UploadPanel({ projectId }: { projectId: string }) {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCountRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const warnOnUnload = (e: BeforeUnloadEvent) => {
      if (activeCountRef.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnOnUnload);
    return () => window.removeEventListener("beforeunload", warnOnUnload);
  }, []);

  const patch = (key: string, update: Partial<UploadState>) =>
    setUploads((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, ...update },
    }));

  async function uploadFile(file: File) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    setUploads((prev) => ({
      ...prev,
      [key]: { filename: file.name, progress: 0, status: "uploading" },
    }));
    activeCountRef.current += 1;

    try {
      const prepared = await prepareUploadAction({
        projectId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!prepared.ok) {
        patch(key, { status: "error", message: prepared.message });
        return;
      }

      try {
        await putWithProgress(prepared.signedUrl, file, (pct) =>
          patch(key, { progress: pct }),
        );
      } catch {
        patch(key, {
          status: "error",
          message: "Upload interrupted — try again.",
        });
        // Persist the failure so it doesn't sit at "uploading" forever in
        // the source library if this panel is closed right after.
        await failUploadAction({
          projectId,
          assetId: prepared.assetId,
          message:
            "Upload interrupted — the connection dropped or the browser tab was closed.",
        });
        return;
      }

      patch(key, { status: "processing", progress: 100 });
      const completed = await completeUploadAction({
        projectId,
        assetId: prepared.assetId,
      });
      if (!completed.ok) {
        patch(key, { status: "error", message: completed.message });
        return;
      }
      patch(key, { status: "done" });
      router.refresh();
    } finally {
      activeCountRef.current -= 1;
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const queue = Array.from(files);
    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) {
        const file = queue[cursor++]!;
        await uploadFile(file);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) }, worker),
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload trainings"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border border-dashed p-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line hover:border-ink-faint"
        }`}
      >
        <p className="font-medium">Drop trainings here, or click to browse</p>
        <p className="text-ink-faint mt-1 text-sm">
          MP4, MOV, M4V, WebM, MP3, M4A, WAV — plus PDF, DOCX, PPTX, TXT
          supporting files. Files go straight to your private storage.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="video/*,audio/*,.pdf,.docx,.pptx,.txt,.md"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {Object.entries(uploads).length > 0 && (
        <ul className="mt-4 space-y-2">
          {Object.entries(uploads).map(([key, up]) => (
            <li key={key} className="border-line rounded-md border bg-white p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{up.filename}</span>
                <span
                  className={
                    up.status === "error"
                      ? "text-danger"
                      : up.status === "done"
                        ? "text-ok"
                        : "text-ink-faint"
                  }
                >
                  {up.status === "uploading" && `${up.progress}%`}
                  {up.status === "processing" && "finalizing…"}
                  {up.status === "done" && "queued for transcription"}
                  {up.status === "error" && (up.message ?? "failed")}
                </span>
              </div>
              {up.status === "uploading" && (
                <div className="bg-line mt-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full rounded-full transition-[width]"
                    style={{ width: `${up.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed with status ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
