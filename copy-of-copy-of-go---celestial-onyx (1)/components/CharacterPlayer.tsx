import React from 'react';

interface CharacterPlayerProps {
  isSpeaking: boolean;
}

export const CharacterPlayer: React.FC<CharacterPlayerProps> = ({ isSpeaking }) => {
  return (
    <div 
      className={`w-full h-full ${isSpeaking ? 'animate-oracle-speaking-celestial' : 'animate-oracle-idle-celestial'}`} 
      role="img" 
      aria-label="Celestial Onyx AI Oracle"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <radialGradient id="oracleBodyGradientCelestial" cx="50%" cy="40%" r="75%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="rgba(20, 20, 30, 0.8)" />   {/* Deep Indigo/Charcoal */}
            <stop offset="50%" stopColor="rgba(10, 10, 20, 0.7)" />   {/* Darker Onyx/Blue */}
            <stop offset="100%" stopColor="rgba(5, 5, 10, 0.6)" />    {/* Near Black/Deep Blue */}
          </radialGradient>
          <radialGradient id="oracleEyeGlowCelestial" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#F0E68C" stopOpacity="1" />    {/* Khaki/Pale Gold - Center */}
            <stop offset="40%" stopColor="#DAA520" stopOpacity="0.8" />  {/* Goldenrod */}
            <stop offset="100%" stopColor="#B8860B" stopOpacity="0.5" />{/* DarkGoldenrod - Outer glow */}
          </radialGradient>
          <radialGradient id="oracleCorePulseCelestial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(173, 216, 230, 0.9)" /> {/* Light Blue */}
            <stop offset="60%" stopColor="rgba(135, 206, 250, 0.6)" /> {/* Light Sky Blue */}
            <stop offset="100%" stopColor="rgba(70, 130, 180, 0.3)" />  {/* Steel Blue */}
          </radialGradient>
          <filter id="oracle-shadow-glow-celestial" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main Form - Deep, mysterious dark body */}
        <ellipse 
          cx="50" 
          cy="58"  /* Slightly lower */
          rx="38"  /* Slightly wider */
          ry="38" 
          fill="url(#oracleBodyGradientCelestial)" 
          opacity={isSpeaking ? "0.9" : "0.8"}
          className={`transition-all duration-700 ease-in-out origin-bottom`}
          style={isSpeaking ? { filter: 'url(#oracle-shadow-glow-celestial) drop-shadow(0 0 15px rgba(176, 141, 87, 0.25))' } : { filter: 'drop-shadow(0 6px 12px rgba(0,0,5,0.6))' } }
        />
        
        {/* Subtle cosmic texture overlay */}
         <ellipse 
            cx="50" 
            cy="58" 
            rx="38" 
            ry="38" 
            fill="rgba(100, 100, 150, 0.03)" /* Faint cosmic dust/nebula */
            className={isSpeaking ? 'opacity-100 animate-pulse' : 'opacity-60'}
            style={{animationDuration: isSpeaking ? '2s' : '4s', animationTimingFunction: 'ease-in-out', mixBlendMode: 'soft-light'}}
        />

        {/* Glowing Eyes - Soft Gold or Piercing Sapphire */}
        <g className={`transition-opacity duration-400 ${isSpeaking ? 'opacity-100' : 'opacity-90'}`}>
          <ellipse 
            cx="38" 
            cy="45" 
            rx={isSpeaking ? "5" : "4"} 
            ry={isSpeaking ? "7" : "6"}
            fill="url(#oracleEyeGlowCelestial)" /* Gold Eyes */
            /* fill="url(#oracleCorePulseCelestial)" // Alternative: Blue Eyes */
            className={isSpeaking ? 'animate-pulse' : ''}
            style={{ animationDuration: '1s', animationTimingFunction: 'ease-in-out', filter: 'blur(0.8px)' }}
          />
          <ellipse 
            cx="62" 
            cy="45" 
            rx={isSpeaking ? "5" : "4"} 
            ry={isSpeaking ? "7" : "6"}
            fill="url(#oracleEyeGlowCelestial)" /* Gold Eyes */
            /* fill="url(#oracleCorePulseCelestial)" // Alternative: Blue Eyes */
            className={isSpeaking ? 'animate-pulse' : ''}
            style={{ animationDuration: '1s', animationDelay: '0.2s', animationTimingFunction: 'ease-in-out', filter: 'blur(0.8px)' }}
          />
        </g>

        {/* Vocalization Core / "Mouth" area - Pulsing light */ }
        {isSpeaking ? (
          <ellipse 
            cx="50" 
            cy="65" 
            rx="12" 
            ry="5.5"
            fill="url(#oracleCorePulseCelestial)" /* Pulsing Blue Light */
            className="animate-text-subtle-glow-celestial" 
            style={{ animationDuration: '0.6s', filter: 'blur(2px)' }} 
          />
        ) : (
           <ellipse 
            cx="50" 
            cy="65" 
            rx="8" 
            ry="3"
            fill="rgba(70, 130, 180, 0.35)" /* Dimmed Steel Blue */
            style={{filter: 'blur(1.5px)'}}
          />
        )}
      </svg>
    </div>
  );
};