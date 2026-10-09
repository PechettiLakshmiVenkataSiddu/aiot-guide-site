import { pipeline, env } from '@xenova/transformers';
import MiniSearch from 'minisearch';

env.allowLocalModels = false;
env.useBrowserCache = true;

interface ChunkItem {
  id: string;
  parentId?: string;
  source: string;
  type: 'pdf' | 'video';
  title: string;
  chapter: string;
  projectId: string | null;
  section?: 'hardware' | 'wiring' | 'steps' | 'code' | 'video' | 'general';
  page?: number;
  videoId?: string;
  timestamp?: number;
  timeFormatted?: string;
  contentHash?: string;
  text: string;
  parentText?: string;
}

let chunks: ChunkItem[] = [];
let embeddings: Float32Array | null = null;
let miniSearch: MiniSearch | null = null;
let extractor: any = null;
let isIndexLoaded = false;
let isModelLoaded = false;

// In-memory query vector cache
const queryVectorCache = new Map<string, Float32Array>();

function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>, dim = 384): number {
  let dot = 0;
  for (let i = 0; i < dim; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

let baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : './';

function resolvePath(filename: string): string {
  const b = baseUrl.replace(/\/+$/, '');
  return `${b}/rag-index/${filename}`;
}

async function initData(customBase?: string) {
  if (customBase) baseUrl = customBase;
  if (isIndexLoaded) return;
  self.postMessage({ type: 'STATUS', message: 'Loading knowledge index...' });

  // 1. Fetch chunks
  const chunksRes = await fetch(resolvePath('chunks.json'));
  chunks = await chunksRes.json();

  // 2. Fetch binary embeddings
  const binRes = await fetch(resolvePath('embeddings.bin'));
  const binArrayBuffer = await binRes.arrayBuffer();
  embeddings = new Float32Array(binArrayBuffer);

  // 3. Fetch MiniSearch keyword index
  const msRes = await fetch(resolvePath('minisearch-index.json'));
  const msData = await msRes.json();
  const STOPWORDS = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'how', 'what', 'why', 'who', 'with', 'from', 'by']);
  miniSearch = MiniSearch.loadJSON(JSON.stringify(msData), {
    fields: ['title', 'chapter', 'section', 'text'],
    storeFields: ['id', 'parentId', 'title', 'type', 'chapter', 'projectId', 'section', 'page', 'videoId', 'timestamp', 'timeFormatted', 'parentText'],
    processTerm: (term) => STOPWORDS.has(term.toLowerCase()) ? null : term.toLowerCase()
  });

  isIndexLoaded = true;
  self.postMessage({ type: 'STATUS', message: 'Ready' });

  // Load Transformer pipeline
  try {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true
    });
    isModelLoaded = true;
    self.postMessage({ type: 'READY' });
  } catch (err: any) {
    console.warn("Model lazy load error or offline mode, falling back to keyword index:", err);
  }
}

// Fallback project recommendations when abstaining
function getSuggestedProjects(query: string) {
  const q = query.toLowerCase();
  const suggestions: { id: string; title: string }[] = [];

  if (q.includes('temp') || q.includes('dht') || q.includes('email')) {
    suggestions.push({ id: 'hw-1', title: 'Project 1: Smart Temperature Monitor' });
  }
  if (q.includes('mqtt') || q.includes('broker') || q.includes('dash')) {
    suggestions.push({ id: 'hw-2', title: 'Project 2: MQTT Sensor Dashboard' });
  }
  if (q.includes('camera') || q.includes('vision') || q.includes('tflite') || q.includes('classif')) {
    suggestions.push({ id: 'hw-3', title: 'Project 3: Edge AI Image Classifier' });
  }
  if (q.includes('vibrat') || q.includes('adxl') || q.includes('mainten') || q.includes('fft')) {
    suggestions.push({ id: 'hw-7', title: 'Project 7: Predictive Maintenance System' });
  }
  if (q.includes('agent') || q.includes('langchain') || q.includes('bot')) {
    suggestions.push({ id: 'hw-5', title: 'Project 5: LangChain IoT Assistant' });
  }
  if (q.includes('n8n') || q.includes('automat')) {
    suggestions.push({ id: 'hw-6', title: 'Project 6: n8n Factory Alert Automation' });
  }

  if (suggestions.length === 0) {
    suggestions.push(
      { id: 'hw-1', title: 'Project 1: Smart Temperature Monitor' },
      { id: 'hw-2', title: 'Project 2: MQTT Sensor Dashboard' },
      { id: 'hw-7', title: 'Project 7: Predictive Maintenance System' }
    );
  }

  return suggestions.slice(0, 3);
}

self.onmessage = async (e: MessageEvent) => {
  const { action, query, projectId, topK = 4, base } = e.data;

  if (action === 'INIT') {
    initData(base).catch(err => {
      self.postMessage({ type: 'ERROR', message: err.message });
    });
    return;
  }

  if (action === 'SEARCH') {
    try {
      if (!isIndexLoaded) {
        await initData(base);
      }

      self.postMessage({ type: 'SEARCHING' });

      const cleanQuery = (query || '').trim();
      if (!cleanQuery) {
        self.postMessage({ type: 'SEARCH_RESULTS', results: [], query: cleanQuery, isAbstaining: true });
        return;
      }

      // 1. Keyword Search via MiniSearch
      const keywordFilter = projectId ? (result: any) => result.projectId === projectId : undefined;
      const keywordHits = miniSearch
        ? miniSearch.search(cleanQuery, {
            prefix: true,
            fuzzy: 0.2,
            boost: { title: 3, section: 2, text: 1 },
            filter: keywordFilter
          }).slice(0, 40)
        : [];

      const keywordRankMap = new Map<string, number>();
      let maxKeywordScore = 0;
      keywordHits.forEach((hit, idx) => {
        keywordRankMap.set(hit.id as string, idx + 1);
        if (hit.score > maxKeywordScore) maxKeywordScore = hit.score;
      });

      // 2. Vector Embedding Search
      let queryVec: Float32Array | null = null;
      if (queryVectorCache.has(cleanQuery)) {
        queryVec = queryVectorCache.get(cleanQuery)!;
      } else if (isModelLoaded && extractor) {
        try {
          const queryOut = await extractor(cleanQuery, { pooling: 'mean', normalize: true });
          queryVec = new Float32Array(queryOut.data);
          queryVectorCache.set(cleanQuery, queryVec);
        } catch {
          // fallback to keyword search
        }
      }

      const dim = 384;
      const denseScored: { id: string; similarity: number; chunk: ChunkItem }[] = [];
      let maxSimilarity = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Strict Scoping Filter: If projectId is provided, chunk MUST match projectId
        if (projectId && chunk.projectId !== projectId) {
          continue;
        }

        let similarity = 0;
        if (queryVec && embeddings) {
          const chunkVec = embeddings.subarray(i * dim, (i + 1) * dim);
          similarity = cosineSimilarity(queryVec, chunkVec, dim);
          if (similarity > maxSimilarity) maxSimilarity = similarity;
        }

        denseScored.push({ id: chunk.id, similarity, chunk });
      }

      denseScored.sort((a, b) => b.similarity - a.similarity);
      const denseRankMap = new Map<string, number>();
      denseScored.forEach((item, idx) => {
        denseRankMap.set(item.id, idx + 1);
      });

      // 3. Calibrated Abstention Rule
      // If query is completely off-topic (vector similarity < 0.28 and weak keyword score < 40)
      const hasMeaningfulVector = queryVec && maxSimilarity >= 0.28;
      const hasMeaningfulKeyword = keywordHits.length > 0 && maxKeywordScore >= 40.0;

      if (!hasMeaningfulVector && !hasMeaningfulKeyword) {
        self.postMessage({
          type: 'SEARCH_RESULTS',
          results: [],
          isAbstaining: true,
          query: cleanQuery,
          suggestedProjects: getSuggestedProjects(cleanQuery)
        });
        return;
      }

      // 4. Reciprocal Rank Fusion (RRF)
      const k = 60; // RRF smoothing factor
      const wDense = queryVec ? 1.0 : 0.0;
      const wKw = 0.85;

      const candidateMap = new Map<string, { chunk: ChunkItem; rrfScore: number; similarity: number; kwScore: number }>();

      // Merge pool of top-30 dense candidates + top-30 keyword candidates
      const poolCandidates = new Set<string>();
      denseScored.slice(0, 30).forEach(d => poolCandidates.add(d.id));
      keywordHits.forEach(k => poolCandidates.add(k.id as string));

      const chunkLookup = new Map<string, ChunkItem>();
      chunks.forEach(c => chunkLookup.set(c.id, c));

      for (const cId of poolCandidates) {
        const chunk = chunkLookup.get(cId);
        if (!chunk) continue;

        // Verify scoping
        if (projectId && chunk.projectId !== projectId) continue;

        const denseRank = denseRankMap.get(cId) ?? 999;
        const kwRank = keywordRankMap.get(cId) ?? 999;

        const rrfDense = wDense / (k + denseRank);
        const rrfKw = wKw / (k + kwRank);
        const totalRrf = rrfDense + rrfKw;

        const sim = denseScored.find(d => d.id === cId)?.similarity || 0;

        candidateMap.set(cId, {
          chunk,
          rrfScore: totalRrf,
          similarity: sim,
          kwScore: kwRank <= 40 ? 1 / kwRank : 0
        });
      }

      const rankedCandidates = Array.from(candidateMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);

      // 5. Maximal Marginal Relevance (MMR) & Parent Deduplication
      // Ensure result diversity so user receives varied sections (e.g. Wiring + Code + Steps)
      const selected: typeof rankedCandidates = [];
      const seenParents = new Set<string>();

      for (const cand of rankedCandidates) {
        const parentKey = cand.chunk.parentId || cand.chunk.id;
        // Don't select more than 2 child chunks from the same parent section
        const parentMatches = selected.filter(s => (s.chunk.parentId || s.chunk.id) === parentKey).length;
        if (parentMatches >= 2) continue;

        selected.push(cand);
        seenParents.add(parentKey);
        if (selected.length >= topK) break;
      }

      // Fallback if strict deduplication yielded fewer than topK
      if (selected.length < topK) {
        for (const cand of rankedCandidates) {
          if (!selected.includes(cand)) {
            selected.push(cand);
            if (selected.length >= topK) break;
          }
        }
      }

      const topResults = selected.map(s => ({
        chunk: s.chunk,
        score: s.rrfScore,
        similarity: s.similarity
      }));

      self.postMessage({
        type: 'SEARCH_RESULTS',
        results: topResults,
        isAbstaining: false,
        query: cleanQuery
      });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message || 'Search failed' });
    }
  }
};
