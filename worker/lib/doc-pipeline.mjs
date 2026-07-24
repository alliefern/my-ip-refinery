/**
 * extract_document_text job: the written-content twin of
 * transcribe_asset. Download the document from private storage, pull
 * its text, chunk it into transcript_chunks (no timestamps, a location
 * label instead), then chain into the same extract_ip stage media uses.
 */

import {
  DocExtractError,
  chunkDocumentText,
  extractDocumentText,
} from "./doc-extract.mjs";

class PipelineError extends Error {
  constructor(message, errorCode, userMessage, retryable = true) {
    super(message);
    this.errorCode = errorCode;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

export async function runExtractDocumentText(db, job) {
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
      "Original document deleted",
      "DOC_UNREADABLE",
      "The original file was deleted before it could be processed.",
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

  await db.updateAsset(asset.id, { status: "TRANSCRIBING" });
  await db.updateProjectStatusIf(asset.project_id, ["QUEUED"], "TRANSCRIBING");

  const url = await db.signedDownloadUrl(asset.storage_path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new PipelineError(
      `Storage download failed (${response.status})`,
      "DOC_UNREADABLE",
      "Could not read the uploaded file from storage — retry when ready.",
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await db.setProgress(job.id, 25);

  let extracted;
  try {
    extracted = await extractDocumentText(
      buffer,
      asset.mime_type,
      asset.original_filename,
    );
  } catch (err) {
    if (err instanceof DocExtractError) {
      throw new PipelineError(err.message, err.errorCode, err.userMessage, err.retryable);
    }
    throw err;
  }
  await db.setProgress(job.id, 60);

  const chunks = chunkDocumentText(extracted.text);
  if (chunks.length === 0) {
    throw new PipelineError(
      "No chunks produced from document",
      "DOC_NO_TEXT",
      "This document contains no readable content.",
      false,
    );
  }
  for (const chunk of chunks) {
    await db.upsertChunk(asset.id, {
      sequenceNumber: chunk.sequenceNumber,
      startSeconds: null,
      endSeconds: null,
      locationLabel: chunk.locationLabel,
      rawText: chunk.text,
      cleanText: chunk.text,
      metadata: {
        source: "document",
        mime_type: asset.mime_type,
        page_count: extracted.pageCount,
      },
    });
  }
  await db.setProgress(job.id, 90);

  await db.updateAsset(asset.id, { status: "TRANSCRIBED", error_message: null });

  // Same chain as media: mine this asset's chunks for IP.
  await db.enqueueJob(
    asset.project_id,
    asset.id,
    "extract_ip",
    `extract:${asset.id}`,
  );
}
