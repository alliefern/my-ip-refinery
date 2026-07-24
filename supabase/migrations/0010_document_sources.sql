-- Written-content support: documents (PDF/DOCX/PPTX/TXT) become first-class
-- source material. Their extracted text is chunked into transcript_chunks
-- exactly like audio transcripts, so every downstream stage (IP extraction,
-- cross-training map, retrieval, lesson generation) works unchanged.
-- Document chunks have no timestamps; they carry a human-readable
-- location_label ("Part 2 of 6", "Pages 4–7") instead.

alter table transcript_chunks
  alter column start_seconds drop not null,
  alter column end_seconds drop not null;

alter table transcript_chunks
  add column location_label text;
