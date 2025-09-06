import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SearchMode } from '../types';
import { MicIcon } from './icons/MicIcon';
import { CameraIcon } from './icons/CameraIcon'; // Kept for completeness, using UploadCloudIcon
import { SearchIcon } from './icons/SearchIcon';
import { XCircleIcon } from './icons/XCircleIcon'; 
import { UploadCloudIcon } from './icons/UploadCloudIcon'; 
import { SparkleIcon as SuggestionSparkleIcon } from './icons/SparkleIconMini'; 
// SparklesIcon is no longer imported here as it's replaced by text logo

import { DEBOUNCE_DELAY } from '../constants';
import { GeminiService } from '../services/geminiService';
import { GEMINI_TEXT_MODEL } from '../constants';

// SpeechRecognition types remain unchanged
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultItem {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}
interface SpeechGrammar {
    src: string;
    weight: number;
}
interface SpeechGrammarList {
    readonly length: number;
    item(index: number): SpeechGrammar;
    [index: number]: SpeechGrammar;
    addFromString(grammar: string, weight?: number): void;
    addFromURI(src: string, weight?: number): void;
}
type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}
interface SpeechRecognitionEventMap {
  "audiostart": Event;
  "audioend": Event;
  "end": Event;
  "error": SpeechRecognitionErrorEvent;
  "nomatch": SpeechRecognitionEvent;
  "result": SpeechRecognitionEvent;
  "soundstart": Event;
  "soundend": Event;
  "speechstart": Event;
  "speechend": Event;
  "start": Event;
}
interface SpeechRecognition extends EventTarget {
  grammars: SpeechGrammarList;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }
}


interface SearchBarProps {
  onSearch: (query: string, image: string | null, mode: SearchMode) => void;
  isLoading: boolean;
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;
  query: string;
  setQuery: (query: string) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
}

const MIN_QUERY_LENGTH_FOR_SUGGESTIONS = 2;
const SUGGESTIONS_DEBOUNCE_DELAY = 300; 

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  uploadedImage,
  setUploadedImage,
  query,
  setQuery,
  searchMode,
  setSearchMode,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [runActivation, setRunActivation] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechErrorTimeoutRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsDebounceTimeoutRef = useRef<number | null>(null);
  const searchBarRef = useRef<HTMLFormElement>(null);

  const geminiService = GeminiService.getInstance();

  useEffect(() => {
    const timer = setTimeout(() => setRunActivation(false), 1400); // Slightly longer for elegant entrance
    return () => clearTimeout(timer);
  }, []);

  const fetchSuggestions = useCallback(async (currentQuery: string) => {
    if (currentQuery.trim().length < MIN_QUERY_LENGTH_FOR_SUGGESTIONS) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const fetchedSuggestions = await geminiService.generateSuggestions(currentQuery, GEMINI_TEXT_MODEL);
      setSuggestions(fetchedSuggestions);
      setShowSuggestions(fetchedSuggestions.length > 0 && isInputFocused); 
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [geminiService, isInputFocused]);

  useEffect(() => {
    if (suggestionsDebounceTimeoutRef.current) {
      clearTimeout(suggestionsDebounceTimeoutRef.current);
    }
    if (query.trim().length >= MIN_QUERY_LENGTH_FOR_SUGGESTIONS && isInputFocused) {
      suggestionsDebounceTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(query);
      }, SUGGESTIONS_DEBOUNCE_DELAY);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    return () => {
      if (suggestionsDebounceTimeoutRef.current) {
        clearTimeout(suggestionsDebounceTimeoutRef.current);
      }
    };
  }, [query, fetchSuggestions, isInputFocused]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const clearSpeechError = () => {
    if (speechErrorTimeoutRef.current) clearTimeout(speechErrorTimeoutRef.current);
    setSpeechError(null);
  };

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => { clearSpeechError(); setIsListening(true); setShowSuggestions(false); }
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error, event.message);
      setIsListening(false);
      if (speechErrorTimeoutRef.current) clearTimeout(speechErrorTimeoutRef.current);
      if (event.error === 'aborted') return;
      
      let userMessage = `Voice recognition error: ${event.message || event.error}`;
      if (event.error === 'no-speech') userMessage = "No speech detected. Is your audio input active?";
      else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') userMessage = "Audio input access denied. Please enable permissions.";
      else if (event.error === 'audio-capture') userMessage = "Audio input not found or not working. Please check setup.";
      setSpeechError(userMessage);
      speechErrorTimeoutRef.current = window.setTimeout(() => setSpeechError(null), 7000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setQuery(finalTranscript);
        onSearch(finalTranscript, null, 'voice'); 
        clearSpeechError();
        setShowSuggestions(false);
      }
    };
    speechRecognitionRef.current = recognition;
    
    return () => {
        if (recognition) {
            recognition.abort(); 
            recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
        }
        if (speechErrorTimeoutRef.current) clearTimeout(speechErrorTimeoutRef.current);
    };
  }, [setQuery, onSearch]); 

  const handleVoiceSearch = () => {
    clearSpeechError(); setShowSuggestions(false);
    if (isLoading || isListening || !speechRecognitionRef.current) {
        if (!speechRecognitionRef.current) {
            setSpeechError("Speech recognition is not available in this browser.");
            speechErrorTimeoutRef.current = window.setTimeout(() => setSpeechError(null), 5000);
        }
        return;
    }
    try {
      setSearchMode('voice'); 
      speechRecognitionRef.current.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false); 
      setSpeechError("Could not start voice input. Try again or check browser permissions.");
      speechErrorTimeoutRef.current = window.setTimeout(() => setSpeechError(null), 5000);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      clearSpeechError(); setShowSuggestions(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setSearchMode('image'); 
        setQuery(''); 
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = () => {
    clearSpeechError(); setShowSuggestions(false);
    fileInputRef.current?.click();
  };
  
  const clearImage = () => {
    setUploadedImage(null); setShowSuggestions(false);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
    if (!query.trim() && searchMode === 'image') setSearchMode('text');
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    clearSpeechError(); setShowSuggestions(false);
    if (isLoading) return;
    if (searchMode === 'image' && uploadedImage) {
        onSearch(query, uploadedImage, 'image');
    } else if (query.trim()) {
        onSearch(query, null, 'text'); 
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion, uploadedImage, searchMode === 'image' && uploadedImage ? 'image' : 'text');
  };

  const elActivateBase = runActivation ? 'opacity-0 search-element-elegant-entrance' : 'opacity-100';

  return (
    <form 
        ref={searchBarRef}
        onSubmit={handleSubmit} 
        className={`relative w-full search-bar-celestial-onyx shadow-2xl rounded-3xl p-2.5 sm:p-3 space-y-3 transition-all duration-300 ${runActivation ? 'searchbar-elegant-entrance-anim opacity-0' : 'opacity-100'} ${isInputFocused ? 'animate-refined-edge-focus' : 'border-transparent'}`}
        style={runActivation ? { animationFillMode: 'forwards' } : {}}
    >
      <span className="absolute top-1/2 left-4 sm:left-5 -translate-y-1/2 text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 pointer-events-none z-10 select-none">
        Onyx
      </span>
      <div className={`relative flex items-center gap-2 sm:gap-2.5 search-bar-input-inset-celestial rounded-2xl transition-all duration-300 focus-within:shadow-[0_0_35px_8px_rgba(176,141,87,0.35)] ${elActivateBase} py-1.5 sm:py-2 pr-1.5 sm:pr-2 pl-20 sm:pl-24 md:pl-28`} style={runActivation ? {animationDelay: '50ms', animationFillMode: 'forwards'} : {}}>
        <input
          type="text"
          value={query}
          onFocus={() => {
            setIsInputFocused(true);
            if (query.trim().length >= MIN_QUERY_LENGTH_FOR_SUGGESTIONS && suggestions.length > 0) {
                 setShowSuggestions(true);
            }
          }}
          onBlur={() => { 
            setTimeout(() => {
                if (searchBarRef.current && !searchBarRef.current.contains(document.activeElement)) {
                    setIsInputFocused(false);
                }
            }, 150);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            clearSpeechError(); 
            if (searchMode !== 'text' && !uploadedImage) setSearchMode('text');
          }}
          placeholder={
            searchMode === 'image' && uploadedImage ? "Describe or query the artifact..." :
            isListening ? "Listening to cosmic echoes..." :
            "Go for innovate" 
          }
          className="flex-grow bg-transparent text-slate-200 text-base sm:text-lg md:text-xl p-3.5 sm:p-4 placeholder-slate-500/80 focus:outline-none"
          disabled={isLoading || isListening}
          aria-describedby={speechError ? "speech-error-message" : undefined}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleVoiceSearch}
          className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900/80 group
            ${isListening 
              ? 'bg-sky-600 text-white animate-pulse shadow-lg shadow-sky-600/50 focus:ring-sky-500' 
              : 'text-sky-300 hover:bg-sky-700/50 hover:text-sky-100 hover:shadow-[0_0_20px_4px_rgba(56,189,248,0.4)] focus:ring-sky-400'
            } disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none ${elActivateBase}`}
          disabled={isLoading}
          title="Voice Input"
          style={runActivation ? {animationDelay: '100ms', animationFillMode: 'forwards'} : {}}
        >
          <MicIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-110" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={triggerImageUpload}
          className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900/80 group
            text-slate-400 hover:bg-amber-600/30 hover:text-amber-200 hover:shadow-[0_0_20px_4px_rgba(217,119,6,0.4)] focus:ring-amber-500
            disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none ${elActivateBase}`}
          disabled={isLoading}
          title="Upload Artifact"
          style={runActivation ? {animationDelay: '150ms', animationFillMode: 'forwards'} : {}}
        >
          <UploadCloudIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-110" />
        </button>
         <button
          type="submit"
          className={`relative bg-gradient-to-br from-amber-500 via-yellow-600 to-orange-700 hover:from-amber-400 hover:via-yellow-500 hover:to-orange-600 text-neutral-900 font-semibold p-3.5 sm:p-4 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:transform-none group focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-900/80 active:animate-ripple-celestial active:animate-button-press-celestial hover:shadow-[0_0_45px_12px_rgba(217,119,6,0.5)] ${elActivateBase}`}
          disabled={isLoading || (!query.trim() && !uploadedImage)}
          style={runActivation ? {animationDelay: '200ms', animationFillMode: 'forwards'} : {}}
        >
          <SearchIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-[5deg] group-hover:scale-105 transition-transform duration-300" />
          <span className="hidden md:inline text-sm sm:text-base font-medium">Search</span>
        </button>
      </div>
      
      {isInputFocused && showSuggestions && (
        <div className={`absolute left-0 right-0 top-full mt-2 z-30 bg-black/85 backdrop-blur-lg border border-amber-800/60 rounded-b-2xl shadow-2xl overflow-hidden suggestions-dropdown-celestial`}>
          {isLoadingSuggestions ? (
            <div className="p-4 text-center flex items-center justify-center space-x-2.5">
               <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-amber-400 text-sm">Evoking suggestions...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto custom-scrollbar-suggestions-celestial">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-3.5 text-slate-300 hover:bg-neutral-800/70 transition-colors duration-150 focus:bg-neutral-700/80 focus:outline-none text-sm sm:text-base flex items-center gap-2.5 group"
                  >
                    <SuggestionSparkleIcon className="w-4 h-4 text-amber-500 group-hover:text-amber-300 transition-colors" />
                    <span>{suggestion}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !isLoadingSuggestions && query.trim().length >= MIN_QUERY_LENGTH_FOR_SUGGESTIONS && (
                <p className="px-4 py-3.5 text-slate-500 text-sm text-center">No further whispers from the cosmos. Refine your query.</p>
            )
          )}
        </div>
      )}
      
      {speechError && (
        <p id="speech-error-message" role="alert" className="text-sm text-red-200 bg-red-950/70 border border-red-700/80 px-4 py-3 rounded-xl mt-3 text-center animate-fade-scale-in-celestial">
          {speechError}
        </p>
      )}

      {uploadedImage && (
        <div className={`mt-3 p-3.5 bg-neutral-800/70 backdrop-blur-md rounded-2xl flex items-center justify-between border border-amber-700/60 shadow-xl animate-refined-edge-celestial`}>
          <div className="flex items-center gap-3.5 overflow-hidden">
            <img src={uploadedImage} alt="Uploaded artifact preview" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-500 shadow-md animate-pulse" style={{animationDuration: '2.5s'}} />
            <div className="flex-1 min-w-0">
                <span className="text-sm sm:text-base text-slate-200 block truncate font-medium">{query ? `Query on Artifact: "${query}"` : `Artifact Acquired.`}</span>
                <span className="text-xs text-slate-400/90 block">Awaiting interpretation by the Celestial Oracle.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="p-2 rounded-full hover:bg-neutral-700/80 text-amber-400 hover:text-amber-200 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 ml-2.5 flex-shrink-0"
            title="Discard Artifact"
          >
            <XCircleIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>
      )}
    </form>
  );
};