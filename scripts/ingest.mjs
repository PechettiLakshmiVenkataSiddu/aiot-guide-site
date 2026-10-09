import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from '@xenova/transformers';
import MiniSearch from 'minisearch';

const EXTRACTED_PAGES_FILE = 'data/extracted_pages.json';
const GUIDE_DATA_FILE = 'src/data/guideData.json';
const TRANSCRIPTS_DIR = 'data/transcripts';
const PUBLIC_RAG_DIR = 'public/rag-index';
const INGEST_CACHE_FILE = 'data/ingest_cache.json';
const INGEST_REPORT_FILE = 'data/ingest_report.json';

if (!fs.existsSync(PUBLIC_RAG_DIR)) {
  fs.mkdirSync(PUBLIC_RAG_DIR, { recursive: true });
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

// Clean ligatures, repeated headers/footers, and PDF control chars
function cleanPdfText(text) {
  if (!text) return '';
  return text
    .replace(/\x0c/g, '\n')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/’/g, "'")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, ' - ')
    .replace(/AIoT Master Guide\s*\|\s*Page \d+/gi, '')
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
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

// Structure-aware section splitter that preserves code blocks intact
function splitIntoParagraphsRespectingCode(text) {
  const lines = text.split('\n');
  const blocks = [];
  let currentBlock = [];
  let inCode = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      currentBlock.push(line);
      continue;
    }

    if (inCode) {
      currentBlock.push(line);
      continue;
    }

    if (line.trim() === '' && currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
      currentBlock = [];
    } else if (line.trim() !== '') {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }

  return blocks;
}

// Child chunker for parent text (~400 chars each for high precision search)
function createChildChunks(parentText, parentId, maxChars = 450) {
  const blocks = splitIntoParagraphsRespectingCode(parentText);
  const childChunks = [];
  let current = '';

  for (const block of blocks) {
    if (current.length + block.length > maxChars && current.length > 0) {
      childChunks.push(current.trim());
      current = block;
    } else {
      current = current ? current + '\n\n' + block : block;
    }
  }

  if (current.trim().length > 0) {
    childChunks.push(current.trim());
  }

  return childChunks.length > 0 ? childChunks : [parentText.slice(0, maxChars)];
}

// Video transcript chunker (~60s windows)
export function chunkTranscript(segments, windowSeconds = 60, maxChunksPerVideo = 16) {
  if (!segments || segments.length === 0) return [];

  const lastSeg = segments[segments.length - 1];
  const totalDuration = (lastSeg.offset || lastSeg.start || 0) + (lastSeg.duration || 0);
  const stepInterval = Math.max(windowSeconds, Math.floor(totalDuration / maxChunksPerVideo));

  const chunks = [];
  let currentText = [];
  let currentWindowIndex = 0;
  let targetNextOffset = 0;
  let windowStart = null;

  for (const seg of segments) {
    const offset = seg.offset || seg.start || 0;
    const text = seg.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').trim();
    if (!text) continue;

    if (offset >= targetNextOffset) {
      if (windowStart === null) {
        windowStart = offset;
      }
      currentText.push(text);

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
  console.log("=== Upgraded Structure-Aware Ingestion Pipeline ===");

  const allChunks = [];
  let chunkCount = 1;
  const sectionCounts = { hardware: 0, wiring: 0, steps: 0, code: 0, video: 0, general: 0 };

  // 1. Ingest Structured Hardware Projects from guideData.json
  if (fs.existsSync(GUIDE_DATA_FILE)) {
    console.log(`Loading structured projects from ${GUIDE_DATA_FILE}...`);
    const guideData = JSON.parse(fs.readFileSync(GUIDE_DATA_FILE, 'utf-8'));
    const hwProjects = guideData.hardwareProjects || [];

    for (const proj of hwProjects) {
      const pId = proj.id;
      const pTitle = proj.title;

      // 1a. Hardware / BOM section
      if (proj.hardware && proj.hardware.length > 0) {
        const parentId = `parent-${pId}-hardware`;
        const parentText = `Hardware Requirements for ${pTitle}:\n` + proj.hardware.map(h => `- ${h}`).join('\n') +
          (proj.software ? '\n\nSoftware Packages:\n' + proj.software.map(s => `- ${s}`).join('\n') : '');
        
        allChunks.push({
          id: `chunk-${chunkCount++}`,
          parentId,
          source: 'AIoT_Master_Guide_FINAL_v2.pdf',
          type: 'pdf',
          chapter: pTitle,
          projectId: pId,
          section: 'hardware',
          page: proj.startPage,
          title: `${pTitle} — Hardware & BOM`,
          text: parentText,
          parentText,
          contentHash: sha256(parentText)
        });
        sectionCounts.hardware++;
      }

      // 1b. Wiring & Pinout section
      if (proj.wiring) {
        const parentId = `parent-${pId}-wiring`;
        const parentText = `Wiring Connections and Pinouts for ${pTitle}:\n${proj.wiring}`;
        
        allChunks.push({
          id: `chunk-${chunkCount++}`,
          parentId,
          source: 'AIoT_Master_Guide_FINAL_v2.pdf',
          type: 'pdf',
          chapter: pTitle,
          projectId: pId,
          section: 'wiring',
          page: proj.startPage,
          title: `${pTitle} — Wiring & Pinouts`,
          text: parentText,
          parentText,
          contentHash: sha256(parentText)
        });
        sectionCounts.wiring++;
      }

      // 1c. Steps Implementation section
      if (proj.steps && proj.steps.length > 0) {
        const parentId = `parent-${pId}-steps`;
        const parentText = `Implementation Steps for ${pTitle}:\n` + proj.steps.join('\n\n');
        const children = createChildChunks(parentText, parentId, 450);

        for (let idx = 0; idx < children.length; idx++) {
          const childText = children[idx];
          allChunks.push({
            id: `chunk-${chunkCount++}`,
            parentId,
            source: 'AIoT_Master_Guide_FINAL_v2.pdf',
            type: 'pdf',
            chapter: pTitle,
            projectId: pId,
            section: 'steps',
            page: proj.startPage + 1,
            title: `${pTitle} — Steps (Part ${idx + 1})`,
            text: childText,
            parentText,
            contentHash: sha256(childText)
          });
          sectionCounts.steps++;
        }
      }

      // 1d. Code section (NEVER SPLIT full code, index semantic child)
      if (proj.code) {
        const parentId = `parent-${pId}-code`;
        const parentText = `Production Code for ${pTitle}:\n\`\`\`python\n${proj.code}\n\`\`\``;
        // Search child captures code comments, function names, and imports
        const codeSummary = `Python code implementation for ${pTitle}. Includes setup, imports, hardware reads, and exception handling:\n` +
          proj.code.split('\n').filter(l => l.startsWith('#') || l.startsWith('def ') || l.startsWith('import ') || l.startsWith('from ')).slice(0, 15).join('\n');
        
        allChunks.push({
          id: `chunk-${chunkCount++}`,
          parentId,
          source: 'AIoT_Master_Guide_FINAL_v2.pdf',
          type: 'pdf',
          chapter: pTitle,
          projectId: pId,
          section: 'code',
          page: proj.startPage + 2,
          title: `${pTitle} — Core Python Code`,
          text: codeSummary,
          parentText,
          contentHash: sha256(parentText)
        });
        sectionCounts.code++;
      }
    }
    console.log(`Generated structured project chunks across BOM, wiring, steps, and code.`);
  }

  // 2. Ingest Extracted PDF Pages (Chapters 1-12, Appendices A-M)
  if (fs.existsSync(EXTRACTED_PAGES_FILE)) {
    console.log(`Loading PDF pages from ${EXTRACTED_PAGES_FILE}...`);
    const pages = JSON.parse(fs.readFileSync(EXTRACTED_PAGES_FILE, 'utf-8'));

    for (const pageObj of pages) {
      const rawText = cleanPdfText(pageObj.text);
      if (!rawText || rawText.length < 80) continue;

      const pageNum = pageObj.page;
      // Skip hardware project pages already handled with high fidelity
      if (pageNum >= 104 && pageNum <= 135) continue;

      const ctx = getPageContext(pageNum);
      const parentId = `parent-page-${pageNum}`;
      const childTexts = createChildChunks(rawText, parentId, 500);

      for (let idx = 0; idx < childTexts.length; idx++) {
        const ct = childTexts[idx];
        allChunks.push({
          id: `chunk-${chunkCount++}`,
          parentId,
          source: 'AIoT_Master_Guide_FINAL_v2.pdf',
          type: 'pdf',
          chapter: ctx.chapter,
          projectId: ctx.projectId,
          section: 'general',
          page: pageNum,
          title: `${ctx.chapter} (Page ${pageNum}${childTexts.length > 1 ? `.${idx + 1}` : ''})`,
          text: ct,
          parentText: rawText,
          contentHash: sha256(ct)
        });
        sectionCounts.general++;
      }
    }
  }

  // 3. Ingest YouTube Video Transcripts
  if (fs.existsSync(TRANSCRIPTS_DIR)) {
    const transcriptFiles = fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Processing ${transcriptFiles.length} YouTube transcripts...`);

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
          const parentId = `parent-vid-${videoId}-${vc.start}`;
          allChunks.push({
            id: `chunk-${chunkCount++}`,
            parentId,
            source: `https://www.youtube.com/watch?v=${videoId}`,
            type: 'video',
            videoId,
            timestamp: vc.start,
            timeFormatted: tsStr,
            chapter: meta.chapter,
            projectId: meta.projectId,
            section: 'video',
            title: `${meta.title} [${tsStr}]`,
            text: vc.text,
            parentText: vc.text,
            contentHash: sha256(vc.text)
          });
          sectionCounts.video++;
        }
      } catch (e) {
        console.warn(`Error reading transcript ${file}: ${e.message}`);
      }
    }
  }

  console.log(`Total Chunks: ${allChunks.length}`);
  console.log(`Breakdown: Hardware=${sectionCounts.hardware}, Wiring=${sectionCounts.wiring}, Steps=${sectionCounts.steps}, Code=${sectionCounts.code}, Video=${sectionCounts.video}, General=${sectionCounts.general}`);

  // 4. Build MiniSearch Inverted Index
  console.log("Building MiniSearch keyword index with structure fields...");
  const miniSearch = new MiniSearch({
    fields: ['title', 'chapter', 'section', 'text'],
    storeFields: ['id', 'parentId', 'title', 'type', 'chapter', 'projectId', 'section', 'page', 'videoId', 'timestamp', 'timeFormatted', 'parentText']
  });

  miniSearch.addAll(allChunks);
  const miniSearchJson = JSON.stringify(miniSearch.toJSON());
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'minisearch-index.json'), miniSearchJson);
  console.log(`✓ Saved minisearch-index.json (${(miniSearchJson.length / 1024).toFixed(1)} KB)`);

  // 5. Generate Dense Vector Embeddings (with incremental caching)
  console.log("Loading all-MiniLM-L6-v2 model...");
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

  const embeddingDim = 384;
  const embeddingsBuffer = new Float32Array(allChunks.length * embeddingDim);

  // Load existing cache if present
  let existingCache = {};
  if (fs.existsSync(INGEST_CACHE_FILE)) {
    try {
      existingCache = JSON.parse(fs.readFileSync(INGEST_CACHE_FILE, 'utf-8'));
    } catch {
      existingCache = {};
    }
  }

  const updatedCache = {};
  let newlyEmbedded = 0;
  let cacheHits = 0;

  console.log(`Generating 384-d dense embeddings for ${allChunks.length} chunks...`);
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const hash = chunk.contentHash;

    if (existingCache[hash] && existingCache[hash].length === embeddingDim) {
      embeddingsBuffer.set(new Float32Array(existingCache[hash]), i * embeddingDim);
      updatedCache[hash] = existingCache[hash];
      cacheHits++;
    } else {
      const textToEmbed = `${chunk.title}: ${chunk.text.slice(0, 500)}`;
      const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data);
      embeddingsBuffer.set(new Float32Array(vector), i * embeddingDim);
      updatedCache[hash] = vector;
      newlyEmbedded++;
    }

    if ((i + 1) % 100 === 0 || i === allChunks.length - 1) {
      console.log(`Processed ${i + 1} / ${allChunks.length} chunks (New: ${newlyEmbedded}, Cached: ${cacheHits})...`);
    }
  }

  // Persist embedding cache
  fs.writeFileSync(INGEST_CACHE_FILE, JSON.stringify(updatedCache));
  console.log(`✓ Updated cache in ${INGEST_CACHE_FILE}`);

  // Save compact binary embeddings buffer
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'embeddings.bin'), Buffer.from(embeddingsBuffer.buffer));
  console.log(`✓ Saved embeddings.bin (${(embeddingsBuffer.byteLength / 1024).toFixed(1)} KB)`);

  // Save chunks metadata
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'chunks.json'), JSON.stringify(allChunks, null, 2));
  console.log(`✓ Saved chunks.json (${allChunks.length} items)`);

  // 6. Generate Index Version Manifest & Ingest Report
  const versionHash = sha256(JSON.stringify(allChunks.map(c => c.contentHash)));
  const manifest = {
    version: versionHash,
    chunkCount: allChunks.length,
    embeddingDim,
    generatedAt: new Date().toISOString(),
    model: 'Xenova/all-MiniLM-L6-v2'
  };
  fs.writeFileSync(path.join(PUBLIC_RAG_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const report = {
    version: versionHash,
    totalChunks: allChunks.length,
    newlyEmbedded,
    cacheHits,
    sections: sectionCounts,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(INGEST_REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`✓ Saved manifest.json and ingest_report.json (Version: ${versionHash})`);

  console.log("\nStructure-aware ingestion successfully completed!");
}

if (process.argv[1] && path.basename(process.argv[1]) === 'ingest.mjs') {
  runIngestion().catch(err => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
}
