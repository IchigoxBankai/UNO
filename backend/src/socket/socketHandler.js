import { UnoGame } from '../game/unoGame.js';
import { v4 as uuidv4 } from 'uuid';

const rooms = new Map(); // roomCode -> UnoGame instance

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Guarantee uniqueness
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

export function handleSocketEvents(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Create Room
    socket.on('create-room', ({ name, avatar }) => {
      try {
        const roomCode = generateRoomCode();
        const game = new UnoGame(roomCode);
        const playerId = uuidv4();
        
        game.addPlayer(playerId, socket.id, name, avatar);
        rooms.set(roomCode, game);

        socket.join(roomCode);
        socket.emit('room-created', { roomCode, playerId });
        
        io.to(roomCode).emit('room-state', game.getState());
        console.log(`Room created: ${roomCode} by ${name}`);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Join Room
    socket.on('join-room', ({ name, avatar, roomCode }) => {
      try {
        const code = roomCode.toUpperCase().trim();
        const game = rooms.get(code);

        if (!game) {
          throw new Error('Room not found');
        }

        const playerId = uuidv4();
        game.addPlayer(playerId, socket.id, name, avatar);

        socket.join(code);
        socket.emit('room-joined', { roomCode: code, playerId });

        // Notify chat
        io.to(code).emit('chat-message', {
          id: uuidv4(),
          sender: 'System',
          text: `${name} has joined the room.`,
          type: 'system',
          timestamp: Date.now()
        });

        io.to(code).emit('room-state', game.getState());
        console.log(`Player ${name} joined room ${code}`);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Toggle Ready State
    socket.on('toggle-ready', ({ playerId, roomCode }) => {
      const game = rooms.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === playerId);
      if (player) {
        game.setPlayerReady(playerId, !player.isReady);
        io.to(roomCode).emit('room-state', game.getState());
      }
    });

    // Start Game
    socket.on('start-game', ({ roomCode }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) throw new Error('Room not found');

        game.startGame();

        io.to(roomCode).emit('chat-message', {
          id: uuidv4(),
          sender: 'System',
          text: `The game has started!`,
          type: 'system',
          timestamp: Date.now()
        });

        // Emit state to everyone separately (so their own cards are private)
        sendStateToAll(io, game);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Play Card
    socket.on('play-card', ({ playerId, roomCode, cardId, wildColor }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) throw new Error('Room not found');

        const player = game.players.find(p => p.id === playerId);
        const card = player?.cards.find(c => c.id === cardId);

        game.playCard(playerId, cardId, wildColor);

        // Notify chat of action
        if (card) {
          let actionText = `${player.name} played ${card.color !== 'wild' ? card.color : ''} ${card.value}`;
          if (wildColor) actionText += ` (selected ${wildColor})`;
          io.to(roomCode).emit('chat-message', {
            id: uuidv4(),
            sender: 'System',
            text: actionText,
            type: 'system',
            timestamp: Date.now()
          });
        }

        if (game.status === 'gameover') {
          io.to(roomCode).emit('chat-message', {
            id: uuidv4(),
            sender: 'System',
            text: `${player.name} won the game!`,
            type: 'system',
            timestamp: Date.now()
          });
          io.to(roomCode).emit('game-over', { winner: player });
        }

        sendStateToAll(io, game);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Draw Card
    socket.on('draw-card', ({ playerId, roomCode }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) throw new Error('Room not found');

        const player = game.players.find(p => p.id === playerId);
        const { drawnCard, canPlayImmediate } = game.drawCard(playerId);

        io.to(roomCode).emit('chat-message', {
          id: uuidv4(),
          sender: 'System',
          text: `${player.name} drew a card.`,
          type: 'system',
          timestamp: Date.now()
        });

        // If player has option to play immediately, notify them
        if (canPlayImmediate) {
          socket.emit('draw-option', { card: drawnCard });
        }

        sendStateToAll(io, game);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Play Drawn Card immediately
    socket.on('play-drawn', ({ playerId, roomCode, cardId, wildColor }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) throw new Error('Room not found');

        game.playCard(playerId, cardId, wildColor);
        sendStateToAll(io, game);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Keep Drawn Card (skip turn)
    socket.on('keep-drawn', ({ playerId, roomCode }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) throw new Error('Room not found');

        game.advanceTurn();
        sendStateToAll(io, game);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Declare UNO
    socket.on('declare-uno', ({ playerId, roomCode }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) throw new Error('Room not found');

        const player = game.players.find(p => p.id === playerId);
        game.declareUno(playerId);

        io.to(roomCode).emit('chat-message', {
          id: uuidv4(),
          sender: 'System',
          text: `🔥 ${player.name} shouted UNO!`,
          type: 'system',
          timestamp: Date.now()
        });

        sendStateToAll(io, game);
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Chat Message
    socket.on('send-chat', ({ playerId, roomCode, text }) => {
      const game = rooms.get(roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === playerId);
      if (!player) return;

      io.to(roomCode).emit('chat-message', {
        id: uuidv4(),
        sender: player.name,
        text,
        type: 'player',
        timestamp: Date.now()
      });
    });

    // Reconnection
    socket.on('reconnect-player', ({ playerId, roomCode }) => {
      const game = rooms.get(roomCode);
      if (!game) {
        socket.emit('error-message', { message: 'Session expired or room closed' });
        return;
      }

      const player = game.reconnectPlayer(playerId, socket.id);
      if (player) {
        socket.join(roomCode);
        
        io.to(roomCode).emit('chat-message', {
          id: uuidv4(),
          sender: 'System',
          text: `${player.name} has reconnected.`,
          type: 'system',
          timestamp: Date.now()
        });

        sendStateToAll(io, game);
        console.log(`Player ${player.name} reconnected successfully.`);
      } else {
        socket.emit('error-message', { message: 'Could not reconnect to room' });
      }
    });

    // Play Again (Restart)
    socket.on('play-again', ({ roomCode }) => {
      try {
        const game = rooms.get(roomCode);
        if (!game) return;

        // Only host can restart
        game.status = 'lobby';
        game.players.forEach(p => {
          p.cards = [];
          p.isReady = p.isHost;
        });

        io.to(roomCode).emit('chat-message', {
          id: uuidv4(),
          sender: 'System',
          text: `Returning to lobby. Ready up to start a new game!`,
          type: 'system',
          timestamp: Date.now()
        });

        io.to(roomCode).emit('room-state', game.getState());
      } catch (err) {
        socket.emit('error-message', { message: err.message });
      }
    });

    // Leave Room
    socket.on('leave-room', ({ playerId, roomCode }) => {
      handlePlayerExit(socket, playerId, roomCode);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Find which room this socket belonged to
      for (const [roomCode, game] of rooms.entries()) {
        const player = game.players.find(p => p.socketId === socket.id);
        if (player) {
          game.disconnectPlayer(player.id);
          
          io.to(roomCode).emit('chat-message', {
            id: uuidv4(),
            sender: 'System',
            text: `${player.name} disconnected. Waiting 30s to reconnect...`,
            type: 'system',
            timestamp: Date.now()
          });

          io.to(roomCode).emit('room-state', game.getState());

          // Start graceful reconnection timeout
          game.disconnectTimeouts[player.id] = setTimeout(() => {
            console.log(`Reconnection timeout expired for ${player.name}`);
            const removed = game.removePlayer(player.id);
            if (removed) {
              io.to(roomCode).emit('chat-message', {
                id: uuidv4(),
                sender: 'System',
                text: `${removed.name} left the room (timeout).`,
                type: 'system',
                timestamp: Date.now()
              });
              
              // Clean up room if no players left
              if (game.players.length === 0) {
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} deleted due to empty state`);
              } else {
                io.to(roomCode).emit('room-state', game.getState());
              }
            }
          }, 30000); // 30 seconds
          
          break;
        }
      }
    });
  });
}

function handlePlayerExit(socket, playerId, roomCode) {
  const game = rooms.get(roomCode);
  if (!game) return;

  const player = game.removePlayer(playerId);
  if (player) {
    socket.leave(roomCode);
    socket.emit('left-room');

    socket.to(roomCode).emit('chat-message', {
      id: uuidv4(),
      sender: 'System',
      text: `${player.name} left the room.`,
      type: 'system',
      timestamp: Date.now()
    });

    if (game.players.length === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted`);
    } else {
      socket.to(roomCode).emit('room-state', game.getState());
    }
  }
}

// Custom function to send personalized states to each player in the room
function sendStateToAll(io, game) {
  for (const player of game.players) {
    if (!player.isDisconnected) {
      io.to(player.socketId).emit('room-state', game.getState(player.id));
    }
  }
}
