import fs from 'fs';
import path from 'path';
import { YoutubeTranscript } from 'youtube-transcript';

const VIDEOS_FILE = 'data/videos.txt';
const TRANSCRIPTS_DIR = 'data/transcripts';
const REPORT_FILE = 'data/transcripts_report.json';

if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

async function fetchWithRetry(videoId, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      return transcript;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
}

async function main() {
  if (!fs.existsSync(VIDEOS_FILE)) {
    console.error(`Videos file not found: ${VIDEOS_FILE}`);
    return;
  }

  const urls = fs.readFileSync(VIDEOS_FILE, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  console.log(`Processing ${urls.length} video links...`);

  const results = {
    successful: [],
    fallbackUsed: [],
    failed: []
  };

  for (const url of urls) {
    const videoId = extractVideoId(url);
    if (!videoId) {
      // Could be channel or playlist
      results.failed.push({ url, videoId: null, reason: 'Channel or playlist URL, not a single video ID' });
      continue;
    }

    const outputFile = path.join(TRANSCRIPTS_DIR, `${videoId}.json`);
    const fallbackTxt = path.join(TRANSCRIPTS_DIR, `${videoId}.txt`);

    // Check if already fetched
    if (fs.existsSync(outputFile)) {
      console.log(`[CACHED] ${videoId}`);
      results.successful.push({ url, videoId, path: outputFile });
      continue;
    }

    // Check manual fallback text
    if (fs.existsSync(fallbackTxt)) {
      console.log(`[FALLBACK FOUND] ${videoId}`);
      const rawText = fs.readFileSync(fallbackTxt, 'utf-8');
      const mockItems = [{ text: rawText, offset: 0, duration: 60 }];
      fs.writeFileSync(outputFile, JSON.stringify(mockItems, null, 2));
      results.fallbackUsed.push({ url, videoId, path: outputFile });
      continue;
    }

    try {
      console.log(`Fetching transcript for ${videoId} (${url})...`);
      const transcript = await fetchWithRetry(videoId);
      fs.writeFileSync(outputFile, JSON.stringify(transcript, null, 2));
      console.log(`✓ Fetched ${videoId} (${transcript.length} segments)`);
      results.successful.push({ url, videoId, segmentCount: transcript.length });
    } catch (err) {
      console.warn(`✗ Failed ${videoId}: ${err.message}`);
      results.failed.push({ url, videoId, reason: err.message });
    }
  }

  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nTranscript processing complete:`);
  console.log(`- Success: ${results.successful.length}`);
  console.log(`- Fallbacks used: ${results.fallbackUsed.length}`);
  console.log(`- Failed / no captions: ${results.failed.length}`);
  console.log(`Report written to ${REPORT_FILE}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
