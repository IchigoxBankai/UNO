import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Automatic environment detection
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('uno_room_code') || '');
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('uno_player_id') || '');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('uno_player_name') || '');
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState(null);
  const [drawOptionCard, setDrawOptionCard] = useState(null); // stores drawn card if it can be played immediately

  // Sound effects enabled/disabled status
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('uno_sound_enabled');
    return saved !== 'false';
  });

  const soundsRef = useRef({});

  useEffect(() => {
    localStorage.setItem('uno_sound_enabled', soundEnabled);
  }, [soundEnabled]);

  // Audio utility helper
  const playSound = (soundName) => {
    if (!soundEnabled) return;
    try {
      const audio = soundsRef.current[soundName];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio playback failed', e));
      }
    } catch (e) {
      console.log('Audio error', e);
    }
  };

  // Sound paths configuration using standard public links / synth sounds if files are missing
  useEffect(() => {
    const soundFiles = {
      click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav',
      deal: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav',
      play: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-84.wav',
      draw: 'https://assets.mixkit.co/active_storage/sfx/2005/2005-84.wav',
      uno: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav',
      win: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav',
      join: 'https://assets.mixkit.co/active_storage/sfx/2632/2632-84.wav',
      leave: 'https://assets.mixkit.co/active_storage/sfx/2627/2627-84.wav'
    };

    // Preload audio
    Object.entries(soundFiles).forEach(([name, url]) => {
      soundsRef.current[name] = new Audio(url);
      soundsRef.current[name].volume = 0.4;
    });
  }, []);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to WebSocket server:', BACKEND_URL);

      // Attempt auto-reconnection if player ID and room code exist
      const storedPlayerId = localStorage.getItem('uno_player_id');
      const storedRoomCode = localStorage.getItem('uno_room_code');
      if (storedPlayerId && storedRoomCode) {
        newSocket.emit('reconnect-player', {
          playerId: storedPlayerId,
          roomCode: storedRoomCode
        });
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Room created event
    newSocket.on('room-created', ({ roomCode: code, playerId: pId }) => {
      localStorage.setItem('uno_room_code', code);
      localStorage.setItem('uno_player_id', pId);
      setRoomCode(code);
      setPlayerId(pId);
      playSound('join');
    });

    // Room joined event
    newSocket.on('room-joined', ({ roomCode: code, playerId: pId }) => {
      localStorage.setItem('uno_room_code', code);
      localStorage.setItem('uno_player_id', pId);
      setRoomCode(code);
      setPlayerId(pId);
      playSound('join');
    });

    // Room state update
    newSocket.on('room-state', (state) => {
      setGameState(state);
      // Play sound effects based on actions
      if (state.status === 'playing') {
        const lastPlay = state.discardPileTop;
        if (lastPlay) {
          playSound('play');
        }
      }
    });

    // Left Room event
    newSocket.on('left-room', () => {
      localStorage.removeItem('uno_room_code');
      localStorage.removeItem('uno_player_id');
      setRoomCode('');
      setPlayerId('');
      setGameState(null);
      setChatMessages([]);
      playSound('leave');
    });

    // Chat Message
    newSocket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg].slice(-100)); // Cap chat history to last 100 messages
      if (msg.type === 'system') {
        if (msg.text.includes('joined')) playSound('join');
        if (msg.text.includes('left') || msg.text.includes('disconnected')) playSound('leave');
        if (msg.text.includes('shouted UNO')) playSound('uno');
      }
    });

    // Game Over
    newSocket.on('game-over', () => {
      playSound('win');
    });

    // Draw option (playable immediately)
    newSocket.on('draw-option', ({ card }) => {
      setDrawOptionCard(card);
    });

    // Error handler
    newSocket.on('error-message', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = (name, avatar) => {
    localStorage.setItem('uno_player_name', name);
    setPlayerName(name);
    socket?.emit('create-room', { name, avatar });
  };

  const joinRoom = (name, avatar, code) => {
    localStorage.setItem('uno_player_name', name);
    setPlayerName(name);
    socket?.emit('join-room', { name, avatar, roomCode: code });
  };

  const leaveRoom = () => {
    socket?.emit('leave-room', { playerId, roomCode });
  };

  const toggleReady = () => {
    socket?.emit('toggle-ready', { playerId, roomCode });
  };

  const startGame = () => {
    socket?.emit('start-game', { roomCode });
  };

  const playCard = (cardId, wildColor = null) => {
    playSound('click');
    socket?.emit('play-card', { playerId, roomCode, cardId, wildColor });
  };

  const drawCard = () => {
    playSound('draw');
    socket?.emit('draw-card', { playerId, roomCode });
  };

  const playDrawnCard = (cardId, wildColor = null) => {
    setDrawOptionCard(null);
    socket?.emit('play-drawn', { playerId, roomCode, cardId, wildColor });
  };

  const keepDrawnCard = () => {
    setDrawOptionCard(null);
    socket?.emit('keep-drawn', { playerId, roomCode });
  };

  const declareUno = () => {
    socket?.emit('declare-uno', { playerId, roomCode });
  };

  const sendChat = (text) => {
    socket?.emit('send-chat', { playerId, roomCode, text });
  };

  const playAgain = () => {
    socket?.emit('play-again', { roomCode });
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      gameState,
      roomCode,
      playerId,
      playerName,
      chatMessages,
      error,
      drawOptionCard,
      setDrawOptionCard,
      soundEnabled,
      setSoundEnabled,
      playSound,
      createRoom,
      joinRoom,
      leaveRoom,
      toggleReady,
      startGame,
      playCard,
      drawCard,
      playDrawnCard,
      keepDrawnCard,
      declareUno,
      sendChat,
      playAgain
    }}>
      {children}
    </SocketContext.Provider>
  );
};
