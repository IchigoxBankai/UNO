import { createDeck, shuffle } from './deck.js';

export class UnoGame {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.players = []; // { id, socketId, name, avatar, cards: [], isReady, isHost, isDisconnected: false }
    this.status = 'lobby'; // 'lobby' | 'playing' | 'gameover'
    
    // Game variables
    this.deck = [];
    this.discardPile = [];
    this.currentTurn = 0; // index of player whose turn it is
    this.direction = 1; // 1 = clockwise, -1 = counter-clockwise
    this.activeColor = null; // can be set by wild cards
    this.activeValue = null;
    this.winner = null;
    this.lastCardPlayed = null;
    
    // Stacking/penalty
    this.drawPenalty = 0; // stack for +2 and +4
    
    // UNO status tracker
    this.declaredUno = {}; // playerId -> boolean
    this.unoRequired = {}; // playerId -> boolean (has exactly 1 card remaining)
    
    // Reconnection mapping
    this.disconnectTimeouts = {}; // playerId -> NodeJS.Timeout
  }

  addPlayer(id, socketId, name, avatar) {
    if (this.players.length >= 4) {
      throw new Error('Room is full (max 4 players)');
    }
    if (this.status !== 'lobby') {
      throw new Error('Game already in progress');
    }

    const isHost = this.players.length === 0;
    const player = {
      id,
      socketId,
      name,
      avatar,
      cards: [],
      isReady: isHost, // Host is ready by default
      isHost,
      isDisconnected: false
    };
    this.players.push(player);
    return player;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return null;

    const removedPlayer = this.players[index];
    this.players.splice(index, 1);

    // Clean up timeouts
    if (this.disconnectTimeouts[playerId]) {
      clearTimeout(this.disconnectTimeouts[playerId]);
      delete this.disconnectTimeouts[playerId];
    }

    // Hand over host if host left
    if (removedPlayer.isHost && this.players.length > 0) {
      this.players[0].isHost = true;
      this.players[0].isReady = true;
    }

    // If game was playing and we don't have enough players
    if (this.status === 'playing' && this.players.length < 2) {
      this.status = 'lobby';
      this.deck = [];
      this.discardPile = [];
      this.players.forEach(p => p.cards = []);
    }

    // Adjust turn index if needed
    if (this.status === 'playing') {
      if (this.currentTurn >= this.players.length) {
        this.currentTurn = 0;
      }
    }

    return removedPlayer;
  }

  setPlayerReady(playerId, isReady) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
    return player;
  }

  disconnectPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isDisconnected = true;
    }
  }

  reconnectPlayer(playerId, socketId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isDisconnected = false;
      player.socketId = socketId;
      if (this.disconnectTimeouts[playerId]) {
        clearTimeout(this.disconnectTimeouts[playerId]);
        delete this.disconnectTimeouts[playerId];
      }
      return player;
    }
    return null;
  }

  startGame() {
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }
    if (!this.players.every(p => p.isReady)) {
      throw new Error('All players must be ready');
    }

    // Initialize Game state
    this.status = 'playing';
    this.deck = shuffle(createDeck());
    this.discardPile = [];
    this.currentTurn = 0;
    this.direction = 1;
    this.drawPenalty = 0;
    this.winner = null;
    this.declaredUno = {};
    this.unoRequired = {};

    // Deal 7 cards to each player
    for (const player of this.players) {
      player.cards = [];
      for (let i = 0; i < 7; i++) {
        player.cards.push(this.deck.pop());
      }
    }

    // Flip first card
    let startCard = this.deck.pop();
    // Start card cannot be Wild Draw Four
    while (startCard.value === 'wild_draw4') {
      this.deck.unshift(startCard);
      this.deck = shuffle(this.deck);
      startCard = this.deck.pop();
    }

    this.discardPile.push(startCard);
    this.activeColor = startCard.color;
    this.activeValue = startCard.value;
    this.lastCardPlayed = startCard;

    // Apply immediate start effects
    if (startCard.value === 'skip') {
      this.advanceTurn();
    } else if (startCard.value === 'reverse') {
      if (this.players.length === 2) {
        this.advanceTurn(); // in 2 player game, reverse acts as skip
      } else {
        this.direction = -1;
        this.currentTurn = this.players.length - 1; // last player starts or next player? First player's turn gets modified
      }
    } else if (startCard.value === 'draw2') {
      this.drawPenalty = 2;
      // In official rules, the first player draws 2 cards and skips their turn.
      this.applyDrawPenalty(this.players[this.currentTurn]);
      this.advanceTurn();
    } else if (startCard.value === 'wild') {
      // First player chooses color, activeColor stays 'wild' till selection
      this.activeColor = 'wild'; 
    }

    return this.getState();
  }

  // Get active player object
  getCurrentPlayer() {
    return this.players[this.currentTurn];
  }

  advanceTurn() {
    this.currentTurn = (this.currentTurn + this.direction + this.players.length) % this.players.length;
    // Skip disconnected players (or keep their turn if we wait for them)
    // For simplicity, we skip disconnected players if their timeout has elapsed,
    // but while they have reconnection window we still allow their turn to show or skip.
    // Let's just allow normal progression.
  }

  // Validates if card can be played on current stack
  isValidMove(card, player) {
    // If there is an outstanding draw penalty, player must resolve it or draw
    if (this.drawPenalty > 0) {
      // If +2 or +4 stacking is allowed (optional, but we enforce strict official: no stacking, must draw)
      // We will implement official: must draw if you have drawPenalty.
      return false; 
    }

    // Check if it's the player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== player.id) return false;

    // Wild cards are always playable
    if (card.color === 'wild') return true;

    // Matching color or value
    if (card.color === this.activeColor || card.value === this.activeValue) {
      return true;
    }

    return false;
  }

  playCard(playerId, cardId, wildColor) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error('Card not in hand');

    const card = player.cards[cardIndex];

    if (!this.isValidMove(card, player)) {
      throw new Error('Invalid card placement');
    }

    // Play card
    player.cards.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.lastCardPlayed = card;
    this.activeValue = card.value;

    // Handle Wild color selection
    if (card.color === 'wild') {
      if (!wildColor || !['red', 'blue', 'green', 'yellow'].includes(wildColor)) {
        throw new Error('Must select a valid color for Wild card');
      }
      this.activeColor = wildColor;
    } else {
      this.activeColor = card.color;
    }

    // Clear previous UNO declaration flag if cards count goes up/down
    if (player.cards.length !== 1) {
      delete this.declaredUno[playerId];
    }

    // Handle action cards logic
    let advanceSteps = 1;

    if (card.value === 'skip') {
      advanceSteps = 2; // skip next player
    } else if (card.value === 'reverse') {
      if (this.players.length === 2) {
        advanceSteps = 2; // acts as skip in 2 player game
      } else {
        this.direction *= -1;
      }
    } else if (card.value === 'draw2') {
      this.drawPenalty = 2;
    } else if (card.value === 'wild_draw4') {
      this.drawPenalty = 4;
    }

    // Handle UNO verification BEFORE shifting turn
    if (player.cards.length === 1) {
      this.unoRequired[playerId] = true;
    } else {
      delete this.unoRequired[playerId];
    }

    // Check winner
    if (player.cards.length === 0) {
      this.status = 'gameover';
      this.winner = player;
      return this.getState();
    }

    // Advance turns and resolve draw penalties if any
    for (let i = 0; i < advanceSteps; i++) {
      this.advanceTurn();
    }

    const nextPlayer = this.getCurrentPlayer();
    if (this.drawPenalty > 0) {
      this.applyDrawPenalty(nextPlayer);
      this.drawPenalty = 0;
      this.advanceTurn(); // Skip their turn after drawing penalty
    }

    return this.getState();
  }

  drawCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    // Draw card
    const card = this.popDeckCard();
    player.cards.push(card);

    // Remove uno requirement if drawing card increases size from 1
    if (player.cards.length > 1) {
      delete this.unoRequired[playerId];
      delete this.declaredUno[playerId];
    }

    // Check if card is playable
    const canPlay = this.isValidMove(card, player);

    // If playable, we send immediate play status, else we advance turn
    if (!canPlay) {
      this.advanceTurn();
    }

    return {
      gameState: this.getState(),
      drawnCard: card,
      canPlayImmediate: canPlay
    };
  }

  declareUno(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // A player can only declare UNO if they have <= 2 cards (typically call it right as/before playing their 2nd to last card)
    if (player.cards.length > 2) {
      throw new Error('Cannot declare UNO yet');
    }

    this.declaredUno[playerId] = true;
    return this.getState();
  }

  applyDrawPenalty(player) {
    for (let i = 0; i < this.drawPenalty; i++) {
      player.cards.push(this.popDeckCard());
    }
  }

  popDeckCard() {
    if (this.deck.length === 0) {
      // Re-shuffle discard pile (leaving top card)
      const topCard = this.discardPile.pop();
      this.deck = shuffle(this.discardPile);
      this.discardPile = [topCard];

      if (this.deck.length === 0) {
        throw new Error('No more cards in deck and discard pile is empty');
      }
    }
    return this.deck.pop();
  }

  getState(forPlayerId = null) {
    // Return sanitized state so players don't see other players' card IDs
    return {
      roomCode: this.roomCode,
      status: this.status,
      currentTurn: this.currentTurn,
      direction: this.direction,
      activeColor: this.activeColor,
      activeValue: this.activeValue,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      discardPileTop: this.discardPile[this.discardPile.length - 1] || null,
      drawPileCount: this.deck.length,
      drawPenalty: this.drawPenalty,
      declaredUno: this.declaredUno,
      unoRequired: this.unoRequired,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isReady: p.isReady,
        isHost: p.isHost,
        isDisconnected: p.isDisconnected,
        cardCount: p.cards.length,
        // Only return cards if querying for this specific player
        cards: p.id === forPlayerId ? p.cards : undefined
      }))
    };
  }
}
