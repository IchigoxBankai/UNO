import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ card, onClick, isPlayable = true, isOpponent = false, isSmall = false }) => {
  // Card back layout
  if (isOpponent) {
    return (
      <div className={`relative rounded-xl border-2 border-white/40 select-none shadow-lg bg-red-600 flex items-center justify-center overflow-hidden
        ${isSmall ? 'w-10 h-16 sm:w-12 sm:h-20' : 'w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36'}`}
      >
        {/* Slanted black inner oval */}
        <div className="absolute w-[80%] h-[75%] rounded-[50%] bg-black border-2 border-yellow-400 rotate-[-25deg] flex items-center justify-center">
          <span className="text-yellow-400 font-extrabold text-[9px] sm:text-xs md:text-sm tracking-wider uppercase rotate-[25deg] scale-x-125 italic">
            UNO
          </span>
        </div>
      </div>
    );
  }

  const { color, value } = card;

  // Exact classic UNO hex mappings
  const backgroundColors = {
    red: 'bg-[#e8222c] border-[#ff4d56] text-[#e8222c]',
    blue: 'bg-[#0066cc] border-[#3399ff] text-[#0066cc]',
    green: 'bg-[#22a84c] border-[#3fd96c] text-[#22a84c]',
    yellow: 'bg-[#f2cf29] border-[#fbeb66] text-[#f2cf29]',
    wild: 'bg-[#1a1a1a] border-[#3a3a3a] text-white'
  };

  const colorClass = backgroundColors[color] || backgroundColors.wild;

  // Render symbol in the center
  const renderCenterSymbol = () => {
    // Underline helper for 6 and 9
    const isUnderlined = value === '6' || value === '9';

    switch (value) {
      case 'skip':
        return (
          <svg className="w-8 h-8 md:w-12 md:h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-4.9L7.09 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
          </svg>
        );
      case 'reverse':
        return (
          <svg className="w-8 h-8 md:w-10 md:h-10 rotate-[25deg]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
          </svg>
        );
      case 'draw2':
        return <span className="text-xl sm:text-2xl md:text-3.5xl font-black italic scale-y-110 tracking-tighter leading-none">+2</span>;
      case 'wild':
        return (
          <div className="grid grid-cols-2 w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 rotate-[25deg] overflow-hidden rounded-full border border-white shadow">
            <div className="bg-[#e8222c]"></div>
            <div className="bg-[#0066cc]"></div>
            <div className="bg-[#f2cf29]"></div>
            <div className="bg-[#22a84c]"></div>
          </div>
        );
      case 'wild_draw4':
        return (
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14">
            {/* Inner +4 overlay */}
            <span className="text-sm sm:text-base md:text-xl font-black italic text-black z-10 font-sans tracking-tighter drop-shadow-md">+4</span>
            {/* Quad color background */}
            <div className="absolute inset-0 grid grid-cols-2 rotate-[25deg] overflow-hidden rounded-full border border-white/50">
              <div className="bg-[#e8222c]"></div>
              <div className="bg-[#0066cc]"></div>
              <div className="bg-[#f2cf29]"></div>
              <div className="bg-[#22a84c]"></div>
            </div>
          </div>
        );
      default:
        return (
          <span className={`text-4xl sm:text-5xl md:text-6xl font-black italic scale-y-110 relative ${isUnderlined ? 'underline decoration-4 underline-offset-4' : ''}`}>
            {value}
          </span>
        );
    }
  };

  // Render corner indicator
  const renderCornerIndicator = () => {
    switch (value) {
      case 'skip':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-4.9L7.09 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
          </svg>
        );
      case 'reverse':
        return (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white rotate-[25deg]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
          </svg>
        );
      case 'draw2':
        return <span className="text-[10px] sm:text-xs font-black italic text-white leading-none">+2</span>;
      case 'wild':
        return (
          <div className="grid grid-cols-2 w-2.5 h-2.5 rounded-full overflow-hidden border border-white/50">
            <div className="bg-[#e8222c]"></div>
            <div className="bg-[#0066cc]"></div>
            <div className="bg-[#f2cf29]"></div>
            <div className="bg-[#22a84c]"></div>
          </div>
        );
      case 'wild_draw4':
        return <span className="text-[10px] sm:text-xs font-black italic text-white leading-none">+4</span>;
      default:
        return <span className="text-xs sm:text-sm font-black italic text-white">{value}</span>;
    }
  };

  return (
    <motion.button
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={isPlayable && onClick ? onClick : undefined}
      disabled={!isPlayable}
      className={`relative rounded-xl border-2 select-none shadow-lg transition-all flex flex-col items-center justify-between p-1.5 sm:p-2 overflow-hidden
        ${colorClass} 
        ${isSmall ? 'w-10 h-16 sm:w-12 sm:h-20' : 'w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36'} 
        ${isPlayable ? 'cursor-pointer hover:shadow-2xl' : 'opacity-55 cursor-not-allowed'}`}
    >
      {/* Top Left Corner Indicator */}
      <div className="self-start flex items-center justify-center p-0.5">
        {renderCornerIndicator()}
      </div>

      {/* Signature White Slanted Oval in Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[82%] h-[68%] rounded-[50%] bg-white rotate-[-25deg] flex items-center justify-center shadow-inner">
          {/* Symbol inside the oval (rotated back to look straight) */}
          <div className="rotate-[25deg] flex items-center justify-center">
            {renderCenterSymbol()}
          </div>
        </div>
      </div>

      {/* Bottom Right Corner Indicator (Upside down) */}
      <div className="self-end rotate-180 flex items-center justify-center p-0.5">
        {renderCornerIndicator()}
      </div>
    </motion.button>
  );
};
