import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import MiniSearch from 'minisearch';

const EXTRACTED_PAGES_FILE = 'data/extracted_pages.json';
const TRANSCRIPTS_DIR = 'data/transcripts';
const PUBLIC_RAG_DIR = 'public/rag-index';

if (!fs.existsSync(PUBLIC_RAG_DIR)) {
  fs.mkdirSync(PUBLIC_RAG_DIR, { recursive: true });
}

const VIDEO_META_MAP = {
  '8AWEPx5cHWQ': { title: 'Cursor Vibe Coding for Beginners (Tech With Tim)', chapter: 'Chapter 2: Vibe Coding', projectId: 'sunday-1' },
  'IMseojNtxkk': { title: 'Full Cursor + MCP Workflow (ByteGrad)', chapter: 'Chapter 2: Vibe Coding', projectId: null },
  '_v_fgW2SkkQ': { title: 'LangChain Basics (Greg Kamradt)', chapter: 'Chapter 5: LangChain', projectId: null },
  'DwATCOaB8XM': { title: 'LangChain Agents Tutorial (Greg Kamradt)', chapter: 'Volume 2: AI Agents', projectId: null },
  'sal78ACtGTc': { title: 'Building AI Agents (Fireship)', chapter: 'Volume 2: AI Agents', projectId: null },
  'lG7Uxts9SXs': { title: 'LangChain Full Tutorial / Crash Course (freeCodeCamp)', chapter: 'Chapter 5: LangChain', projectId: 'hw-5' },
  'BO7DVnN9ctk': { title: 'Running Llama on Raspberry Pi (Jeff Geerling)', chapter: 'Volume 2: SLMs for Edge', projectId: null },
  'qqqAePVAOKo': { title: 'n8n AI Automation Crash Course', chapter: 'Chapter 4: n8n Automation', projectId: 'hw-6' },
  'GqFAlmDt62Y': { title: 'n8n MQTT Tutorial', chapter: 'Chapter 4: n8n Automation', projectId: 'hw-6' },
  'BpJCAafw2qE': { title: 'Raspberry Pi Setup Guide (Jeff Geerling)', chapter: 'Chapter 7: Raspberry Pi Reference', projectId: 'hw-1' },
  'aimSGOAUI8Y': { title: 'TFLite on Raspberry Pi (The AI Guy)', chapter: 'Chapter 6: Edge AI & TFLite', projectId: 'hw-3' },
  'EIxdz-2rhLs': { title: "MQTT Tutorial (Steve's Internet Guide)", chapter: 'Chapter 8: MQTT Protocols', projectId: 'hw-2' },
  '3AR432bguOY': { title: 'Node-RED Dashboard (Steve Cope)', chapter: 'Chapter 7: Raspberry Pi Reference', projectId: 'hw-2' },
  'oXlwWbU8l2o': { title: 'OpenCV Python (Tech With Tim)', chapter: 'Chapter 7: Raspberry Pi Reference', projectId: 'hw-3' },
  'tK9Oc6AEnR4': { title: 'Linux Bash Scripting (NetworkChuck)', chapter: 'Appendix G: Linux CLI', projectId: null },
  '5OdVJbNCSso': { title: 'MySQL Full Course (Bro Code)', chapter: 'Tech Stack Reference', projectId: null },
  'ktjafK4SgWM': { title: 'MERN Stack (Traversy Media)', chapter: 'Tech Stack Reference', projectId: 'hw-9' },
  'Z_ikDlimN6A': { title: 'PyTorch Deep Learning (Daniel Bourke)', chapter: 'Appendix F: PyTorch Reference', projectId: null },
  '3c-iBn73dDE': { title: 'Docker for Beginners (TechWorld with Nana)', chapter: 'Appendix G: Docker', projectId: null },
  'DM65_JyGxCo': { title: 'Docker Compose Tutorial', chapter: 'Appendix G: Docker', projectId: null },
  'idQb2pB-h2Q': { title: 'ROS2 Beginners (Articulated Robotics)', chapter: 'Chapter 9: Autonomous Vehicles', projectId: null },
  'FHDxaFI_3_k': { title: 'Edge AI Theory (MIT HAN Lab)', chapter: 'Chapter 6: Edge AI', projectId: null },
  '_k4EBkFq8LA': { title: 'DHT22 + Raspberry Pi Setup', chapter: 'Project 1 Guide', projectId: 'hw-1' },
  'JRCJ6RtE3xU': { title: 'Python Email Sending Tutorial (Corey Schafer)', chapter: 'Project 1 Guide', projectId: 'hw-1' },
  'kuyCd53AOtg': { title: 'MQTT Python Tutorial (HiveMQ)', chapter: 'Project 2 Guide', projectId: 'hw-2' },
  'zQDzNNt6xd4': { title: 'Flask SocketIO Real-time (Pretty Printed)', chapter: 'Project 2 Guide', projectId: 'hw-2' },
  'HD9FnjVwU8g': { title: 'MobileNet Explained Simply', chapter: 'Project 3 Guide', projectId: 'hw-3' },
  'rExc-V_qHzI': { title: 'AI in IoT Systems (General)', chapter: 'Project 4 Guide', projectId: 'hw-4' },
  'oLNBBGlKYkE': { title: 'LangChain Agents with Memory', chapter: 'Project 5 Guide', projectId: 'hw-5' },
  'spUNpyF58BY': { title: 'Vibration Analysis with FFT', chapter: 'Project 7 Guide', projectId: 'hw-7' },
  'BjEgkfose7s': { title: 'ADXL345 Python Tutorial', chapter: 'Project 7 Guide', projectId: 'hw-7' },
  'iKlVpfFBBNQ': { title: 'Twilio WhatsApp Python Tutorial', chapter: 'Project 8 Guide', projectId: 'hw-8' },
  'zYmjJEqkCBQ': { title: 'Flask Webhooks Tutorial', chapter: 'Project 8 Guide', projectId: 'hw-8' },
  '0RS9W8MtZe4': { title: 'FastAPI Tutorial (TechWithTim)', chapter: 'Project 9 Guide', projectId: 'hw-9' },
  'PWG7NlUDVaA': { title: 'React + FastAPI Full Stack', chapter: 'Project 9 Guide', projectId: 'hw-9' },
  'ByGJQzlzxQg': { title: 'System Design for IoT (General)', chapter: 'Project 10 Guide', projectId: 'hw-10' },
  'rnkXxJQbORY': { title: 'Building Production IoT Systems', chapter: 'Project 10 Guide', projectId: 'hw-10' },
  'IXpyNkF3Xh8': { title: 'JLPT N4 Grammar (nihongonomori)', chapter: 'Section 5: Japanese N4', projectId: 'sunday-3' },
  'jlpt_n4_listening_practice': { title: 'JLPT N4 Listening Practice (Full Test)', chapter: 'Section 5: Japanese N4', projectId: 'sunday-3' }
};

// Map page numbers to chapters/projects
function getPageContext(page) {
  if (page >= 2 && page <= 4) return { chapter: 'Chapter 1: AI and the Future of Engineering', projectId: null };
  if (page >= 5 && page <= 8) return { chapter: 'Chapter 2: Vibe Coding and Cursor IDE', projectId: 'sunday-1' };
  if (page >= 9 && page <= 13) return { chapter: 'Chapter 3: Claude API and Prompt Engineering', projectId: 'sunday-1' };
  if (page >= 14 && page <= 16) return { chapter: 'Chapter 4: n8n AI Automation for AIoT Workflows', projectId: 'hw-6' };
  if (page >= 17 && page <= 19) return { chapter: 'Chapter 5: LangChain and AI Agents', projectId: 'hw-5' };
  if (page >= 20 && page <= 23) return { chapter: 'Chapter 6: Edge AI and TensorFlow Lite', projectId: 'hw-3' };
  if (page >= 24 && page <= 26) return { chapter: 'Chapter 7: Raspberry Pi and AIoT Full Stack Reference', projectId: 'hw-1' };
  if (page >= 27 && page <= 29) return { chapter: 'Chapter 8: MQTT and IoT Protocols', projectId: 'hw-2' };
  if (page >= 30 && page <= 32) return { chapter: 'Chapter 9: Autonomous Vehicles', projectId: null };
  if (page >= 33 && page <= 34) return { chapter: 'Chapter 10: Japan AIoT Industry', projectId: null };
  if (page >= 35 && page <= 37) return { chapter: 'Chapter 11: 12 Sunday AI Projects', projectId: 'sunday-all' };
  if (page >= 38 && page <= 41) return { chapter: 'Chapter 12: Glossary & Study Checklist', projectId: null };
  if (page >= 42 && page <= 44) return { chapter: 'Appendix A: DSA Cheat Sheet', projectId: 'sunday-4' };
  if (page >= 45 && page <= 47) return { chapter: 'Appendix B: Python Quick Reference for AIoT', projectId: null };
  if (page >= 48 && page <= 50) return { chapter: 'Appendix C: Japanese Technical Vocabulary', projectId: 'sunday-3' };
  if (page >= 51 && page <= 53) return { chapter: 'Appendix D: Interview Preparation Guide', projectId: null };
  if (page >= 54 && page <= 55) return { chapter: 'Appendix E: Study Tracker and Progress Log', projectId: null };
  if (page >= 56 && page <= 61) return { chapter: 'Appendix F: Complete PyTorch Reference', projectId: null };
  if (page >= 62 && page <= 66) return { chapter: 'Appendix G: Linux Command Line Reference', projectId: null };
  if (page >= 67 && page <= 69) return { chapter: 'Appendix H: GitHub Profile & Portfolio Mastery', projectId: null };
  if (page >= 70 && page <= 72) return { chapter: 'Appendix I: Five Complete AIoT Architectures', projectId: 'arch-all' };
  if (page >= 73 && page <= 78) return { chapter: 'Appendix J: Production Code Library', projectId: 'hw-10' };
  if (page >= 79 && page <= 81) return { chapter: 'Appendix K: JLPT N4 Grammar Reference', projectId: 'sunday-3' };
  if (page >= 82 && page <= 83) return { chapter: 'Appendix L: Google Summer of Code (GSoC) Strategy', projectId: null };
  if (page >= 84 && page <= 86) return { chapter: 'Appendix M: Vizag Startup Planning Guide', projectId: null };
  
  // Volume 2
  if (page >= 88 && page <= 95) return { chapter: 'Volume 2 Section 1: Future AI & Demand Roadmap', projectId: null };
  if (page >= 96 && page <= 103) return { chapter: 'Volume 2 Section 2: AI Tools Guide', projectId: null };
  
  // Section 2: 10 Projects
  if (page >= 104 && page <= 106) return { chapter: 'Project 1: Smart Temperature Monitor', projectId: 'hw-1' };
  if (page >= 107 && page <= 109) return { chapter: 'Project 2: MQTT Sensor Dashboard', projectId: 'hw-2' };
  if (page >= 110 && page <= 113) return { chapter: 'Project 3: Edge AI Image Classifier', projectId: 'hw-3' };
  if (page >= 114 && page <= 117) return { chapter: 'Project 4: AI Anomaly Detector', projectId: 'hw-4' };
  if (page >= 118 && page <= 121) return { chapter: 'Project 5: LangChain IoT Assistant', projectId: 'hw-5' };
  if (page >= 122 && page <= 123) return { chapter: 'Project 6: n8n Factory Alert Automation', projectId: 'hw-6' };
  if (page >= 124 && page <= 126) return { chapter: 'Project 7: Predictive Maintenance System', projectId: 'hw-7' };
  if (page >= 127 && page <= 129) return { chapter: 'Project 8: WhatsApp IoT Control Bot', projectId: 'hw-8' };
  if (page >= 130 && page <= 132) return { chapter: 'Project 9: Full Stack AIoT Web Application', projectId: 'hw-9' };
  if (page >= 133 && page <= 135) return { chapter: 'Project 10: AI-Native Autonomous System', projectId: 'hw-10' };

  if (page >= 136 && page <= 144) return { chapter: 'Volume 2 Section 3: Technical English & Documentation', projectId: null };
  if (page >= 145 && page <= 151) return { chapter: 'Volume 2 Section 4: Edge AI & Embedded Systems Explained', projectId: null };
  if (page >= 152 && page <= 157) return { chapter: 'Volume 2 Section 5: Japanese N4 Practice Guide', projectId: 'sunday-3' };
  if (page >= 158 && page <= 163) return { chapter: 'Volume 2 Section 6: Career Mastery & Study Habits', projectId: null };

  return { chapter: 'AIoT Master Guide', projectId: null };
}

// Semantic text chunker (~450 tokens ~1800 chars, overlap ~60 tokens ~240 chars)
export function chunkText(text, maxChars = 1600, overlapChars = 240) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // overlap
      const overlap = currentChunk.length > overlapChars ? currentChunk.slice(-overlapChars) : currentChunk;
      currentChunk = overlap.trim() + '\n\n' + para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Video transcript chunker (~60s windows, adaptive for long videos)
export function chunkTranscript(segments, windowSeconds = 60, maxChunksPerVideo = 16) {
  if (!segments || segments.length === 0) return [];

  // Calculate total duration
  const lastSeg = segments[segments.length - 1];
  const totalDuration = (lastSeg.offset || lastSeg.start || 0) + (lastSeg.duration || 0);

  // If video is very long (e.g. 5-20 hours course), space windows across chapters/sections
  const stepInterval = Math.max(windowSeconds, Math.floor(totalDuration / maxChunksPerVideo));

  const chunks = [];
  let currentText = [];
  let currentWindowIndex = 0;
  let targetNextOffset = 0;
  let windowStart = null;

  for (const seg of segments) {
    const offset = seg.offset || seg.start || 0;
    const text = seg.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
    if (!text) continue;

    if (offset >= targetNextOffset) {
      if (windowStart === null) {
        windowStart = offset;
      }
      currentText.push(text);

      // Collect 60s of text from this interval
      if (offset - windowStart >= 60 || currentText.join(' ').length >= 600) {
        chunks.push({
          start: Math.floor(windowStart),
          end: Math.floor(offset + (seg.duration || 5)),
          text: currentText.join(' ')
        });
        currentText = [];
        windowStart = null;
        currentWindowIndex++;
        targetNextOffset = currentWindowIndex * stepInterval;
        if (chunks.length >= maxChunksPerVideo) break;
      }
    }
  }

  if (currentText.length > 0 && windowStart !== null && chunks.length < maxChunksPerVideo) {
    chunks.push({
      start: Math.floor(windowStart),
      end: Math.floor(windowStart + 60),
      text: currentText.join(' ')
    });
  }

  return chunks;
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function runIngestion() {
  console.log("=== AIoT Master Guide Ingestion Engine ===");

  const allChunks = [];
  let chunkId = 1;

  // 1. Process Extracted Pages
  if (fs.existsSync(EXTRACTED_PAGES_FILE)) {
    console.log(`Loading PDF pages from ${EXTRACTED_PAGES_FILE}...`);
    const pages = JSON.parse(fs.readFileSync(EXTRACTED_PAGES_FILE, 'utf-8'));

    // Group pages by 1-2 pages or section to chunk naturally
    for (const pageObj of pages) {
      const pageText = pageObj.text.trim();
      if (!pageText || pageText.length < 50) continue;

      const pageNum = pageObj.page;
      const ctx = getPageContext(pageNum);
      const textChunks = chunkText(pageText, 1600, 240);

      for (const tc of textChunks) {
        allChunks.push({
          id: `chunk-pdf-${chunkId++}`,
          source: 'AIoT_Master_Guide_FINAL_v2.pdf',
          type: 'pdf',
          page: pageNum,
          chapter: ctx.chapter,
          projectId: ctx.projectId,
          title: `${ctx.chapter} (Page ${pageNum})`,
          text: tc
        });
      }
    }
    console.log(`Generated ${allChunks.length} chunks from PDF pages.`);
  }

  // 2. Process Video Transcripts
  if (fs.existsSync(TRANSCRIPTS_DIR)) {
    const transcriptFiles = fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Processing ${transcriptFiles.length} YouTube transcripts from ${TRANSCRIPTS_DIR}...`);

    for (const file of transcriptFiles) {
      const videoId = path.basename(file, '.json');
      const meta = VIDEO_META_MAP[videoId] || {
        title: `YouTube Video ${videoId}`,
        chapter: 'Video Resources',
        projectId: null
      };

      try {
        const segments = JSON.parse(fs.readFileSync(path.join(TRANSCRIPTS_DIR, file), 'utf-8'));
        const vChunks = chunkTranscript(segments, 60);

        for (const vc of vChunks) {
          const tsStr = formatTimestamp(vc.start);
          allChunks.push({
            id: `chunk-vid-${chunkId++}`,
            source: `https://www.youtube.com/watch?v=${videoId}`,
            type: 'video',
            videoId,
            timestamp: vc.start,
            timeFormatted: tsStr,
            chapter: meta.chapter,
            projectId: meta.projectId,
            title: `${meta.title} [${tsStr}]`,
            text: vc.text
          });
        }
      } catch (e) {
        console.warn(`Error reading transcript ${file}: ${e.message}`);
      }
    }
  }

  console.log(`Total chunks across PDF & Videos: ${allChunks.length}`);

  // 3. Build Inverted MiniSearch Index
  console.log("Building MiniSearch keyword index...");
  const miniSearch = new MiniSearch({
    fields: ['title', 'chapter', 'text'],
    storeFields: ['id', 'title', 'type', 'chapter', 'projectId', 'page', 'videoId', 'timestamp', 'timeFormatted']
  });

  miniSearch.addAll(allChunks);
  const miniSearchJson = JSON.stringify(miniSearch.toJSON());
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'minisearch-index.json'), miniSearchJson);
  console.log(`✓ Saved minisearch-index.json (${(miniSearchJson.length / 1024).toFixed(1)} KB)`);

  // 4. Generate Embeddings using all-MiniLM-L6-v2
  console.log("Loading all-MiniLM-L6-v2 model via Transformers.js...");
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

  console.log(`Generating 384-d dense embeddings for ${allChunks.length} chunks...`);
  const embeddingDim = 384;
  const embeddingsBuffer = new Float32Array(allChunks.length * embeddingDim);

  const batchSize = 16;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const textToEmbed = `${chunk.title}: ${chunk.text.slice(0, 500)}`;
      const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
      const vector = output.data;
      embeddingsBuffer.set(vector, (i + j) * embeddingDim);
    }
    if ((i + batchSize) % 64 === 0 || i + batchSize >= allChunks.length) {
      console.log(`Embedded ${Math.min(i + batchSize, allChunks.length)} / ${allChunks.length} chunks...`);
    }
  }

  // Save compact binary embeddings buffer
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'embeddings.bin'), Buffer.from(embeddingsBuffer.buffer));
  console.log(`✓ Saved embeddings.bin (${(embeddingsBuffer.byteLength / 1024).toFixed(1)} KB)`);

  // Save chunks metadata and text
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'chunks.json'), JSON.stringify(allChunks, null, 2));
  console.log(`✓ Saved chunks.json (${allChunks.length} items)`);

  console.log("\nIngestion pipeline successfully completed!");
}

// Allow direct run
if (process.argv[1] && path.basename(process.argv[1]) === 'ingest.mjs') {
  runIngestion().catch(err => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
}
