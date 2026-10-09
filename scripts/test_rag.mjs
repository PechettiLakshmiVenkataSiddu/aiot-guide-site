import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import MiniSearch from 'minisearch';

const RAG_DIR = 'public/rag-index';

const GOLDEN_TEST_SET = [
  {
    id: 1,
    query: "DHT22 temperature sensor alert with email smtplib",
    expectedProject: "hw-1",
    expectedKeyword: "dht22"
  },
  {
    id: 2,
    query: "MQTT topics design for factory floor zones and Mosquitto broker",
    expectedProject: "hw-2",
    expectedKeyword: "mqtt"
  },
  {
    id: 3,
    query: "Edge AI image classification with MobileNet and TFLite",
    expectedProject: "hw-3",
    expectedKeyword: "tflite"
  },
  {
    id: 4,
    query: "AI anomaly detection autoencoder for sensor telemetry",
    expectedProject: "hw-4",
    expectedKeyword: "anomaly"
  },
  {
    id: 5,
    query: "LangChain IoT assistant with conversational memory",
    expectedProject: "hw-5",
    expectedKeyword: "langchain"
  },
  {
    id: 6,
    query: "n8n factory alert automation and webhook triggers",
    expectedProject: "hw-6",
    expectedKeyword: "n8n"
  },
  {
    id: 7,
    query: "ADXL345 vibration sensor wiring and predictive maintenance FFT",
    expectedProject: "hw-7",
    expectedKeyword: "adxl345"
  },
  {
    id: 8,
    query: "WhatsApp IoT control bot using Twilio webhook",
    expectedProject: "hw-8",
    expectedKeyword: "whatsapp"
  },
  {
    id: 9,
    query: "Full stack AIoT web app with FastAPI and React",
    expectedProject: "hw-9",
    expectedKeyword: "fastapi"
  },
  {
    id: 10,
    query: "Autonomous robot ROS2 navigation and SLAM",
    expectedProject: "hw-10",
    expectedKeyword: "autonomous"
  },
  {
    id: 11,
    query: "Configure cursor rules .cursorrules for Raspberry Pi development",
    expectedKeyword: "cursor"
  },
  {
    id: 12,
    query: "Claude API system prompt engineering for IoT sensors",
    expectedKeyword: "claude"
  },
  {
    id: 13,
    query: "Japanese AIoT industry job market and bilingual engineer requirements",
    expectedKeyword: "japan"
  },
  {
    id: 14,
    query: "Two pointer technique and sliding window DSA patterns",
    expectedKeyword: "dsa"
  },
  {
    id: 15,
    query: "PyTorch tensor operations and DataLoader pipeline",
    expectedKeyword: "pytorch"
  },
  {
    id: 16,
    query: "Linux command line bash systemd service autostart",
    expectedKeyword: "linux"
  },
  {
    id: 17,
    query: "12 Sunday AI projects roadmap for weekly execution",
    expectedKeyword: "sunday"
  },
  {
    id: 18,
    query: "Cursor Vibe Coding for Beginners Tech With Tim",
    expectedVideoId: "8AWEPx5cHWQ"
  },
  {
    id: 19,
    query: "LangChain Crash Course freeCodeCamp tutorial",
    expectedVideoId: "lG7Uxts9SXs"
  },
  {
    id: 20,
    query: "Raspberry Pi Setup Guide Jeff Geerling tutorial",
    expectedVideoId: "BpJCAafw2qE"
  }
];

const ABSTENTION_TESTS = [
  "How to bake a chocolate cake in an electric oven",
  "How to train a golden retriever puppy to sit on command"
];

function cosineSimilarity(a, b, dim = 384) {
  let dot = 0;
  for (let i = 0; i < dim; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

async function runEvaluation() {
  console.log("=== Golden Test Suite: RAG Hybrid Retrieval & Abstention ===");

  console.log("Loading chunks and indexes from", RAG_DIR);
  const chunks = JSON.parse(fs.readFileSync(path.join(RAG_DIR, 'chunks.json'), 'utf-8'));
  const embeddingsBuffer = fs.readFileSync(path.join(RAG_DIR, 'embeddings.bin'));
  const embeddings = new Float32Array(embeddingsBuffer.buffer, embeddingsBuffer.byteOffset, embeddingsBuffer.byteLength / 4);
  const STOPWORDS = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'how', 'what', 'why', 'who', 'with', 'from', 'by']);
  const msJson = JSON.parse(fs.readFileSync(path.join(RAG_DIR, 'minisearch-index.json'), 'utf-8'));
  const miniSearch = MiniSearch.loadJSON(JSON.stringify(msJson), {
    fields: ['title', 'chapter', 'section', 'text'],
    storeFields: ['id', 'parentId', 'title', 'type', 'chapter', 'projectId', 'section', 'page', 'videoId', 'timestamp', 'timeFormatted', 'parentText'],
    processTerm: (term) => STOPWORDS.has(term.toLowerCase()) ? null : term.toLowerCase()
  });

  console.log("Loading all-MiniLM-L6-v2 embedding model...");
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
  const dim = 384;

  let passed = 0;
  const failures = [];

  for (const item of GOLDEN_TEST_SET) {
    const q = item.query;
    // 1. Keyword search
    const kwHits = miniSearch.search(q, {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 3, section: 2, text: 1 }
    }).slice(0, 40);

    const kwRankMap = new Map();
    let maxKwScore = 0;
    kwHits.forEach((h, idx) => {
      kwRankMap.set(h.id, idx + 1);
      if (h.score > maxKwScore) maxKwScore = h.score;
    });

    // 2. Vector search
    const qOut = await extractor(q, { pooling: 'mean', normalize: true });
    const qVec = qOut.data;

    const denseScored = [];
    let maxSim = 0;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const chunkVec = embeddings.subarray(i * dim, (i + 1) * dim);
      const sim = cosineSimilarity(qVec, chunkVec, dim);
      if (sim > maxSim) maxSim = sim;
      denseScored.push({ id: c.id, similarity: sim, chunk: c });
    }
    denseScored.sort((a, b) => b.similarity - a.similarity);
    const denseRankMap = new Map();
    denseScored.forEach((d, idx) => denseRankMap.set(d.id, idx + 1));

    // 3. RRF merge
    const k = 60;
    const candidates = new Map();
    const pool = new Set();
    denseScored.slice(0, 30).forEach(d => pool.add(d.id));
    kwHits.forEach(h => pool.add(h.id));

    const chunkMap = new Map();
    chunks.forEach(c => chunkMap.set(c.id, c));

    for (const cId of pool) {
      const chunk = chunkMap.get(cId);
      if (!chunk) continue;
      const rDense = denseRankMap.get(cId) ?? 999;
      const rKw = kwRankMap.get(cId) ?? 999;
      const rrf = (1.0 / (k + rDense)) + (0.85 / (k + rKw));
      candidates.set(cId, { chunk, rrf, sim: denseScored.find(d => d.id === cId)?.similarity || 0 });
    }

    const top5 = Array.from(candidates.values())
      .sort((a, b) => b.rrf - a.rrf)
      .slice(0, 5);

    // Evaluate match against criteria
    let hit = false;
    for (const res of top5) {
      const c = res.chunk;
      if (item.expectedProject && c.projectId === item.expectedProject) {
        hit = true;
        break;
      }
      if (item.expectedVideoId && c.videoId === item.expectedVideoId) {
        hit = true;
        break;
      }
      if (item.expectedKeyword) {
        const fullContent = (c.title + ' ' + c.chapter + ' ' + c.text).toLowerCase();
        if (fullContent.includes(item.expectedKeyword.toLowerCase())) {
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      passed++;
      console.log(`[PASS] Q${item.id}: "${q.slice(0, 50)}..." -> Top hit: [${top5[0].chunk.title}]`);
    } else {
      failures.push({
        id: item.id,
        query: q,
        expected: item.expectedProject || item.expectedVideoId || item.expectedKeyword,
        topHits: top5.map(t => t.chunk.title)
      });
      console.warn(`[FAIL] Q${item.id}: "${q.slice(0, 50)}..."`);
    }
  }

  // 4. Abstention tests
  console.log("\n--- Evaluating Abstention on Off-Topic Queries ---");
  let abstentionPassed = 0;
  for (const offQ of ABSTENTION_TESTS) {
    const qOut = await extractor(offQ, { pooling: 'mean', normalize: true });
    const qVec = qOut.data;

    let maxSim = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunkVec = embeddings.subarray(i * dim, (i + 1) * dim);
      const sim = cosineSimilarity(qVec, chunkVec, dim);
      if (sim > maxSim) maxSim = sim;
    }

    const kwHits = miniSearch.search(offQ, { prefix: true, fuzzy: 0.2 });
    const maxKw = kwHits.length > 0 ? kwHits[0].score : 0;

    const shouldAbstain = maxSim < 0.28 && maxKw < 40.0;
    if (shouldAbstain) {
      abstentionPassed++;
      console.log(`[PASS] Abstention triggered for off-topic query: "${offQ}" (MaxSim: ${maxSim.toFixed(3)}, MaxKW: ${maxKw.toFixed(2)})`);
    } else {
      console.warn(`[FAIL] Failed to abstain for query: "${offQ}" (MaxSim: ${maxSim.toFixed(3)}, MaxKW: ${maxKw.toFixed(2)})`);
    }
  }

  const recall5 = (passed / GOLDEN_TEST_SET.length) * 100;
  console.log("\n=================================");
  console.log(`Recall@5 Score: ${recall5.toFixed(1)}% (${passed} / ${GOLDEN_TEST_SET.length} Passed)`);
  console.log(`Abstention Accuracy: ${(abstentionPassed / ABSTENTION_TESTS.length * 100).toFixed(1)}% (${abstentionPassed}/${ABSTENTION_TESTS.length})`);
  console.log("=================================");

  if (failures.length > 0) {
    console.error("\nFailed Queries Details:", JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  if (recall5 < 90) {
    console.error(`Recall@5 (${recall5}%) is below 90% acceptance threshold!`);
    process.exit(1);
  }

  console.log("✨ ALL GOLDEN RETRIEVAL TESTS PASSED (Recall@5 >= 90%)! ✨");
}

runEvaluation().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
