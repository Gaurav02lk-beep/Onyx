
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GroundingSource } from '../types';

// Ensure API_KEY is set in the environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  const warningMessage = `
****************************************************************************************
* CRITICAL ERROR: API_KEY environment variable not set or accessible.                  *
* Gemini API calls WILL FAIL.                                                          *
* Ensure API_KEY is configured in your application's environment.                      *
* If running locally, you might need to create a .env file or set it in your shell.    *
* The application WILL NOT function correctly without it.                              *
****************************************************************************************`;
  console.error(warningMessage);
  // alert(warningMessage); // Consider alerting for very critical local dev scenarios
}


interface GeminiServiceResult {
  text: string;
  sources?: GroundingSource[];
}

export class GeminiService {
  private static instance: GeminiService;
  private ai: GoogleGenAI;

  private constructor() {
    if (!API_KEY) {
      // Fallback for AI initialization if API_KEY is not available during construction.
      // Methods will throw a more specific error if API_KEY is still not available when they are called.
      this.ai = {
        models: {
          generateContent: (() => Promise.reject(new Error("API Key not configured at call time"))) as any,
          generateImages: (() => Promise.reject(new Error("API Key not configured at call time"))) as any,
          generateContentStream: (() => Promise.reject(new Error("API Key not configured at call time"))) as any,
        },
        chats: {
            create: (() => { throw new Error("API Key not configured at call time")}) as any,
        }
      } as GoogleGenAI;
      console.error("CRITICAL: GeminiService initialized without a valid API_KEY. All API calls are expected to fail.");
      return;
    }
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private parseAndCleanJson(text: string, fallbackTextOnError: boolean = false): any {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini response:", e);
      console.error("Original text for JSON parsing failure:", text);
      if (fallbackTextOnError) {
        // For general content, attempt to return the text directly if it's not JSON.
        return { text: text }; 
      }
      // For specific JSON needs like suggestions, rethrow.
      throw new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`); 
    }
  }

  private extractSources(response: GenerateContentResponse): GroundingSource[] | undefined {
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && Array.isArray(chunks)) {
      return chunks
        .map((chunk: any) => {
          if (chunk.web && chunk.web.uri) {
            return {
              uri: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri, // Use URI as fallback title
            };
          }
          // Handle other chunk types if necessary, e.g., "retrievedContext"
          return null;
        })
        .filter((source): source is GroundingSource => source !== null);
    }
    return undefined;
  }


  async generateContentText(prompt: string, modelName: string, useGrounding: boolean = false): Promise<GeminiServiceResult> {
    if (!API_KEY || !this.ai.models || typeof this.ai.models.generateContent !== 'function') {
        throw new Error("Gemini API Key not configured or service not initialized. Please set the API_KEY environment variable.");
    }
    try {
      const modelConfig: any = {
        systemInstruction: "You are an expert in science and mathematics. When a user asks for a formula or a concept involving one, provide the formula in LaTeX format. Use $$...$$ for block-level display formulas and $...$ for inline formulas. After presenting the formula, provide a brief and clear explanation of the concept."
      };
      if (useGrounding) {
        modelConfig.tools = [{ googleSearch: {} }];
      }
      // For gemini-2.5-flash, disable thinking for lower latency
      if (modelName === 'gemini-2.5-flash') {
        modelConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: modelConfig,
      });

      const text = response.text;
      const sources = this.extractSources(response);
      return { text, sources };
    } catch (error) {
      console.error("Gemini API error (generateContentText):", error);
      throw new Error(`Gemini API error in generateContentText: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateContentWithImage(prompt: string, base64ImageData: string, modelName: string, useGrounding: boolean = false): Promise<GeminiServiceResult> {
    if (!API_KEY || !this.ai.models || typeof this.ai.models.generateContent !== 'function') {
        throw new Error("Gemini API Key not configured or service not initialized. Please set the API_KEY environment variable.");
    }
    try {
      const mimeTypeMatch = base64ImageData.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,/);
      if (!mimeTypeMatch) {
        throw new Error("Invalid base64 image data: Mime type not found or not supported.");
      }
      const mimeType = mimeTypeMatch[1];
      const actualBase64Data = base64ImageData.substring(mimeTypeMatch[0].length);

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: actualBase64Data,
        },
      };
      const textPart = { text: prompt };
      
      const modelConfig: any = {
        systemInstruction: "You are an expert in science and mathematics. When a user asks for a formula or a concept involving one, provide the formula in LaTeX format. Use $$...$$ for block-level display formulas and $...$ for inline formulas. After presenting the formula, provide a brief and clear explanation of the concept."
      };
      if (useGrounding) {
        modelConfig.tools = [{ googleSearch: {} }];
      }
       // For gemini-2.5-flash, disable thinking for lower latency
      if (modelName === 'gemini-2.5-flash') {
        modelConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: { parts: [imagePart, textPart] },
        config: modelConfig,
      });
      
      const text = response.text;
      const sources = this.extractSources(response);
      return { text, sources };
    } catch (error) {
      console.error("Gemini API error (generateContentWithImage):", error);
      throw new Error(`Gemini API error in generateContentWithImage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateImage(prompt: string, modelName: string): Promise<{base64Image: string, mimeType: string}> {
    if (!API_KEY || !this.ai.models || typeof this.ai.models.generateImages !== 'function') {
        throw new Error("Gemini API Key not configured or service not initialized. Please set the API_KEY environment variable.");
    }
    try {
      const outputMimeType = 'image/jpeg'; // Or 'image/png'
      // Add thematic style to the prompt for Celestial Onyx
      const themedPrompt = `${prompt}. Style: elegant, celestial, onyx black, gold accents, cosmic, sophisticated, dark fantasy art style, cinematic lighting, detailed textures, refined aesthetic.`;

      const response = await this.ai.models.generateImages({
        model: modelName,
        prompt: themedPrompt,
        config: { numberOfImages: 1, outputMimeType: outputMimeType },
      });

      if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
        return {
          base64Image: response.generatedImages[0].image.imageBytes,
          mimeType: response.generatedImages[0].image.mimeType || outputMimeType
        };
      } else {
        console.error("Image generation response was empty or in unexpected format:", response);
        throw new Error("No image generated or API response format unexpected.");
      }
    } catch (error) {
      console.error("Gemini API error (generateImage):", error);
      throw new Error(`Gemini API error in generateImage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateSuggestions(currentQuery: string, modelName: string): Promise<string[]> {
    if (!API_KEY || !this.ai.models || typeof this.ai.models.generateContent !== 'function') {
        console.error("Gemini API error (generateSuggestions): API Key not configured or service not initialized. Cannot fetch suggestions.");
        return [];
    }
    if (!currentQuery.trim()) {
        return [];
    }

    // Slightly condensed prompt
    const prompt = `Search engine: "Celestial Onyx" (elegant, dark, gold accents). User query: "${currentQuery}". Provide 3-4 concise, relevant search suggestions as a JSON array of strings. Example: ["suggestion 1", "suggestion 2"]. Suggestions:`;
    
    const modelConfig: any = {
        responseMimeType: "application/json",
    };

    // For gemini-2.5-flash, disable thinking for lower latency in suggestions
    if (modelName === 'gemini-2.5-flash') {
      modelConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    try {
        const response = await this.ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: modelConfig,
        });

        const parsedJson = this.parseAndCleanJson(response.text);
        
        if (Array.isArray(parsedJson) && parsedJson.every(item => typeof item === 'string')) {
            return parsedJson.slice(0, 4); // Ensure max 4 suggestions
        } else if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.suggestions) && parsedJson.suggestions.every((item: any) => typeof item === 'string')) {
            // Handle if model wraps suggestions in an object like { "suggestions": [...] }
            return parsedJson.suggestions.slice(0,4);
        }
        else {
            console.warn("Gemini API (generateSuggestions): Suggestions not in expected format (array of strings). Response:", parsedJson, "Original text:", response.text);
            return []; 
        }
    } catch (error) {
        console.error(`Gemini API error (generateSuggestions for query "${currentQuery}"): ${error instanceof Error ? error.message : String(error)}`, error);
        return [];
    }
  }
}