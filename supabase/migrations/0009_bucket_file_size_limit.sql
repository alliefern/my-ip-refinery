-- The sources bucket had no explicit file_size_limit, silently relying on
-- the project's platform-wide default rather than the 4 GB per-file limit
-- the app itself advertises (MAX_FILE_BYTES). Make the bucket match what
-- users are actually told.

update storage.buckets
set file_size_limit = 4294967296 -- 4 GB, matches MAX_FILE_BYTES default
where id = 'sources';
