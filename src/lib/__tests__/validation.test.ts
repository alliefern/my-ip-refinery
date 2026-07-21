import { describe, expect, it } from "vitest";
import {
  computeChunkBoundaries,
  formatTimestamp,
  safeFilename,
  validateMediaFile,
} from "../validation";

describe("validateMediaFile", () => {
  it("accepts a normal mp4", () => {
    expect(
      validateMediaFile({ mimeType: "video/mp4", sizeBytes: 1_000_000 }, 0),
    ).toBeNull();
  });

  it("rejects unsupported types", () => {
    const result = validateMediaFile(
      { mimeType: "video/x-msvideo", sizeBytes: 1000 },
      0,
    );
    expect(result?.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects oversized files", () => {
    const result = validateMediaFile(
      { mimeType: "video/mp4", sizeBytes: Number.MAX_SAFE_INTEGER },
      0,
    );
    expect(result?.code).toBe("FILE_TOO_LARGE");
  });

  it("enforces the per-project file limit", () => {
    const result = validateMediaFile(
      { mimeType: "video/mp4", sizeBytes: 1000 },
      10,
    );
    expect(result?.code).toBe("PROJECT_FILE_LIMIT");
  });
});

describe("safeFilename", () => {
  it("strips dangerous characters", () => {
    expect(safeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFilename("my file (final) v2!.mp4")).toBe("my-file-final-v2-.mp4");
  });

  it("never returns an empty name", () => {
    expect(safeFilename("///")).toBe("file");
  });
});

describe("computeChunkBoundaries", () => {
  it("returns nothing for empty media", () => {
    expect(computeChunkBoundaries(0)).toEqual([]);
  });

  it("keeps a single chunk for short media", () => {
    expect(computeChunkBoundaries(120)).toEqual([
      { startSeconds: 0, endSeconds: 120 },
    ]);
  });

  it("overlaps consecutive chunks and covers the full duration", () => {
    const chunks = computeChunkBoundaries(1500, 600, 5);
    expect(chunks[0]).toEqual({ startSeconds: 0, endSeconds: 600 });
    expect(chunks[1]!.startSeconds).toBe(595); // 5s overlap
    expect(chunks.at(-1)!.endSeconds).toBe(1500);
    // No gaps: every chunk starts before the previous one ends.
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]!.startSeconds).toBeLessThan(chunks[i - 1]!.endSeconds);
    }
  });

  it("rejects nonsensical parameters", () => {
    expect(() => computeChunkBoundaries(100, 5, 10)).toThrow();
  });
});

describe("formatTimestamp", () => {
  it("formats minutes and seconds", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(75)).toBe("1:15");
  });

  it("formats hours with padded minutes", () => {
    expect(formatTimestamp(3661)).toBe("1:01:01");
  });
});
