import fs from 'fs';
import { pipeline } from '@xenova/transformers';
import MiniSearch from 'minisearch';
import { chunkText, chunkTranscript } from './ingest.mjs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

// Cosine similarity
function cosineSimilarity(a, b, dim = 384) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < dim; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-9);
}

async function runTests() {
  console.log("=== Running Chunker and Retrieval Unit Tests ===");

  // 1. Chunker tests
  console.log("\n[Test 1] Document Chunker");
  const sampleDoc = "Paragraph 1 about IoT.\n\nParagraph 2 with sensor readings.\n\nParagraph 3 on edge computing and microcontrollers.";
  const docChunks = chunkText(sampleDoc, 80, 20);
  assert(docChunks.length >= 2, `Doc chunker split text into multiple chunks (${docChunks.length} chunks)`);
  assert(docChunks[0].includes("Paragraph 1"), "First chunk contains start of document");

  // 2. Transcript Chunker tests
  console.log("\n[Test 2] Transcript Chunker");
  const sampleSegments = [
    { text: "Welcome to this tutorial on Raspberry Pi.", offset: 0, duration: 10 },
    { text: "Today we will connect the DHT22 sensor to GPIO4.", offset: 15, duration: 20 },
    { text: "Make sure you use a 10k resistor between VCC and data.", offset: 40, duration: 25 },
    { text: "Now open python and import adafruit_dht.", offset: 70, duration: 20 }
  ];
  const transChunks = chunkTranscript(sampleSegments, 60, 5);
  assert(transChunks.length >= 1, `Transcript chunker created windows (${transChunks.length} chunks)`);
  assert(transChunks[0].start === 0, "Transcript chunk starts at 0s timestamp");
  assert(transChunks[0].text.includes("DHT22"), "Transcript chunk contains speech text");

  // 3. Retrieval tests with pre-built indices
  console.log("\n[Test 3] Retrieval Accuracy on Known Guide Questions");
  const chunks = JSON.parse(fs.readFileSync('public/rag-index/chunks.json', 'utf-8'));
  const binBuffer = fs.readFileSync('public/rag-index/embeddings.bin');
  const embeddings = new Float32Array(binBuffer.buffer, binBuffer.byteOffset, binBuffer.byteLength / 4);

  const miniSearchRaw = JSON.parse(fs.readFileSync('public/rag-index/minisearch-index.json', 'utf-8'));
  const miniSearch = MiniSearch.loadJSON(JSON.stringify(miniSearchRaw), {
    fields: ['title', 'chapter', 'text'],
    storeFields: ['id', 'title', 'type', 'chapter', 'projectId', 'page', 'videoId', 'timestamp', 'timeFormatted']
  });

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

  const testCases = [
    {
      query: "ADXL345 vibration sensor wiring and predictive maintenance",
      expectedProjectId: "hw-7",
      expectedKeyword: "vibration"
    },
    {
      query: "DHT22 temperature sensor alert with email smtplib",
      expectedProjectId: "hw-1",
      expectedKeyword: "dht22"
    },
    {
      query: "Configure cursor rules .cursorrules for Raspberry Pi",
      expectedKeyword: "cursorrules"
    },
    {
      query: "MQTT topics design for factory floor zones",
      expectedKeyword: "mqtt"
    }
  ];

  for (const tc of testCases) {
    console.log(`\nEvaluating Query: "${tc.query}"`);
    
    // Embed query
    const queryOut = await extractor(tc.query, { pooling: 'mean', normalize: true });
    const queryVec = queryOut.data;

    // MiniSearch keyword results
    const keywordHits = miniSearch.search(tc.query, { prefix: true, fuzzy: 0.2, boost: { title: 2 } }).slice(0, 10);
    const keywordHitIds = new Set(keywordHits.map(h => h.id));

    // Vector similarity across all chunks
    const scores = [];
    const dim = 384;
    for (let i = 0; i < chunks.length; i++) {
      const chunkVec = embeddings.subarray(i * dim, (i + 1) * dim);
      const sim = cosineSimilarity(queryVec, chunkVec, dim);
      const isKeywordHit = keywordHitIds.has(chunks[i].id);
      // Hybrid score: 0.6 vector + 0.4 keyword boost
      const hybridScore = sim + (isKeywordHit ? 0.35 : 0);
      scores.push({ chunk: chunks[i], sim, hybridScore });
    }

    scores.sort((a, b) => b.hybridScore - a.hybridScore);
    const topHit = scores[0].chunk;

    console.log(`-> Top match: [${topHit.type.toUpperCase()}] ${topHit.title}`);
    console.log(`   Project ID: ${topHit.projectId || 'None'} | Chapter: ${topHit.chapter}`);

    if (tc.expectedProjectId) {
      const topProjects = scores.slice(0, 3).map(s => s.chunk.projectId);
      assert(topProjects.includes(tc.expectedProjectId), `Query retrieved target project ${tc.expectedProjectId} in top 3`);
    } else if (tc.expectedKeyword) {
      const topTexts = scores.slice(0, 3).map(s => (s.chunk.text + ' ' + s.chunk.title).toLowerCase()).join(' ');
      assert(topTexts.includes(tc.expectedKeyword.toLowerCase()), `Query returned relevant content containing '${tc.expectedKeyword}' in top 3`);
    }
  }

  console.log("\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
