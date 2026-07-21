import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../status";
import { PROJECT_STATUSES } from "../types";

describe("project status transitions", () => {
  it("allows the happy path in order", () => {
    const path = [
      "DRAFT",
      "UPLOADING",
      "QUEUED",
      "TRANSCRIBING",
      "EXTRACTING_IP",
      "BUILDING_IP_MAP",
      "AWAITING_GAP_ANSWERS",
      "AWAITING_COURSE_SELECTION",
      "AWAITING_BLUEPRINT_APPROVAL",
      "GENERATING_LESSONS",
      "READY_FOR_REVIEW",
      "EXPORTING",
      "COMPLETE",
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows skipping gap answers when there are no gaps", () => {
    expect(canTransition("BUILDING_IP_MAP", "AWAITING_COURSE_SELECTION")).toBe(
      true,
    );
  });

  it("rejects skipping approval stages", () => {
    expect(canTransition("BUILDING_IP_MAP", "GENERATING_LESSONS")).toBe(false);
    expect(canTransition("TRANSCRIBING", "GENERATING_LESSONS")).toBe(false);
    expect(canTransition("DRAFT", "COMPLETE")).toBe(false);
  });

  it("reaches FAILED from active processing states only", () => {
    expect(canTransition("TRANSCRIBING", "FAILED")).toBe(true);
    expect(canTransition("GENERATING_LESSONS", "FAILED")).toBe(true);
    expect(canTransition("DRAFT", "FAILED")).toBe(false);
    expect(canTransition("COMPLETE", "FAILED")).toBe(false);
  });

  it("retries from FAILED back into processing states", () => {
    expect(canTransition("FAILED", "TRANSCRIBING")).toBe(true);
    expect(canTransition("FAILED", "GENERATING_LESSONS")).toBe(true);
    expect(canTransition("FAILED", "COMPLETE")).toBe(false);
  });

  it("throws a descriptive error on illegal transitions", () => {
    expect(() => assertTransition("DRAFT", "COMPLETE")).toThrow(
      /DRAFT → COMPLETE/,
    );
  });

  it("has a transition entry for every status", () => {
    for (const status of PROJECT_STATUSES) {
      // canTransition must not throw for any pair
      expect(() => canTransition(status, "FAILED")).not.toThrow();
    }
  });
});
