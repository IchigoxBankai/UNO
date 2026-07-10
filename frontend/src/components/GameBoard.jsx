import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Card } from './Card';
import { Chat } from './Chat';
import { Volume2, VolumeX, LogOut, ArrowRightCircle, ArrowLeftCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GameBoard = () => {
  const {
    gameState,
    playerId,
    leaveRoom,
    playCard,
    drawCard,
    drawOptionCard,
    playDrawnCard,
    keepDrawnCard,
    declareUno,
    soundEnabled,
    setSoundEnabled
  } = useSocket();

  const [wildCardToPlay, setWildCardToPlay] = useState(null); // stores { id } of wild card before color is chosen
  const [showChat, setShowChat] = useState(false);

  if (!gameState) return null;

  const {
    players,
    currentTurn,
    direction,
    activeColor,
    activeValue,
    discardPileTop,
    drawPileCount,
    unoRequired,
    declaredUno
  } = gameState;

  // Find self
  const selfIndex = players.findIndex(p => p.id === playerId);
  const self = players[selfIndex];
  if (!self) return null;

  // Re-order players list starting with self, then moving clockwise
  // so opponents are laid out properly (relative to self)
  const orderedOpponents = [];
  for (let i = 1; i < players.length; i++) {
    const idx = (selfIndex + i) % players.length;
    orderedOpponents.push(players[idx]);
  }

  // Active player turn check
  const activePlayer = players[currentTurn];
  const isMyTurn = activePlayer?.id === playerId;

  const handleCardClick = (card) => {
    if (!isMyTurn) return;
    if (card.color === 'wild') {
      setWildCardToPlay(card);
    } else {
      playCard(card.id);
    }
  };

  const handleColorSelect = (color) => {
    if (wildCardToPlay) {
      playCard(wildCardToPlay.id, color);
      setWildCardToPlay(null);
    } else if (drawOptionCard) {
      playDrawnCard(drawOptionCard.id, color);
    }
  };

  const renderColorIndicator = () => {
    const bgColors = {
      red: 'bg-red-500 shadow-red-500/30',
      blue: 'bg-blue-500 shadow-blue-500/30',
      green: 'bg-emerald-500 shadow-emerald-500/30',
      yellow: 'bg-yellow-400 shadow-yellow-400/30',
      wild: 'bg-indigo-600 shadow-indigo-600/30'
    };
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400">ACTIVE COLOR:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-black text-slate-900 capitalize shadow-lg ${bgColors[activeColor] || bgColors.wild}`}>
          {activeColor}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen radial-mesh-bg text-slate-100 flex flex-col p-3 md:p-6 overflow-hidden">
      {/* Top Bar / Header */}
      <header className="flex justify-between items-center glass-panel rounded-2xl p-4 mb-4 select-none">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500">UNO ONLINE</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-indigo-300">
            ROOM: {gameState.roomCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Direction */}
          <div className="flex items-center gap-1 text-slate-400 text-xs mr-4">
            {direction === 1 ? (
              <>
                <ArrowRightCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Clockwise</span>
              </>
            ) : (
              <>
                <ArrowLeftCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Counter-Clockwise</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/30 text-xs font-semibold"
          >
            Chat {showChat ? 'Close' : 'Open'}
          </button>

          {/* Leave Button */}
          <button
            onClick={leaveRoom}
            className="p-2.5 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Board Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden relative">
        <div className="flex-1 flex flex-col justify-between relative min-h-[75vh]">
          
          {/* Opponents Layout */}
          <div className="flex justify-between items-start px-8 py-2 w-full gap-4">
            {orderedOpponents.map((opponent, idx) => {
              const isOpponentTurn = activePlayer?.id === opponent.id;
              // Distribute layout based on player count
              // If 2 players total: opponent is centered at the top
              // If 3 players: top-left, top-right
              // If 4 players: left, top, right
              let positioning = "flex-1 flex flex-col items-center";
              if (players.length === 4) {
                if (idx === 0) positioning = "flex flex-col items-start";
                if (idx === 1) positioning = "flex flex-col items-center flex-1";
                if (idx === 2) positioning = "flex flex-col items-end";
              }

              return (
                <div key={opponent.id} className={`${positioning} transition-all duration-300`}>
                  <div className={`p-3 rounded-2xl border flex flex-col items-center relative
                    ${isOpponentTurn 
                      ? 'bg-indigo-600/20 border-indigo-400 shadow-lg shadow-indigo-500/10 scale-105' 
                      : 'bg-black/35 border-white/5 opacity-80'}`}
                  >
                    {/* Disconnected tag */}
                    {opponent.isDisconnected && (
                      <span className="absolute -top-3 px-2 py-0.5 rounded-md bg-red-600 text-[8px] font-bold text-white uppercase tracking-wider animate-pulse">
                        DC
                      </span>
                    )}

                    {/* Avatar and Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl bg-black/40 w-8 h-8 rounded-lg flex items-center justify-center border border-white/5">
                        {opponent.avatar}
                      </span>
                      <span className="text-xs font-semibold max-w-[80px] truncate">{opponent.name}</span>
                    </div>

                    {/* Opponent Cards Fans */}
                    <div className="flex -space-x-4 max-w-[120px] overflow-hidden justify-center select-none py-1">
                      {Array.from({ length: opponent.cardCount }).map((_, i) => (
                        <div key={i} className="rotate-[-5deg] hover:translate-y-[-5deg] transition-transform">
                          <Card isOpponent={true} isSmall={true} />
                        </div>
                      ))}
                    </div>

                    {/* Card Count Badge */}
                    <span className="text-[10px] mt-1 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 font-bold">
                      {opponent.cardCount} Cards
                    </span>

                    {/* UNO Shout Indicator */}
                    {declaredUno[opponent.id] && (
                      <span className="absolute -bottom-2 right-1 text-[8px] bg-amber-500 text-slate-900 border border-yellow-400 font-extrabold px-1.5 py-0.5 rounded animate-bounce">
                        UNO
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Play Area (Discard & Draw Stack) */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 my-6 relative select-none">
            <div className="flex items-center gap-8 md:gap-16">
              
              {/* Draw Pile */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={isMyTurn ? { scale: 1.05 } : {}}
                  whileTap={isMyTurn ? { scale: 0.95 } : {}}
                  onClick={isMyTurn ? drawCard : undefined}
                  disabled={!isMyTurn}
                  className={`relative rounded-2xl border-2 border-white/15 p-1 transition-all shadow-xl bg-neutral-900 flex items-center justify-center w-16 h-24 sm:w-20 sm:h-32 md:w-24 md:h-36
                    ${isMyTurn ? 'cursor-pointer hover:border-indigo-400 ring-2 ring-indigo-500/25 ring-offset-2 ring-offset-neutral-900' : 'opacity-50 cursor-not-allowed'}`}
                >
                  {/* Card design */}
                  <div className="w-full h-full rounded-xl border border-white/5 bg-gradient-to-br from-indigo-700 via-neutral-950 to-black flex items-center justify-center relative overflow-hidden">
                    <span className="text-yellow-400 font-extrabold text-[10px] sm:text-xs md:text-sm tracking-widest uppercase rotate-[30deg]">
                      DRAW
                    </span>
                  </div>
                  {/* Count overlay */}
                  <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-800 border border-white/15 text-[9px] font-bold">
                    {drawPileCount}
                  </div>
                </motion.button>
              </div>

              {/* Active / Discard Pile Top */}
              <div className="flex flex-col items-center gap-2">
                {discardPileTop ? (
                  <div className="relative">
                    <Card card={discardPileTop} isPlayable={false} />
                    
                    {/* Reverse/Skip dynamic glowing effect */}
                    {isMyTurn && (
                      <div className="absolute inset-0 bg-indigo-500/10 rounded-xl blur-md -z-10 animate-pulse"></div>
                    )}
                  </div>
                ) : (
                  <div className="w-16 h-24 sm:w-20 sm:h-32 md:w-24 md:h-36 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600">
                    Empty
                  </div>
                )}
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">DISCARD</span>
              </div>
            </div>

            {/* Current Active Info & Turn highlights */}
            <div className="flex flex-col items-center gap-2 mt-2">
              {renderColorIndicator()}
              
              <div className="px-4 py-1.5 rounded-full bg-black/40 border border-white/5 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span>
                  {isMyTurn 
                    ? '👉 YOUR TURN!' 
                    : `Waiting for ${activePlayer?.name}'s turn`}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Player Hand (Self) */}
          <div className="w-full flex flex-col items-center gap-4 px-4 select-none">
            {/* Shouting UNO Controls */}
            {unoRequired[playerId] && !declaredUno[playerId] && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                onClick={declareUno}
                className="bg-gradient-to-r from-yellow-500 via-amber-500 to-red-500 border border-yellow-400 font-black tracking-wider text-slate-950 px-6 py-2 rounded-full text-xs shadow-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                🔥 SHOUT UNO!
              </motion.button>
            )}

            {/* Player Hand Cards */}
            <div className="w-full glass-panel rounded-3xl p-4 sm:p-5 flex flex-col items-center relative overflow-hidden">
              {/* Background gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none"></div>

              <div className="text-[10px] font-bold text-indigo-300 tracking-widest uppercase mb-3 flex items-center gap-1">
                <span>YOUR HAND</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  {self.cards.length} Cards
                </span>
              </div>

              {/* Fan layout wrapper */}
              <div className="flex flex-wrap gap-2.5 sm:gap-3.5 justify-center max-h-[160px] sm:max-h-[220px] overflow-y-auto px-4 py-2 w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {self.cards.map((card) => {
                  // Card is playable if it matches color or value of discard pile, or is a wild card.
                  // And it must be the player's turn.
                  const isPlayable = isMyTurn && (
                    card.color === 'wild' || 
                    card.color === activeColor || 
                    card.value === activeValue
                  );

                  return (
                    <div key={card.id} className="transition-transform duration-200">
                      <Card
                        card={card}
                        isPlayable={isPlayable}
                        onClick={() => handleCardClick(card)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Side panel (Chat & System Messages) */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 h-[80vh] flex-shrink-0 z-10"
            >
              <Chat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Color Selection Overlay (For Wild Cards) */}
      <AnimatePresence>
        {(wildCardToPlay || (drawOptionCard && drawOptionCard.color === 'wild')) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel-heavy rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center border border-white/10"
            >
              <h3 className="text-xl font-bold tracking-tight text-white mb-1">SELECT ACTIVE COLOR</h3>
              <p className="text-slate-400 text-xs font-semibold mb-6 uppercase tracking-wider">For Wild Card Play</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleColorSelect('red')}
                  className="bg-gradient-to-br from-red-500 to-red-700 hover:scale-105 active:scale-95 text-white font-extrabold py-5 rounded-2xl shadow-lg border border-red-400/20 cursor-pointer"
                >
                  RED
                </button>
                <button
                  onClick={() => handleColorSelect('blue')}
                  className="bg-gradient-to-br from-blue-500 to-blue-700 hover:scale-105 active:scale-95 text-white font-extrabold py-5 rounded-2xl shadow-lg border border-blue-400/20 cursor-pointer"
                >
                  BLUE
                </button>
                <button
                  onClick={() => handleColorSelect('green')}
                  className="bg-gradient-to-br from-emerald-500 to-green-700 hover:scale-105 active:scale-95 text-white font-extrabold py-5 rounded-2xl shadow-lg border-emerald-400/20 cursor-pointer"
                >
                  GREEN
                </button>
                <button
                  onClick={() => handleColorSelect('yellow')}
                  className="bg-gradient-to-br from-amber-400 to-yellow-600 hover:scale-105 active:scale-95 text-slate-950 font-extrabold py-5 rounded-2xl shadow-lg border-yellow-400/20 cursor-pointer"
                >
                  YELLOW
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Immediate Play Pop-up Overlay (Drawn Card) */}
      <AnimatePresence>
        {drawOptionCard && drawOptionCard.color !== 'wild' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel-heavy rounded-3xl p-6 text-center max-w-sm w-full border border-white/10 flex flex-col items-center"
            >
              <h3 className="text-lg font-bold text-white mb-2">PLAY DRAWN CARD?</h3>
              <p className="text-slate-400 text-xs font-medium mb-6">You drew a playable card. Put it down or keep it?</p>
              
              <div className="mb-6">
                <Card card={drawOptionCard} isPlayable={false} />
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => playDrawnCard(drawOptionCard.id)}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 font-bold py-3 px-4 rounded-xl active:scale-95 transition-all text-xs"
                >
                  Play Card
                </button>
                <button
                  onClick={keepDrawnCard}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 font-bold py-3 px-4 rounded-xl active:scale-95 transition-all text-xs text-slate-300"
                >
                  Keep Card
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
