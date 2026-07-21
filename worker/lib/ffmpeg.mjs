import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

/** Duration in seconds, and whether an audio stream exists. */
export async function probeMedia(inputPath) {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-select_streams", "a",
    "-show_entries", "stream=codec_type",
    "-of", "json",
    inputPath,
  ]);
  const parsed = JSON.parse(stdout);
  const duration = Number(parsed.format?.duration ?? 0);
  const hasAudio = (parsed.streams ?? []).some((s) => s.codec_type === "audio");
  return { durationSeconds: duration, hasAudio };
}

/** Extract mono 16 kHz MP3 sized for speech transcription. */
export async function extractAudio(inputPath, outputPath) {
  await run("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-b:a", "32k",
    outputPath,
  ]);
}

/** Cut one chunk out of the prepared audio (offsets in seconds). */
export async function sliceAudio(inputPath, outputPath, startSeconds, endSeconds) {
  await run("ffmpeg", [
    "-y",
    "-ss", String(startSeconds),
    "-i", inputPath,
    "-t", String(endSeconds - startSeconds),
    "-c", "copy",
    outputPath,
  ]);
}
