
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface SearchResult {
  text: string;
  sources?: GroundingSource[];
  generatedImageUrl?: string; // Added for generated image
}

export type SearchMode = 'text' | 'voice' | 'image';

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}