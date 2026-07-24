import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { runExtractDocumentText } from "../lib/doc-pipeline.mjs";

function makeDb(asset, fileUrl) {
  const calls = { chunks: [], assetUpdates: [], jobs: [], progress: [] };
  return {
    calls,
    async getAsset() {
      return asset;
    },
    async getProjectOwner() {
      return { user_id: "user-1", deleted_at: null, intake_json: {} };
    },
    async updateAsset(_id, fields) {
      calls.assetUpdates.push(fields);
    },
    async updateProjectStatusIf() {},
    async setProgress(_jobId, pct) {
      calls.progress.push(pct);
    },
    async signedDownloadUrl() {
      return fileUrl;
    },
    async upsertChunk(_assetId, chunk) {
      calls.chunks.push(chunk);
    },
    async enqueueJob(projectId, assetId, jobType, key) {
      calls.jobs.push({ projectId, assetId, jobType, key });
    },
  };
}

function serve(body, contentType) {
  return new Promise((resolve) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": contentType });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}/file`, close: () => server.close() });
    });
  });
}

test("extract_document_text: text file flows end to end into chunks + extract_ip job", async () => {
  const body = "The Founding Five method: sell five founding spots before building anything. ".repeat(
    20,
  );
  const { url, close } = await serve(body, "text/plain");
  try {
    const asset = {
      id: "asset-1",
      project_id: "project-1",
      kind: "note",
      mime_type: "text/plain",
      original_filename: "guide.txt",
      storage_path: "u/p/a/guide.txt",
      original_deleted_at: null,
      display_title: "Guide",
    };
    const db = makeDb(asset, url);
    await runExtractDocumentText(db, { id: "job-1", source_asset_id: "asset-1" });

    assert.ok(db.calls.chunks.length >= 1);
    assert.equal(db.calls.chunks[0].startSeconds, null);
    assert.ok(db.calls.chunks[0].locationLabel);
    assert.ok(db.calls.chunks[0].cleanText.includes("Founding Five"));
    assert.deepEqual(db.calls.jobs, [
      {
        projectId: "project-1",
        assetId: "asset-1",
        jobType: "extract_ip",
        key: "extract:asset-1",
      },
    ]);
    const finalUpdate = db.calls.assetUpdates.at(-1);
    assert.equal(finalUpdate.status, "TRANSCRIBED");
  } finally {
    close();
  }
});

test("extract_document_text: scanned-style empty PDF fails with DOC_NO_TEXT and no chunks", async () => {
  const { url, close } = await serve("tiny", "text/plain");
  try {
    const asset = {
      id: "asset-2",
      project_id: "project-1",
      kind: "workbook",
      mime_type: "text/plain",
      original_filename: "empty.txt",
      storage_path: "u/p/a/empty.txt",
      original_deleted_at: null,
      display_title: "Empty",
    };
    const db = makeDb(asset, url);
    await assert.rejects(
      () => runExtractDocumentText(db, { id: "job-2", source_asset_id: "asset-2" }),
      (err) => err.errorCode === "DOC_NO_TEXT" && err.retryable === false,
    );
    assert.equal(db.calls.chunks.length, 0);
    assert.equal(db.calls.jobs.length, 0);
  } finally {
    close();
  }
});
