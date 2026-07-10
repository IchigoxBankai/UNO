import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Trophy, Home, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export const WinnerScreen = () => {
  const { gameState, playerId, leaveRoom, playAgain } = useSocket();

  if (!gameState || gameState.status !== 'gameover') return null;

  const { winner, players } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;
  const isWinner = winner?.id === playerId;

  // Simple array for floating visual particles
  const particles = Array.from({ length: 20 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      {/* Decorative Floating Confetti particles */}
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth - window.innerWidth / 2,
            y: window.innerHeight / 2 + 100,
            scale: Math.random() * 0.8 + 0.4,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            y: -window.innerHeight / 2 - 100,
            rotate: Math.random() * 360 + 360,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 3
          }}
          className={`absolute w-3.5 h-3.5 rounded-sm pointer-events-none
            ${['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-400', 'bg-purple-500'][i % 5]}`}
        />
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-full max-w-md glass-panel-heavy rounded-3xl p-8 text-center border border-yellow-500/20 relative"
      >
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-3xl blur opacity-15 pointer-events-none"></div>

        {/* Trophy icon */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1 }}
          className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-xl border border-yellow-300/30 mb-6"
        >
          <Trophy className="w-12 h-12 text-slate-900 drop-shadow-md" />
        </motion.div>

        {/* Winner Announcement */}
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
          {isWinner ? '🏆 VICTORY!' : 'GAME OVER'}
        </h2>
        
        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-6">
          {isWinner ? 'You played your last card!' : `${winner?.name} has won the match!`}
        </p>

        {/* Action Controls */}
        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={playAgain}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg hover:shadow-emerald-500/10"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Play Again (Lobby)</span>
            </button>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 text-xs text-indigo-300 font-semibold italic">
              Waiting for host to start another game...
            </div>
          )}

          <button
            onClick={leaveRoom}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Home className="w-5 h-5 text-indigo-400" />
            <span>Return to Home</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
