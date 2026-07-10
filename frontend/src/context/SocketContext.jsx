import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { OfflineUnoGame } from '../utils/offlineGame';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

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
  const [drawOptionCard, setDrawOptionCard] = useState(null);

  // Offline Mode States
  const [isOffline, setIsOffline] = useState(false);
  const offlineGameRef = useRef(null);
  const botTimeoutRef = useRef(null);

  // Sound effects configuration
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('uno_sound_enabled');
    return saved !== 'false';
  });

  const soundsRef = useRef({});

  useEffect(() => {
    localStorage.setItem('uno_sound_enabled', soundEnabled);
  }, [soundEnabled]);

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

    Object.entries(soundFiles).forEach(([name, url]) => {
      soundsRef.current[name] = new Audio(url);
      soundsRef.current[name].volume = 0.4;
    });
  }, []);

  // Offline Bot Loop logic triggered on turn change
  useEffect(() => {
    if (!isOffline || !gameState || gameState.status !== 'playing') return;

    const activePlayer = offlineGameRef.current.players[gameState.currentTurn];
    
    if (activePlayer && activePlayer.isBot) {
      // Clear previous timeout to avoid double turns
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

      botTimeoutRef.current = setTimeout(() => {
        const bot = activePlayer;
        const decision = offlineGameRef.current.getBotDecision(bot);

        if (decision.action === 'play') {
          // Play card
          offlineGameRef.current.playCard(bot.id, decision.card.id, decision.wildColor);
          playSound('play');
          
          let logMsg = `${bot.name} played ${decision.card.color !== 'wild' ? decision.card.color : ''} ${decision.card.value}`;
          if (decision.wildColor) logMsg += ` (selected ${decision.wildColor})`;

          addSystemChat(logMsg);

          // Auto UNO call if bot gets down to 1 card
          if (bot.cards.length === 1) {
            offlineGameRef.current.declareUno(bot.id);
            playSound('uno');
            addSystemChat(`🔥 ${bot.name} shouted UNO!`);
          }

        } else if (decision.action === 'draw') {
          // Draw card
          const drawResult = offlineGameRef.current.drawCard(bot.id);
          playSound('draw');
          addSystemChat(`${bot.name} drew a card.`);

          if (drawResult && drawResult.canPlay) {
            // Play drawn card immediately
            setTimeout(() => {
              let botWildColor = null;
              if (drawResult.card.color === 'wild') {
                const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
                bot.cards.forEach(c => { if (c.color !== 'wild') colorCounts[c.color]++; });
                botWildColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
              }

              offlineGameRef.current.playCard(bot.id, drawResult.card.id, botWildColor);
              playSound('play');
              addSystemChat(`${bot.name} played drawn card: ${drawResult.card.value}`);
              
              if (bot.cards.length === 1) {
                offlineGameRef.current.declareUno(bot.id);
                playSound('uno');
                addSystemChat(`🔥 ${bot.name} shouted UNO!`);
              }

              setGameState(offlineGameRef.current.getState('human'));
            }, 800);
          }
        }

        // Check for Gameover
        if (offlineGameRef.current.status === 'gameover') {
          playSound('win');
          addSystemChat(`🏆 ${offlineGameRef.current.winner.name} has won the match!`);
        }

        setGameState(offlineGameRef.current.getState('human'));
      }, 1200); // 1.2s delay for Bot "thinking"
    }

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [gameState, isOffline]);

  const addSystemChat = (text) => {
    setChatMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'System',
        text,
        type: 'system',
        timestamp: Date.now()
      }
    ].slice(-100));
  };

  useEffect(() => {
    // Only connect socket if not in offline mode
    if (isOffline) {
      if (socket) {
        socket.disconnect();
        setConnected(false);
      }
      return;
    }

    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to WebSocket server:', BACKEND_URL);

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

    newSocket.on('room-created', ({ roomCode: code, playerId: pId }) => {
      localStorage.setItem('uno_room_code', code);
      localStorage.setItem('uno_player_id', pId);
      setRoomCode(code);
      setPlayerId(pId);
      playSound('join');
    });

    newSocket.on('room-joined', ({ roomCode: code, playerId: pId }) => {
      localStorage.setItem('uno_room_code', code);
      localStorage.setItem('uno_player_id', pId);
      setRoomCode(code);
      setPlayerId(pId);
      playSound('join');
    });

    newSocket.on('room-state', (state) => {
      setGameState(state);
      if (state.status === 'playing') {
        const lastPlay = state.discardPileTop;
        if (lastPlay) {
          playSound('play');
        }
      }
    });

    newSocket.on('left-room', () => {
      localStorage.removeItem('uno_room_code');
      localStorage.removeItem('uno_player_id');
      setRoomCode('');
      setPlayerId('');
      setGameState(null);
      setChatMessages([]);
      playSound('leave');
    });

    newSocket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg].slice(-100));
      if (msg.type === 'system') {
        if (msg.text.includes('joined')) playSound('join');
        if (msg.text.includes('left') || msg.text.includes('disconnected')) playSound('leave');
        if (msg.text.includes('shouted UNO')) playSound('uno');
      }
    });

    newSocket.on('game-over', () => {
      playSound('win');
    });

    newSocket.on('draw-option', ({ card }) => {
      setDrawOptionCard(card);
    });

    newSocket.on('error-message', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isOffline]);

  // Offline Actions
  const playOffline = (playerCount) => {
    setIsOffline(true);
    setPlayerId('human');
    localStorage.setItem('uno_player_name', 'You');
    setPlayerName('You');
    setRoomCode('OFFLINE');
    setChatMessages([]);
    
    const game = new OfflineUnoGame(playerCount);
    offlineGameRef.current = game;
    
    setGameState(game.getState('human'));
    playSound('join');
    addSystemChat(`Game loaded in offline mode with ${playerCount} players.`);
  };

  const createRoom = (name, avatar) => {
    setIsOffline(false);
    localStorage.setItem('uno_player_name', name);
    setPlayerName(name);
    socket?.emit('create-room', { name, avatar });
  };

  const joinRoom = (name, avatar, code) => {
    setIsOffline(false);
    localStorage.setItem('uno_player_name', name);
    setPlayerName(name);
    socket?.emit('join-room', { name, avatar, roomCode: code });
  };

  const leaveRoom = () => {
    if (isOffline) {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      setIsOffline(false);
      setGameState(null);
      setChatMessages([]);
      playSound('leave');
      return;
    }
    socket?.emit('leave-room', { playerId, roomCode });
  };

  const toggleReady = () => {
    if (isOffline) return;
    socket?.emit('toggle-ready', { playerId, roomCode });
  };

  const startGame = () => {
    if (isOffline) return;
    socket?.emit('start-game', { roomCode });
  };

  const playCard = (cardId, wildColor = null) => {
    playSound('click');
    if (isOffline) {
      offlineGameRef.current.playCard('human', cardId, wildColor);
      
      const card = offlineGameRef.current.discardPile[offlineGameRef.current.discardPile.length - 1];
      let logMsg = `You played ${card.color !== 'wild' ? card.color : ''} ${card.value}`;
      if (wildColor) logMsg += ` (selected ${wildColor})`;
      
      addSystemChat(logMsg);
      setGameState(offlineGameRef.current.getState('human'));
      return;
    }
    socket?.emit('play-card', { playerId, roomCode, cardId, wildColor });
  };

  const drawCard = () => {
    playSound('draw');
    if (isOffline) {
      const result = offlineGameRef.current.drawCard('human');
      addSystemChat(`You drew a card.`);
      
      if (result && result.canPlay) {
        setDrawOptionCard(result.card);
      }
      setGameState(offlineGameRef.current.getState('human'));
      return;
    }
    socket?.emit('draw-card', { playerId, roomCode });
  };

  const playDrawnCard = (cardId, wildColor = null) => {
    setDrawOptionCard(null);
    if (isOffline) {
      offlineGameRef.current.playCard('human', cardId, wildColor);
      
      const card = offlineGameRef.current.discardPile[offlineGameRef.current.discardPile.length - 1];
      let logMsg = `You played drawn card: ${card.value}`;
      if (wildColor) logMsg += ` (selected ${wildColor})`;
      
      addSystemChat(logMsg);
      setGameState(offlineGameRef.current.getState('human'));
      return;
    }
    socket?.emit('play-drawn', { playerId, roomCode, cardId, wildColor });
  };

  const keepDrawnCard = () => {
    setDrawOptionCard(null);
    if (isOffline) {
      offlineGameRef.current.advanceTurn();
      setGameState(offlineGameRef.current.getState('human'));
      return;
    }
    socket?.emit('keep-drawn', { playerId, roomCode });
  };

  const declareUno = () => {
    if (isOffline) {
      offlineGameRef.current.declareUno('human');
      playSound('uno');
      addSystemChat(`🔥 You shouted UNO!`);
      setGameState(offlineGameRef.current.getState('human'));
      return;
    }
    socket?.emit('declare-uno', { playerId, roomCode });
  };

  const sendChat = (text) => {
    if (isOffline) {
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          sender: 'You',
          text,
          type: 'player',
          timestamp: Date.now()
        }
      ]);
      return;
    }
    socket?.emit('send-chat', { playerId, roomCode, text });
  };

  const playAgain = () => {
    if (isOffline) {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      const game = new OfflineUnoGame(offlineGameRef.current.playerCount);
      offlineGameRef.current = game;
      setChatMessages([]);
      setGameState(game.getState('human'));
      playSound('join');
      addSystemChat(`New offline match started.`);
      return;
    }
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
      isOffline,
      playOffline,
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
