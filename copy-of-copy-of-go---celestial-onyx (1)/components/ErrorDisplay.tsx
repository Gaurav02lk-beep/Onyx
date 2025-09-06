import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon'; 

interface ErrorDisplayProps {
  message: string;
  onClose?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onClose }) => {
  return (
    <div 
      className="celestial-onyx-card bg-red-950/80 border-red-700/70 text-red-100 px-4 sm:px-5 py-3.5 rounded-xl relative shadow-2xl shadow-red-950/70 animate-fade-scale-in-celestial" 
      role="alert"
      style={{borderColor: '#A00000' /* Darker Crimson/Red border */, backgroundColor: 'rgba(60,0,0,0.7)'}} /* Deep Maroon/Red bg */
    >
      <div className="flex items-start">
        <div className="py-1 shrink-0">
          {/* Warning Icon - Amber/Gold for Celestial Onyx error emphasis */}
          <svg className="fill-current h-6 w-6 text-amber-400 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M10 0C4.486 0 0 4.486 0 10s4.486 10 10 10 10-4.486 10-10S15.514 0 10 0zm-1 15h2v2h-2v-2zm0-8h2v6h-2V7z"/>
          </svg>
        </div>
        <div className="flex-grow">
          <strong className="font-semibold text-amber-300">Cosmic Anomaly Detected:</strong>
          <span className="block text-sm sm:text-base text-red-200/95 mt-0.5">{message}</span>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 p-1.5 text-amber-300 hover:text-amber-100 hover:bg-red-800/70 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400"
          aria-label="Close error message"
        >
          <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
    </div>
  );
};