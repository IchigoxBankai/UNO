import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Copy, Check, Users, ArrowLeft, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export const Lobby = () => {
  const { gameState, playerId, leaveRoom, toggleReady, startGame } = useSocket();
  const [copied, setCopied] = useState(false);

  if (!gameState) return null;

  const { roomCode, players } = gameState;
  const currentPlayer = players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allReady = players.every(p => p.isReady);
  const canStart = players.length >= 2 && allReady;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 radial-mesh-bg">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={leaveRoom}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>LEAVE</span>
          </button>
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-300 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{players.length} / 4 Players</span>
          </div>
        </div>

        {/* Room Code Display */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block tracking-widest uppercase">ROOM CODE</span>
            <span className="text-2xl font-black text-indigo-200 tracking-wider">{roomCode}</span>
          </div>
          <button
            onClick={handleCopy}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white p-3 rounded-xl active:scale-95 transition-all flex items-center gap-2 text-xs font-bold"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-indigo-300 tracking-wider block uppercase">LOBBY PLAYERS</span>
          
          <div className="grid gap-2.5">
            {players.map((player) => {
              const isSelf = player.id === playerId;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all
                    ${isSelf 
                      ? 'bg-indigo-500/10 border-indigo-500/30' 
                      : 'bg-black/20 border-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-black/30 w-11 h-11 rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
                      {player.avatar}
                    </span>
                    <div>
                      <span className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-slate-100">
                        {player.name}
                        {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400 font-bold">YOU</span>}
                        {player.isHost && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">HOST</span>}
                      </span>
                    </div>
                  </div>

                  {/* Ready Indicator */}
                  <div>
                    {player.isReady ? (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 uppercase tracking-wider">
                        Not Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host controls or ready toggle */}
        <div className="pt-2">
          {isHost ? (
            <div className="space-y-2">
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`w-full font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg
                  ${canStart
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white cursor-pointer active:scale-98 hover:shadow-emerald-500/10'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'}`}
              >
                <Play className="w-5 h-5" />
                <span>Start Game</span>
              </button>
              {!canStart && (
                <p className="text-center text-[10px] sm:text-xs text-rose-400/80 font-medium">
                  {players.length < 2 
                    ? 'Need at least 2 players to start the game' 
                    : 'Waiting for all players to be ready'}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={toggleReady}
              className={`w-full font-bold py-3.5 rounded-2xl active:scale-98 transition-all shadow-lg flex items-center justify-center
                ${currentPlayer?.isReady 
                  ? 'bg-rose-600/30 border border-rose-500/30 text-rose-200 hover:bg-rose-600/40' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
            >
              <span>{currentPlayer?.isReady ? 'Cancel Ready' : 'I am Ready!'}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
