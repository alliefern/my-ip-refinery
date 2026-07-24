# Error code reference

User-facing errors show the message; technical detail goes to protected
logs only. Every failure has a status, an explanation and a safe next
action — never a permanent spinner.

## Upload / validation

| Code | Meaning | User action |
|------|---------|-------------|
| `UNSUPPORTED_TYPE` | File type not in the supported media/document list | Re-export as MP4/MOV/M4V/WebM/MP3/M4A/WAV (or PDF/DOCX/PPTX/TXT/MD) |
| `FILE_TOO_LARGE` | Exceeds `MAX_FILE_BYTES` | Compress or trim the recording |
| `PROJECT_FILE_LIMIT` | Project already has `MAX_FILES_PER_PROJECT` trainings | Remove a training or start a second project |
| `DURATION_LIMIT` | Total media exceeds `MAX_TOTAL_DURATION_MINUTES` | Remove or shorten trainings |
| `UPLOAD_INTERRUPTED` | Resumable upload did not complete | Retry the upload (resumes from last byte) |
| `DUPLICATE_UPLOAD` | Same content hash already in project | No action; existing asset reused |

## Media processing (worker)

| Code | Meaning | User action |
|------|---------|-------------|
| `AUDIO_EXTRACT_FAILED` | FFmpeg could not read the file | Re-export the recording; file may be corrupt |
| `MEDIA_SILENT` | No usable audio track detected | Check the recording has audio |
| `CHUNK_TRANSCRIBE_FAILED` | One chunk failed after retries | Retry stage (only failed chunks re-run) |

## Document processing (worker)

| Code | Meaning | User action |
|------|---------|-------------|
| `DOC_NO_TEXT` | Document has no extractable text (scanned images, image-only slides) | Re-export with selectable text, or upload the original/a recording instead |
| `DOC_PASSWORD_PROTECTED` | PDF is encrypted | Remove the password (print to a new PDF) and re-upload |
| `DOC_UNREADABLE` | File is corrupt or an unsupported legacy format (.doc/.ppt) | Re-save as .docx/.pptx/.pdf and re-upload |

## AI stages

| Code | Meaning | User action |
|------|---------|-------------|
| `MODEL_TIMEOUT` | Model call exceeded time budget after retries | Retry stage |
| `MODEL_RATE_LIMITED` | Provider rate limit persisted | Wait, then retry stage |
| `INVALID_MODEL_OUTPUT` | Structured output failed schema validation after re-ask | Retry stage; persistent failures are logged for prompt revision |
| `INSUFFICIENT_SOURCE` | Library cannot support the requested transformation | Choose another course direction or add trainings |

## Project / general

| Code | Meaning | User action |
|------|---------|-------------|
| `VERSION_CONFLICT` | Lesson changed since editor opened | Copy changes, reload, re-apply |
| `EXPORT_NOT_READY` | Export requested before lessons complete | Finish lesson review first |
| `PROJECT_DELETED` | Jobs found their project deleted mid-run | None; jobs cancel cleanly |
