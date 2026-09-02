import { GoogleGenAI } from "@google/genai";

// Lazy-initialized GoogleGenAI client singleton
let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient fallback ladder per production guidelines
export const MODEL_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash"
];

export interface FallbackOptions {
  contents: any;
  systemInstruction?: string;
  config?: any;
}

export async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          ...(options.config || {}),
        }
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const message = err?.message || "";
      console.warn(`[Gemini Fallback] Model ${model} failed (status: ${status}, error: ${message}). Attempting next model...`);
      // Continue to next model on 404, 429, 500, 503, or general failures
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}
