import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ card, onClick, isPlayable = true, isOpponent = false, isSmall = false }) => {
  // If it's an opponent's card, we just draw the back
  if (isOpponent) {
    return (
      <div className={`relative rounded-xl border-2 border-white/20 select-none shadow-lg bg-gradient-to-br from-red-600 via-red-800 to-black flex items-center justify-center
        ${isSmall ? 'w-10 h-16 sm:w-12 sm:h-20' : 'w-16 h-24 sm:w-20 sm:h-32 md:w-24 md:h-36'}`}
      >
        {/* Inner oval */}
        <div className="absolute w-[80%] h-[80%] rounded-[50%] border border-yellow-400/40 bg-black/40 rotate-[30deg] flex items-center justify-center">
          <span className="text-yellow-400 font-extrabold text-[10px] sm:text-xs md:text-sm tracking-widest uppercase -rotate-[30deg]">
            UNO
          </span>
        </div>
      </div>
    );
  }

  const { color, value } = card;

  // Map colors to gradients
  const colorGradients = {
    red: 'from-rose-500 via-red-600 to-red-800 border-rose-400/40 text-red-500',
    blue: 'from-sky-400 via-blue-600 to-blue-800 border-sky-400/40 text-blue-500',
    green: 'from-emerald-400 via-green-600 to-green-800 border-emerald-400/40 text-green-500',
    yellow: 'from-amber-300 via-yellow-500 to-yellow-600 border-yellow-300/40 text-yellow-600',
    wild: 'from-neutral-700 via-neutral-800 to-neutral-950 border-neutral-600/40 text-purple-400'
  };

  const gradientClass = colorGradients[color] || colorGradients.wild;

  // Symbol representation
  const renderSymbol = () => {
    switch (value) {
      case 'skip':
        return (
          <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case 'reverse':
        return (
          <svg className="w-8 h-8 md:w-12 md:h-12 rotate-[45deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'draw2':
        return <span className="text-xl sm:text-2xl md:text-3xl font-black">+2</span>;
      case 'wild':
        return (
          <div className="grid grid-cols-2 gap-0.5 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rotate-45 overflow-hidden rounded-full border border-white/20">
            <div className="bg-rose-500"></div>
            <div className="bg-sky-500"></div>
            <div className="bg-amber-400"></div>
            <div className="bg-emerald-500"></div>
          </div>
        );
      case 'wild_draw4':
        return <span className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400">+4</span>;
      default:
        return <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">{value}</span>;
    }
  };

  return (
    <motion.button
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={isPlayable && onClick ? onClick : undefined}
      disabled={!isPlayable}
      className={`relative rounded-xl border-2 select-none shadow-lg text-white transition-all flex flex-col items-center justify-between p-2 md:p-3 overflow-hidden
        ${gradientClass} 
        ${isSmall ? 'w-10 h-16 sm:w-12 sm:h-20' : 'w-16 h-24 sm:w-20 sm:h-32 md:w-24 md:h-36'} 
        ${isPlayable ? 'cursor-pointer hover:shadow-2xl' : 'opacity-60 cursor-not-allowed'}`}
    >
      {/* Top Left Corner Indicator */}
      <div className="self-start text-[10px] sm:text-xs md:text-sm font-bold flex items-center gap-0.5">
        {value === 'draw2' ? '+2' : value === 'wild_draw4' ? '+4' : value === 'wild' ? 'W' : value.toUpperCase()}
      </div>

      {/* Center Emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Slanted center circle */}
        <div className="w-[78%] h-[68%] rounded-[50%] bg-white/10 border border-white/5 rotate-[-30deg] flex items-center justify-center">
          <div className="rotate-[30deg] flex items-center justify-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {renderSymbol()}
          </div>
        </div>
      </div>

      {/* Bottom Right Corner Indicator */}
      <div className="self-end text-[10px] sm:text-xs md:text-sm font-bold rotate-180">
        {value === 'draw2' ? '+2' : value === 'wild_draw4' ? '+4' : value === 'wild' ? 'W' : value.toUpperCase()}
      </div>
    </motion.button>
  );
};
