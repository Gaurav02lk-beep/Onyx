import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-10 space-y-5">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
        {/* Background Cosmic Swirl (Deep Blue/Dark Grey) */}
        <div 
          className="absolute inset-0 rounded-full opacity-25"
          style={{ 
            background: 'radial-gradient(circle, rgba(30,58,138,0.4) 0%, rgba(17,24,39,0.1) 70%)', /* blue-800 to gray-900 like */
            animation: `swirl-celestial 6s linear infinite`
          }}
        ></div>

        {/* Outer Ring - Gold (Amber) */}
        <div 
          className="absolute inset-1 border-3 border-t-amber-400 border-r-amber-500/70 border-b-yellow-600/40 border-l-transparent rounded-full"
          style={{ animation: `spin-celestial 1.5s cubic-bezier(0.65,0.05,0.35,0.95) infinite` }}
        ></div>
        
        {/* Middle Ring - Sapphire (Sky Blue) */}
         <div 
          className="absolute inset-4 border-3 border-t-sky-500 border-r-sky-600/70 border-b-blue-700/40 border-l-transparent rounded-full"
          style={{ animation: `spin-celestial 1.2s cubic-bezier(0.6,0.1,0.4,0.9) infinite reverse`, animationDelay: '-0.3s' }}
        ></div>

        {/* Inner Ring - Silver (Slate) */}
        <div 
          className="absolute inset-7 border-2 border-t-slate-300 border-r-neutral-400/70 border-b-gray-500/40 border-l-transparent rounded-full"
          style={{ animation: `spin-celestial 0.9s cubic-bezier(0.55,0.15,0.45,0.85) infinite`, animationDelay: '-0.6s' }}
        ></div>
      </div>
      <p className="text-amber-300 text-base sm:text-lg tracking-wider animate-pulse" style={{animationDuration: '1.9s'}}>Evoking cosmic echoes...</p>
       <style>{`
        @keyframes spin-celestial {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes swirl-celestial {
          0% { transform: rotate(0deg) scale(0.95); opacity: 0.25; }
          50% { transform: rotate(180deg) scale(1.05); opacity: 0.4; }
          100% { transform: rotate(360deg) scale(0.95); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
};