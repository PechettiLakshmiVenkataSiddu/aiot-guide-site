import { pipeline, env } from '@xenova/transformers';
import MiniSearch from 'minisearch';

env.allowLocalModels = false;
env.useBrowserCache = true;

interface ChunkItem {
  id: string;
  source: string;
  type: 'pdf' | 'video';
  title: string;
  chapter: string;
  projectId: string | null;
  page?: number;
  videoId?: string;
  timestamp?: number;
  timeFormatted?: string;
  text: string;
}

let chunks: ChunkItem[] = [];
let embeddings: Float32Array | null = null;
let miniSearch: MiniSearch | null = null;
let extractor: any = null;
let isIndexLoaded = false;
let isModelLoaded = false;

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
  miniSearch = MiniSearch.loadJSON(JSON.stringify(msData), {
    fields: ['title', 'chapter', 'text'],
    storeFields: ['id', 'title', 'type', 'chapter', 'projectId', 'page', 'videoId', 'timestamp', 'timeFormatted']
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

      // Run keyword search
      const keywordHits = miniSearch
        ? miniSearch.search(query, { prefix: true, fuzzy: 0.2, boost: { title: 2 } }).slice(0, 30)
        : [];
      const keywordScoresMap = new Map<string, number>();
      keywordHits.forEach((hit, idx) => {
        keywordScoresMap.set(hit.id as string, 0.5 / (1 + idx * 0.1));
      });

      // Try vector embedding if extractor is ready
      let queryVec: any = null;
      if (isModelLoaded && extractor) {
        try {
          const queryOut = await extractor(query, { pooling: 'mean', normalize: true });
          queryVec = queryOut.data;
        } catch {
          // fallback to keyword only
        }
      }

      const dim = 384;
      const scoredResults: { chunk: ChunkItem; score: number; similarity: number }[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        if (projectId && chunk.projectId && chunk.projectId !== projectId) {
          continue;
        }

        let similarity = 0;
        if (queryVec && embeddings) {
          const chunkVec = embeddings.subarray(i * dim, (i + 1) * dim);
          similarity = cosineSimilarity(queryVec, chunkVec, dim);
        }

        const kwScore = keywordScoresMap.get(chunk.id) || 0;
        const projectBonus = projectId && chunk.projectId === projectId ? 0.3 : 0;

        // If vector ready: hybrid; else keyword score
        const combinedScore = queryVec
          ? similarity * 0.65 + kwScore * 0.35 + projectBonus
          : kwScore + projectBonus;

        if (combinedScore > 0 || (queryVec && similarity > 0.15)) {
          scoredResults.push({
            chunk,
            score: combinedScore,
            similarity
          });
        }
      }

      scoredResults.sort((a, b) => b.score - a.score);
      const topResults = scoredResults.slice(0, topK);

      self.postMessage({
        type: 'SEARCH_RESULTS',
        results: topResults,
        query
      });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message || 'Search failed' });
    }
  }
};
