/**
 * In-Browser WebGPU LLM helper using @mlc-ai/web-llm.
 * Runs completely locally in browser with WebGPU acceleration.
 * Implements token context packing, streaming cancellation, and citation instruction.
 */

import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';

export const DEFAULT_MODEL = 'SmolLM-135M-Instruct-q0f16-MLC';

export interface LLMProgress {
  text: string;
  progress: number;
}

class WebLLMService {
  private engine: MLCEngine | null = null;
  private isLoading = false;
  private isSupported: boolean | null = null;
  private abortController: AbortController | null = null;

  public async checkWebGPUSupport(): Promise<boolean> {
    if (this.isSupported !== null) return this.isSupported;
    if (typeof navigator === 'undefined' || !(navigator as any).gpu) {
      this.isSupported = false;
      return false;
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      this.isSupported = !!adapter;
      return this.isSupported;
    } catch {
      this.isSupported = false;
      return false;
    }
  }

  public stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async initEngine(onProgress?: (progress: LLMProgress) => void): Promise<MLCEngine> {
    if (this.engine) return this.engine;
    if (this.isLoading) {
      throw new Error('Model is already downloading');
    }

    const hasGpu = await this.checkWebGPUSupport();
    if (!hasGpu) {
      throw new Error('WebGPU is not supported on this browser or mobile device.');
    }

    this.isLoading = true;
    try {
      this.engine = await CreateMLCEngine(DEFAULT_MODEL, {
        initProgressCallback: (report) => {
          if (onProgress) {
            onProgress({
              text: report.text,
              progress: Math.round(report.progress * 100)
            });
          }
        }
      });
      return this.engine;
    } finally {
      this.isLoading = false;
    }
  }

  public async generateAnswer(
    query: string,
    passages: { title: string; text: string }[],
    answerStyle: 'concise' | 'detailed' | 'tutorial' = 'concise',
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('WebLLM Engine not initialized');
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Context budget packing: SmolLM context is ~2048 tokens (~6000 chars)
    // Reserve ~2000 chars for system prompt and generated response
    let accumulatedChars = 0;
    const packedPassages = [];
    for (let i = 0; i < passages.length; i++) {
      const p = passages[i];
      const pText = `[${i + 1}] ${p.title}:\n${p.text}`;
      if (accumulatedChars + pText.length > 3500 && packedPassages.length > 0) break;
      packedPassages.push(pText);
      accumulatedChars += pText.length;
    }

    const styleInstructions = {
      concise: "Keep explanations short. Start with a real-world analogy, then provide numbered steps with copyable code.",
      detailed: "Provide comprehensive technical breakdown, architectural considerations, and troubleshooting tips.",
      tutorial: "Explain step-by-step as a mentor for beginners, highlighting common pitfalls."
    }[answerStyle];

    const systemPrompt = `You are the official AIoT Guide Assistant.
${styleInstructions}
RULES:
1. Answer strictly using ONLY the provided reference passages.
2. Always cite your claims using bracketed numbers like [1] or [2] matching the corresponding passage index.
3. If the answer cannot be determined from the passages, say exactly: "Not found in the guide or videos."

Reference Passages:
${packedPassages.join('\n\n')}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: query }
    ];

    try {
      if (onToken) {
        const stream = await this.engine.chat.completions.create({
          messages,
          temperature: 0.2,
          stream: true
        });

        let fullText = '';
        for await (const chunk of stream) {
          if (signal.aborted) {
            fullText += '\n\n*(Generation stopped by user)*';
            onToken('\n\n*(Generation stopped by user)*');
            break;
          }
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onToken(delta);
          }
        }
        return fullText;
      } else {
        const response = await this.engine.chat.completions.create({
          messages,
          temperature: 0.2
        });
        return response.choices[0]?.message?.content || 'No answer generated.';
      }
    } finally {
      this.abortController = null;
    }
  }
}

export const webLLM = new WebLLMService();
