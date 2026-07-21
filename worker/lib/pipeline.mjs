import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline as streamPipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { computeChunkBoundaries } from "./chunks.mjs";
import { extractAudio, probeMedia, sliceAudio } from "./ffmpeg.mjs";
import { normalizeTranscript } from "./stitch.mjs";
import {
  estimateTranscriptionCostCents,
  transcribeFile,
  TranscriptionError,
} from "./transcribe.mjs";

class PipelineError extends Error {
  constructor(message, errorCode, userMessage, retryable = true) {
    super(message);
    this.errorCode = errorCode;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

/**
 * transcribe_asset job: download → extract audio → chunk → transcribe
 * each chunk (skipping chunks already done, so retries are cheap) →
 * persist → record usage. Progress is written back for the UI.
 */
export async function runTranscribeAsset(db, job) {
  const asset = await db.getAsset(job.source_asset_id);
  if (!asset) {
    throw new PipelineError(
      "Asset row missing",
      "PROJECT_DELETED",
      "This file no longer exists.",
      false,
    );
  }
  if (asset.original_deleted_at || !asset.storage_path) {
    throw new PipelineError(
      "Original media deleted",
      "AUDIO_EXTRACT_FAILED",
      "The original file was deleted before transcription finished.",
      false,
    );
  }
  const project = await db.getProjectOwner(asset.project_id);
  if (!project || project.deleted_at) {
    throw new PipelineError(
      "Project deleted",
      "PROJECT_DELETED",
      "The project was deleted while this job was queued.",
      false,
    );
  }

  const workDir = await mkdtemp(join(tmpdir(), "refinery-"));
  try {
    // 1. Download the original from private storage.
    await db.updateAsset(asset.id, { status: "PREPARING_AUDIO" });
    await db.updateProjectStatusIf(asset.project_id, ["QUEUED"], "TRANSCRIBING");
    const sourcePath = join(workDir, "source-media");
    const url = await db.signedDownloadUrl(asset.storage_path);
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new PipelineError(
        `Storage download failed (${response.status})`,
        "AUDIO_EXTRACT_FAILED",
        "Could not read the uploaded file from storage — retry when ready.",
      );
    }
    await streamPipeline(Readable.fromWeb(response.body), createWriteStream(sourcePath));

    // 2. Probe + extract compressed mono audio.
    let probe;
    try {
      probe = await probeMedia(sourcePath);
    } catch (err) {
      throw new PipelineError(
        `ffprobe failed: ${err.message}`,
        "AUDIO_EXTRACT_FAILED",
        "This file could not be read as audio or video — it may be corrupt.",
        false,
      );
    }
    if (!probe.hasAudio || probe.durationSeconds <= 0) {
      throw new PipelineError(
        "No audio stream",
        "MEDIA_SILENT",
        "No usable audio track was found in this file.",
        false,
      );
    }
    await db.updateAsset(asset.id, { duration_seconds: probe.durationSeconds });

    const audioPath = join(workDir, "audio.mp3");
    try {
      await extractAudio(sourcePath, audioPath);
    } catch (err) {
      throw new PipelineError(
        `ffmpeg failed: ${err.message}`,
        "AUDIO_EXTRACT_FAILED",
        "Audio extraction failed — the file may be corrupt.",
      );
    }
    await db.setProgress(job.id, 15);

    // 3. Chunk + transcribe (idempotent per chunk).
    await db.updateAsset(asset.id, { status: "TRANSCRIBING" });
    const boundaries = computeChunkBoundaries(probe.durationSeconds);
    const model = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
    let transcribedSeconds = 0;

    for (let i = 0; i < boundaries.length; i++) {
      const bounds = boundaries[i];
      const sequenceNumber = i + 1;

      const existing = await db.getExistingChunk(asset.id, sequenceNumber);
      if (existing?.status === "DONE" && existing.clean_text) {
        continue; // already transcribed on a previous attempt
      }

      const chunkPath = join(workDir, `chunk-${sequenceNumber}.mp3`);
      await sliceAudio(audioPath, chunkPath, bounds.startSeconds, bounds.endSeconds);

      let result;
      try {
        result = await transcribeFile(chunkPath, {
          model,
          apiKey: process.env.OPENAI_API_KEY,
        });
      } catch (err) {
        if (err instanceof TranscriptionError) throw err;
        throw new PipelineError(
          `Chunk ${sequenceNumber} failed: ${err.message}`,
          "CHUNK_TRANSCRIBE_FAILED",
          "Transcription failed part-way — retry to continue from where it stopped.",
        );
      }

      await db.upsertChunk(asset.id, {
        sequenceNumber,
        startSeconds: bounds.startSeconds,
        endSeconds: bounds.endSeconds,
        rawText: result.text,
        cleanText: normalizeTranscript(result.text),
        metadata: { model },
      });
      transcribedSeconds += bounds.endSeconds - bounds.startSeconds;
      await db.setProgress(
        job.id,
        15 + Math.round(((i + 1) / boundaries.length) * 80),
      );
    }

    // 4. Usage + final status.
    if (transcribedSeconds > 0) {
      await db.recordUsage(asset.project_id, project.user_id, {
        operation: "transcription",
        model,
        audio_seconds: transcribedSeconds,
        estimated_cost_minor_units: estimateTranscriptionCostCents(
          model,
          transcribedSeconds,
        ),
      });
    }
    await db.updateAsset(asset.id, { status: "TRANSCRIBED", error_message: null });

    // Chain straight into IP extraction for this training.
    await db.enqueueJob(
      asset.project_id,
      asset.id,
      "extract_ip",
      `extract:${asset.id}`,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
