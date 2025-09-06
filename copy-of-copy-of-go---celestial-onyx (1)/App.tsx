// This comment is added to attempt to resolve a module export issue.
import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { GeminiService } from './services/geminiService';
import type { SearchResult, GroundingSource, SearchMode } from './types';
import { GEMINI_TEXT_MODEL, GEMINI_IMAGE_GEN_MODEL, IMAGE_PROMPT_PREFIX, MAX_IMAGE_PROMPT_LENGTH } from './constants';
// SparklesIcon is no longer used directly in App.tsx header, it's moved to SearchBar.tsx

const App: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [isCharacterSpeaking, setIsCharacterSpeaking] = useState<boolean>(false);

  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);

  const geminiService = GeminiService.getInstance();

  const handleSearch = useCallback(async (currentQuery: string, currentImage: string | null, mode: SearchMode) => {
    if (!currentQuery && !currentImage) {
      setError("Please enter a query or upload an image to interface with the Celestial Onyx.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    setSentences([]);
    setCurrentSentenceIndex(-1);
    setIsCharacterSpeaking(false); 
    setGeneratedImageUrl(null);
    setImageGenerationError(null);
    setIsGeneratingImage(false);

    try {
      let resultText: string = '';
      let groundingSources: GroundingSource[] | undefined;

      if (mode === 'image' && currentImage) {
        const imagePrompt = currentQuery || "Describe this artifact in detail and find related information from the web.";
        const response = await geminiService.generateContentWithImage(
          imagePrompt,
          currentImage,
          GEMINI_TEXT_MODEL,
          true 
        );
        resultText = response.text;
        groundingSources = response.sources;
      } else {
        const response = await geminiService.generateContentText(
          currentQuery,
          GEMINI_TEXT_MODEL,
          true 
        );
        resultText = response.text;
        groundingSources = response.sources;
      }
      
      setSearchResult({ text: resultText, sources: groundingSources });
      const splitSentences = resultText.match(/[^.!?\n]+[.!?\n]*(?:\s+|$)/g) || [resultText];
      setSentences(splitSentences.map(s => s.trim()).filter(s => s.length > 0));

    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "A cosmic anomaly occurred during search.");
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [geminiService]);

  const handleGenerateImageRequest = useCallback(async () => {
    if (!searchResult || !searchResult.text) {
      setImageGenerationError("Cannot render a visual construct without textual echoes from the stream.");
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setImageGenerationError(null);

    try {
      const imagePromptText = searchResult.text.substring(0, MAX_IMAGE_PROMPT_LENGTH);
      const fullPrompt = `${IMAGE_PROMPT_PREFIX}${imagePromptText}`; 
      
      const { base64Image, mimeType } = await geminiService.generateImage(
        fullPrompt,
        GEMINI_IMAGE_GEN_MODEL
      );
      setGeneratedImageUrl(`data:${mimeType};base64,${base64Image}`);
    } catch (err) {
      console.error("Image generation error:", err);
      setImageGenerationError(err instanceof Error ? err.message : "Failed to materialize vision. The cosmic forge may be unstable or the request uninterpretable.");
    } finally {
      setIsGeneratingImage(false);
    }
  }, [searchResult, geminiService]);

  const startCharacterSpeech = () => {
    if (sentences.length > 0) {
      setCurrentSentenceIndex(0);
      setIsCharacterSpeaking(true);
    }
  };

  const handleCharacterSpeechEnd = () => {
    setIsCharacterSpeaking(false);
    setCurrentSentenceIndex(-1);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 w-full text-slate-300"> {/* Default text color */}
      <header className="w-full max-w-6xl my-8 sm:my-10 md:my-14 animate-elegant-fade-in-down flex flex-col items-center">
        {/* SparklesIcon removed from here, it's now in SearchBar.tsx */}
        <div className="text-center"> {/* Title and Subheading remain centered */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tighter">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 animate-shimmer-celestial">
              Onyx
            </span>
          </h1>
          <p className="text-slate-400/90 mt-1 sm:mt-1.5 text-lg sm:text-xl md:text-2xl font-light tracking-wider">Ready to innovate</p>
        </div>
      </header>

      <main className="w-full max-w-4xl xl:max-w-6xl flex flex-col gap-10 sm:gap-12">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading || isGeneratingImage}
          setUploadedImage={setUploadedImage}
          uploadedImage={uploadedImage}
          query={query}
          setQuery={setQuery}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
        />

        {isLoading && <LoadingSpinner />}
        {error && <ErrorDisplay message={error} onClose={() => setError(null)} />}

        {searchResult && !isLoading && (
           <div className={`celestial-onyx-card shadow-2xl rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col gap-8 animate-fade-scale-in-celestial transition-all duration-700 ease-out hover:shadow-[0_0_70px_20px_rgba(176,141,87,0.25),_0_0_100px_50px_rgba(176,141,87,0.15)] hover:scale-[1.01] animate-aura-glow-celestial hover:animate-refined-edge-celestial`}>
            <div className="flex-grow w-full">
              <ResultsDisplay
                result={searchResult}
                sentences={sentences}
                currentSentenceIndex={currentSentenceIndex} 
                isNarrating={isCharacterSpeaking}
                onToggleNarration={() => {
                  if (isCharacterSpeaking) {
                    setIsCharacterSpeaking(false); 
                  } else {
                    startCharacterSpeech();
                  }
                }}
                setNarratingCurrentSentenceIndex={setCurrentSentenceIndex}
                onNarrationCompleted={handleCharacterSpeechEnd}
                generatedImageUrl={generatedImageUrl}
                onGenerateImage={handleGenerateImageRequest}
                isGeneratingImage={isGeneratingImage}
                imageGenerationError={imageGenerationError}
                clearImageGenerationError={() => setImageGenerationError(null)}
              />
            </div>
          </div>
        )}
      </main>
      <footer className="w-full max-w-6xl text-center py-12 sm:py-16 mt-auto">
        <p className="text-sm text-slate-500/80 tracking-wider">forged in the onyx world to innovate.Gaurav</p>
      </footer>
    </div>
  );
};

export default App;