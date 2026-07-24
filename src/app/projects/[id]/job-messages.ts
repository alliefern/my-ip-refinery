/**
 * build_ip_map fails for genuinely different reasons — rate limits and
 * timeouts included — but by far the most common one is a library too
 * thin for the AI to find a confident course direction in. Only that
 * case gets the friendly "not enough footage" framing; anything else
 * shows the real error so it doesn't get misdiagnosed.
 */
const THIN_MATERIAL_CODES = new Set(["INVALID_MODEL_OUTPUT", "INSUFFICIENT_SOURCE"]);

export function thinMaterialMessage(job: {
  errorCode: string | null;
  errorMessage: string | null;
}): { headline: string; detail: string | null } {
  if (job.errorCode && THIN_MATERIAL_CODES.has(job.errorCode)) {
    return {
      headline:
        "Not enough footage. Please try again with more material for the Refinery to pull from.",
      detail: job.errorMessage,
    };
  }
  return {
    headline:
      job.errorMessage ?? "Something went wrong building the course map — retry when ready.",
    detail: null,
  };
}
