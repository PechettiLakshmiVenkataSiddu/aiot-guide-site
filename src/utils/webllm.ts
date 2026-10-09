/**
 * In-Browser WebGPU LLM helper using @mlc-ai/web-llm.
 * Runs completely locally in browser with WebGPU hardware acceleration.
 */

import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';

// Recommended compact model for browser edge execution
export const DEFAULT_MODEL = 'SmolLM-135M-Instruct-q0f16-MLC';

export interface LLMProgress {
  text: string;
  progress: number;
}

class WebLLMService {
  private engine: MLCEngine | null = null;
  private isLoading = false;
  private isSupported: boolean | null = null;

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

  public async initEngine(onProgress?: (progress: LLMProgress) => void): Promise<MLCEngine> {
    if (this.engine) return this.engine;
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    const hasGpu = await this.checkWebGPUSupport();
    if (!hasGpu) {
      throw new Error('WebGPU is not supported on this browser or hardware.');
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
    passages: string[],
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('WebLLM Engine not initialized');
    }

    const systemPrompt = `You are the official AIoT Guide Assistant. 
Answer the user's question accurately and concisely using ONLY the provided reference passages.
If the information is not present in the passages, reply exactly: "This information was not found in the guide or videos."
Passages:
${passages.map((p, i) => `[Passage ${i + 1}]: ${p}`).join('\n\n')}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: query }
    ];

    if (onToken) {
      const chunks = await this.engine.chat.completions.create({
        messages,
        temperature: 0.2,
        stream: true
      });

      let fullText = '';
      for await (const chunk of chunks) {
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
  }
}

export const webLLM = new WebLLMService();
