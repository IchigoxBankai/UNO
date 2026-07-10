import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Play, Plus, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATARS = ['🦊', '🐱', '🐼', '🐨', '🐯', '🐸', '🐙', '🦖', '🦄', '🐝'];

export const Home = () => {
  const { createRoom, joinRoom, error } = useSocket();
  const [name, setName] = useState(() => localStorage.getItem('uno_player_name') || '');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState('');
  const [localError, setLocalError] = useState('');

  const triggerError = (msg) => {
    setLocalError(msg);
    setTimeout(() => setLocalError(''), 4000);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      return triggerError('Please enter your name');
    }
    createRoom(name.trim(), selectedAvatar);
  };

  const handleJoin = () => {
    if (!name.trim()) {
      return triggerError('Please enter your name');
    }
    if (!roomCode.trim()) {
      return triggerError('Please enter a room code');
    }
    if (roomCode.length !== 6) {
      return triggerError('Room code must be exactly 6 characters');
    }
    joinRoom(name.trim(), selectedAvatar, roomCode.toUpperCase().trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 radial-mesh-bg">
      {/* Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="text-center mb-8"
      >
        <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 drop-shadow-[0_5px_15px_rgba(255,255,255,0.1)]">
          UNO!
        </h1>
        <p className="text-indigo-200/60 font-semibold tracking-widest text-xs sm:text-sm mt-2">
          ONLINE MULTIPLAYER
        </p>
      </motion.div>

      {/* Main glass panel */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 space-y-6"
      >
        {/* Error message */}
        {(error || localError) && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs sm:text-sm rounded-xl p-3 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{localError || error}</span>
          </div>
        )}

        {/* Player Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-indigo-300 uppercase block">
            PLAYER NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 15))}
            placeholder="Enter nickname..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600 transition-all font-medium"
          />
        </div>

        {/* Avatar Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-indigo-300 uppercase block">
            CHOOSE AVATAR
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`text-2xl p-2 rounded-2xl border transition-all hover:scale-110 active:scale-95 flex items-center justify-center
                  ${selectedAvatar === avatar 
                    ? 'bg-indigo-600/30 border-indigo-500 scale-105 shadow-md shadow-indigo-500/25' 
                    : 'bg-black/20 border-white/5 hover:bg-black/30'}`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        {/* Actions Separator */}
        <div className="h-px bg-white/10 my-6"></div>

        {/* Buttons / Controls */}
        <div className="space-y-4">
          {/* Create Room Button */}
          <button
            onClick={handleCreate}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg hover:shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Create Custom Room</span>
          </button>

          <div className="flex items-center justify-center gap-3">
            <span className="h-px bg-white/5 flex-1"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OR</span>
            <span className="h-px bg-white/5 flex-1"></span>
          </div>

          {/* Join Room Controls */}
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ROOM CODE"
              className="w-2/5 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-center text-sm font-bold tracking-widest text-indigo-300 uppercase focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
            <button
              onClick={handleJoin}
              className="w-3/5 bg-white/5 border border-white/15 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Join Room</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
