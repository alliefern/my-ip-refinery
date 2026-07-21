# Background media-processing worker.
# FFmpeg + Node; polls processing_jobs and runs the pipeline stages.
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .

# The worker loop is implemented in Milestone 2.
CMD ["node", "index.mjs"]
