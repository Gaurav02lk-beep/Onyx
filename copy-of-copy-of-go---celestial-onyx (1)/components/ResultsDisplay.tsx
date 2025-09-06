
import React, { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '../types';
// import { LinkIcon } from './icons/LinkIcon'; // Replaced by RuneIcon for sources
import { PhotoIcon } from './icons/PhotoIcon'; 
import { AnvilIcon } from './icons/AnvilIcon'; 
import { BlueprintIcon } from './icons/BlueprintIcon'; 
import { RuneIcon } from './icons/RuneIcon'; 
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CharacterPlayer } from './CharacterPlayer';


interface ResultsDisplayProps {
  result: SearchResult;
  sentences: string[];
  currentSentenceIndex: number;
  isNarrating: boolean;
  onToggleNarration: () => void;
  setNarratingCurrentSentenceIndex: (index: number) => void;
  onNarrationCompleted: () => void;
  generatedImageUrl?: string | null;
  onGenerateImage?: () => Promise<void>;
  isGeneratingImage?: boolean;
  imageGenerationError?: string | null;
  clearImageGenerationError?: () => void;
}

interface TextSegment { type: 'text'; content: string; }
interface CodeSegment { type: 'code'; language?: string; content: string; }
type Segment = TextSegment | CodeSegment;

function parseTextWithCode(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  const regex = /```(\w*)\n([\s\S]*?)\n```/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    segments.push({ type: 'code', language: match[1] || undefined, content: match[2].trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: 'text', content: text.substring(lastIndex) });
  if (segments.length === 0 && text.length > 0) return [{ type: 'text', content: text }];
  return segments;
}

const renderHighlightedText = (text: string, highlightSubstring: string, isNarrating: boolean) => {
  if (!isNarrating || !highlightSubstring || !text.includes(highlightSubstring)) {
    return <>{text.split('\n').map((line, i, arr) => <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>)}</>;
  }
  const parts = text.split(new RegExp(`(${highlightSubstring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === highlightSubstring.toLowerCase() ? (
          <span key={index} className="bg-gradient-to-r from-amber-700/70 to-yellow-600/70 text-yellow-100 px-1.5 py-0.5 rounded-md shadow-sm">
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>
            {part.split('\n').map((line, i, arr) => <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>)}
          </React.Fragment>
        )
      )}
    </>
  );
};

interface TitleProps {
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  text: string;
  gradient: string;
  iconClass?: string;
}

const Title: React.FC<TitleProps> = React.memo(({ icon, text, gradient, iconClass }) => (
  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
    {React.cloneElement(icon, {
      className: `w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 opacity-80 ${iconClass || ''}`.trim()
    })}
    <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent ${gradient} animate-shimmer-celestial tracking-tight`}>{text}</h2>
  </div>
));
Title.displayName = 'Title';


const ResultsDisplayComponent: React.FC<ResultsDisplayProps> = ({
  result, sentences, currentSentenceIndex, isNarrating, onToggleNarration,
  setNarratingCurrentSentenceIndex, onNarrationCompleted, generatedImageUrl,
  onGenerateImage, isGeneratingImage, imageGenerationError, clearImageGenerationError
}) => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [copiedCodeBlockKey, setCopiedCodeBlockKey] = useState<string | null>(null);

  const handleCopyCode = (codeContent: string, key: string) => {
    navigator.clipboard.writeText(codeContent).then(() => {
      setCopiedCodeBlockKey(key);
      setTimeout(() => setCopiedCodeBlockKey(null), 2000);
    }).catch(err => console.error('Failed to copy code: ', err));
  };

  useEffect(() => {
    let speakTimeoutId: ReturnType<typeof setTimeout> | undefined;
    if (isNarrating && sentences.length > 0 && currentSentenceIndex >= 0 && currentSentenceIndex < sentences.length) {
      if (speechSynthesis.speaking) speechSynthesis.cancel();
      
      const sentenceToSpeak = sentences[currentSentenceIndex];
      // Skip speaking markdown code fence markers if they are isolated sentences
      if (sentenceToSpeak.match(/^```(\w*)$/) || sentenceToSpeak.match(/^```$/)) {
         if (currentSentenceIndex < sentences.length - 1) setNarratingCurrentSentenceIndex(currentSentenceIndex + 1);
         else onNarrationCompleted();
        return;
      }

      const newUtterance = new SpeechSynthesisUtterance(sentenceToSpeak);
      utteranceRef.current = newUtterance;
      newUtterance.onend = () => {
        if (utteranceRef.current === newUtterance) { // Check if this is still the current utterance
          utteranceRef.current = null;
          if (currentSentenceIndex < sentences.length - 1) setNarratingCurrentSentenceIndex(currentSentenceIndex + 1);
          else onNarrationCompleted();
        }
      };
      newUtterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        // When chaining utterances by calling cancel() then speak(), browsers can fire an 'interrupted' error.
        // We can treat this as a successful end to the sentence and proceed, rather than stopping narration.
        if (event.error === 'interrupted') {
            console.log(`Speech synthesis interrupted for sentence ${currentSentenceIndex}, proceeding to next.`);
            // This is the same logic as in `onend`.
            if (utteranceRef.current === newUtterance) {
                utteranceRef.current = null;
                if (currentSentenceIndex < sentences.length - 1) {
                    setNarratingCurrentSentenceIndex(currentSentenceIndex + 1);
                } else {
                    onNarrationCompleted();
                }
            }
            return; // Don't treat it as a fatal error.
        }

        console.error("Speech synthesis utterance error:", event.error, "Sentence:", sentences[currentSentenceIndex]);
        if (utteranceRef.current === newUtterance) { // Check if this is still the current utterance
          utteranceRef.current = null;
          onNarrationCompleted(); // Stop narration on other, more critical errors.
        }
      };
      // Small delay before speaking to allow UI to update if needed, and ensure cancel works
      speakTimeoutId = setTimeout(() => {
        if (utteranceRef.current === newUtterance && isNarrating) speechSynthesis.speak(newUtterance);
      }, 50); 
      return () => clearTimeout(speakTimeoutId);
    } else if (!isNarrating) {
      if (speechSynthesis.speaking) speechSynthesis.cancel();
      if (utteranceRef.current) {
        utteranceRef.current.onend = utteranceRef.current.onerror = null; // Clean up listeners
        utteranceRef.current = null;
      }
    }
  }, [isNarrating, currentSentenceIndex, sentences, setNarratingCurrentSentenceIndex, onNarrationCompleted]);

  useEffect(() => { // Cleanup on unmount
    return () => {
      if (speechSynthesis.speaking) speechSynthesis.cancel();
      if (utteranceRef.current) {
        utteranceRef.current.onend = utteranceRef.current.onerror = null;
        utteranceRef.current = null;
      }
    };
  }, []);

  useEffect(() => { 
    if (contentRef.current) {
      // 1. Highlight.js for code blocks
      if (typeof (window as any).hljs !== 'undefined') {
        const codeBlocks = contentRef.current.querySelectorAll('pre code:not([data-highlighted="true"])');
        codeBlocks.forEach((block) => {
          (window as any).hljs.highlightElement(block as HTMLElement);
          (block as HTMLElement).dataset.highlighted = 'true';
        });
      }

      // 2. KaTeX for math formulas
      // Add a check for window.katex to ensure the core library is loaded before auto-render is called.
      if (typeof (window as any).renderMathInElement !== 'undefined' && typeof (window as any).katex !== 'undefined') {
        // Target only text segments to avoid trying to render math inside code blocks
        const textSegments = contentRef.current.querySelectorAll('.prose-text-segment');
        textSegments.forEach(segment => {
           try {
             (window as any).renderMathInElement(segment as HTMLElement, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false},
                    // Keep defaults for compatibility
                    {left: "\\(", right: "\\)", display: false},
                    {left: "\\[", right: "\\]", display: true}
                ],
                throwOnError: false // Prevents app crash on malformed LaTeX
             });
           } catch (error) {
             console.error("KaTeX rendering error:", error);
           }
        });
      }
    }
  }, [result.text, generatedImageUrl]); // Re-run highlight/KaTeX when text or image changes

  if (!result.text && (!result.sources || result.sources.length === 0) && !generatedImageUrl && !isGeneratingImage) {
    return null;
  }

  const canNarrate = sentences && sentences.length > 0;
  const segments = parseTextWithCode(result.text);
  const currentSpokenSentenceText = (isNarrating && currentSentenceIndex >=0 && currentSentenceIndex < sentences.length) ? sentences[currentSentenceIndex] : "";

  return (
    <div className="space-y-10 sm:space-y-12 md:space-y-14">
      {result.text && (
        <div>
          <div className="flex justify-between items-start mb-1 min-h-[4rem] md:min-h-[5rem]">
             <Title 
                icon={<AnvilIcon />} 
                text="Interpreted Echoes" 
                gradient="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500"
                iconClass="text-amber-500"
             />
            {canNarrate && (
              <button
                onClick={onToggleNarration}
                title={isNarrating ? "Silence Oracle" : "Voice from the Cosmos"}
                className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900/80 group self-center
                  ${isNarrating
                    ? 'text-rose-400 hover:bg-rose-800/60 focus:ring-rose-600/70 animate-pulse' 
                    : 'text-sky-400 hover:bg-sky-800/50 focus:ring-sky-500/70'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                disabled={!canNarrate}
                aria-pressed={isNarrating}
              >
                {isNarrating ? <StopIcon className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-105" /> : <PlayIcon className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-105" />}
                <span className="sr-only">{isNarrating ? "Stop Narration" : "Play Narration"}</span>
              </button>
            )}
          </div>
          {isNarrating && canNarrate && (
             <div className="narrator-active-celestial-pulse rounded-full w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto mb-5 -mt-2">
                <CharacterPlayer isSpeaking={isNarrating} />
            </div>
          )}
          <div ref={contentRef} className="prose prose-invert prose-sm sm:prose-base max-w-none bg-black/70 backdrop-blur-md p-5 sm:p-6 md:p-7 rounded-2xl shadow-xl border border-neutral-700/50 text-slate-300 leading-relaxed sm:leading-loose">
            {segments.map((segment, index) => {
              const key = `segment-${index}`;
              if (segment.type === 'code') {
                return (
                  <div key={key} className="custom-code-block-wrapper-celestial relative group bg-neutral-900/80 my-6 rounded-xl shadow-lg border border-neutral-700/70">
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={() => handleCopyCode(segment.content, key)}
                        className="p-2 bg-neutral-700/80 hover:bg-neutral-600/90 text-slate-400 hover:text-slate-200 rounded-lg opacity-60 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 focus:ring-1 focus:ring-amber-500"
                        title={copiedCodeBlockKey === key ? "Copied!" : "Copy code"}
                        aria-label={copiedCodeBlockKey === key ? "Code copied to clipboard" : "Copy code to clipboard"}
                        aria-live="polite"
                      >
                        {copiedCodeBlockKey === key ? <CheckIcon className="w-4 h-4 text-amber-400" /> : <CopyIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    <pre className="code-block-scrollbar-celestial !rounded-b-xl !rounded-t-none"> 
                      <code className={segment.language ? `language-${segment.language}` : ''}>
                        {segment.content}
                      </code>
                    </pre>
                  </div>
                );
              } else { 
                return (
                  <div key={key} className="prose-text-segment">
                    {renderHighlightedText(segment.content, currentSpokenSentenceText, isNarrating)}
                  </div>
                );
              }
            })}
             {segments.length === 0 && result.text && ( // Fallback for plain text without any code blocks
                 <div className="prose-text-segment">
                    {renderHighlightedText(result.text, currentSpokenSentenceText, isNarrating)}
                 </div>
             )}
          </div>
        </div>
      )}

      {result.text && onGenerateImage && (
        <div className="mt-10">
           <Title 
              icon={<BlueprintIcon />} 
              text="Celestial Vision" 
              gradient="bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-400"
              iconClass="text-sky-400"
           />
          {!generatedImageUrl && !isGeneratingImage && !imageGenerationError &&(
            <button
              onClick={onGenerateImage}
              disabled={isGeneratingImage || !result.text}
              className="flex items-center justify-center gap-3 px-7 py-3.5 bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-500 hover:from-amber-500 hover:via-yellow-500 hover:to-orange-400 text-neutral-900 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-amber-600/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:transform-none disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-900/80 active:animate-button-press-celestial group"
              aria-label="Generate a visual representation of the data"
            >
              <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:animate-pulse" style={{animationDuration: '1.8s'}} />
              <span className="text-sm sm:text-base">Forge Vision</span>
            </button>
          )}

          {isGeneratingImage && (
            <div className="flex flex-col items-center p-6 animate-fade-scale-in-celestial">
              <LoadingSpinner />
              <p className="text-amber-400/90 mt-4">Conjuring vision from cosmic echoes...</p>
            </div>
          )}

          {imageGenerationError && clearImageGenerationError && (
            <ErrorDisplay message={imageGenerationError} onClose={clearImageGenerationError} />
          )}
          
          {generatedImageUrl && !isGeneratingImage && (
            <div className="mt-4 p-2 bg-black/75 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-neutral-700/60 animate-fade-scale-in-celestial">
              <img
                src={generatedImageUrl}
                alt="Generated celestial vision from the Onyx Oracle"
                className="w-full h-auto max-h-[500px] object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      )}

      {result.sources && result.sources.length > 0 && (
        <div className="mt-10">
          <Title 
            icon={<RuneIcon />} 
            text="Source Nebulae" 
            gradient="bg-gradient-to-r from-slate-400 via-neutral-300 to-stone-400" 
            iconClass="text-slate-400"
          />
          <ul className="space-y-3.5">
            {result.sources.map((source, index) => (
              <li key={index} className="bg-neutral-800/70 backdrop-blur-md p-4 sm:p-4.5 rounded-xl shadow-lg hover:bg-neutral-700/80 transition-all duration-200 border border-neutral-700/60 hover:border-amber-600/70 hover:shadow-amber-700/20 hover:shadow-md transform hover:scale-[1.015]">
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sky-400 hover:text-sky-200 group"
                >
                  <RuneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 group-hover:text-amber-500 transition-colors flex-shrink-0 group-hover:scale-110" />
                  <span className="truncate text-sm sm:text-base font-medium" title={source.title || source.uri}>
                    {source.title || source.uri}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
ResultsDisplayComponent.displayName = 'ResultsDisplay';
export const ResultsDisplay = React.memo(ResultsDisplayComponent);
