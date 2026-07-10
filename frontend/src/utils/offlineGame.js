import { COLORS, VALUES, WILD_VALUES } from '../../../backend/src/game/deck.js';

// Simple deck creation for frontend
function createOfflineDeck() {
  const deck = [];
  let idCounter = 0;

  for (const color of COLORS) {
    deck.push({ id: `${color}-0-${idCounter++}`, color, value: '0', type: 'number' });

    for (const val of VALUES.slice(1)) {
      let cardType = 'number';
      if (val === 'skip' || val === 'reverse') cardType = 'action';
      if (val === 'draw2') cardType = 'draw';

      deck.push({ id: `${color}-${val}-${idCounter++}`, color, value: val, type: cardType });
      deck.push({ id: `${color}-${val}-${idCounter++}`, color, value: val, type: cardType });
    }
  }

  for (const wildVal of WILD_VALUES) {
    const cardType = wildVal === 'wild' ? 'wild' : 'wild_draw4';
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `wild-${wildVal}-${idCounter++}`, color: 'wild', value: wildVal, type: cardType });
    }
  }

  return deck;
}

function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class OfflineUnoGame {
  constructor(playerCount) {
    this.playerCount = playerCount;
    this.status = 'playing';
    
    // Players setup (Index 0 is Human, others are bots)
    this.players = [
      { id: 'human', name: 'You', avatar: '🦊', cards: [], isBot: false, isHost: true, isReady: true, isDisconnected: false },
    ];

    const botAvatars = ['🤖', '💻', '🦾', '🧠'];
    const botNames = ['Smart Bot A', 'Challenger Bot B', 'Grandmaster Bot C'];

    for (let i = 1; i < playerCount; i++) {
      this.players.push({
        id: `bot-${i}`,
        name: botNames[i - 1] || `Bot ${i}`,
        avatar: botAvatars[i - 1] || '🤖',
        cards: [],
        isBot: true,
        isHost: false,
        isReady: true,
        isDisconnected: false
      });
    }

    this.deck = shuffle(createOfflineDeck());
    this.discardPile = [];
    this.currentTurn = 0;
    this.direction = 1;
    this.activeColor = null;
    this.activeValue = null;
    this.winner = null;
    this.drawPenalty = 0;
    this.declaredUno = {};
    this.unoRequired = {};

    this.initGame();
  }

  initGame() {
    // Deal 7 cards
    for (const player of this.players) {
      for (let i = 0; i < 7; i++) {
        player.cards.push(this.deck.pop());
      }
    }

    // Flip starting card
    let startCard = this.deck.pop();
    while (startCard.value === 'wild_draw4' || startCard.color === 'wild') {
      this.deck.unshift(startCard);
      this.deck = shuffle(this.deck);
      startCard = this.deck.pop();
    }

    this.discardPile.push(startCard);
    this.activeColor = startCard.color;
    this.activeValue = startCard.value;

    // Apply starting actions
    if (startCard.value === 'skip') {
      this.advanceTurn();
    } else if (startCard.value === 'reverse') {
      if (this.players.length === 2) {
        this.advanceTurn();
      } else {
        this.direction = -1;
        this.currentTurn = this.players.length - 1;
      }
    } else if (startCard.value === 'draw2') {
      this.drawPenalty = 2;
      this.applyDrawPenalty(this.players[this.currentTurn]);
      this.drawPenalty = 0;
      this.advanceTurn();
    }
  }

  getCurrentPlayer() {
    return this.players[this.currentTurn];
  }

  advanceTurn() {
    this.currentTurn = (this.currentTurn + this.direction + this.players.length) % this.players.length;
  }

  isValidMove(card, player) {
    if (this.drawPenalty > 0) return false;
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== player.id) return false;

    if (card.color === 'wild') return true;
    return card.color === this.activeColor || card.value === this.activeValue;
  }

  playCard(playerId, cardId, wildColor) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.cards[cardIndex];
    if (!this.isValidMove(card, player)) return;

    player.cards.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.activeValue = card.value;

    if (card.color === 'wild') {
      this.activeColor = wildColor;
    } else {
      this.activeColor = card.color;
    }

    if (player.cards.length !== 1) {
      delete this.declaredUno[playerId];
    }

    let advanceSteps = 1;
    if (card.value === 'skip') {
      advanceSteps = 2;
    } else if (card.value === 'reverse') {
      if (this.players.length === 2) {
        advanceSteps = 2;
      } else {
        this.direction *= -1;
      }
    } else if (card.value === 'draw2') {
      this.drawPenalty = 2;
    } else if (card.value === 'wild_draw4') {
      this.drawPenalty = 4;
    }

    if (player.cards.length === 1) {
      this.unoRequired[playerId] = true;
    } else {
      delete this.unoRequired[playerId];
    }

    if (player.cards.length === 0) {
      this.status = 'gameover';
      this.winner = player;
      return;
    }

    for (let i = 0; i < advanceSteps; i++) {
      this.advanceTurn();
    }

    const nextPlayer = this.getCurrentPlayer();
    if (this.drawPenalty > 0) {
      this.applyDrawPenalty(nextPlayer);
      this.drawPenalty = 0;
      this.advanceTurn();
    }
  }

  drawCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    const card = this.popDeckCard();
    player.cards.push(card);

    if (player.cards.length > 1) {
      delete this.unoRequired[playerId];
      delete this.declaredUno[playerId];
    }

    const canPlay = this.isValidMove(card, player);
    if (!canPlay) {
      this.advanceTurn();
    }

    return { card, canPlay };
  }

  declareUno(playerId) {
    this.declaredUno[playerId] = true;
  }

  applyDrawPenalty(player) {
    for (let i = 0; i < this.drawPenalty; i++) {
      player.cards.push(this.popDeckCard());
    }
  }

  popDeckCard() {
    if (this.deck.length === 0) {
      const topCard = this.discardPile.pop();
      this.deck = shuffle(this.discardPile);
      this.discardPile = [topCard];
    }
    return this.deck.pop();
  }

  // SMART BOT AI PLAY LOOP DECISION
  getBotDecision(botPlayer) {
    const playableCards = botPlayer.cards.filter(c => this.isValidMove(c, botPlayer));
    
    if (playableCards.length === 0) {
      return { action: 'draw' };
    }

    // Determine target player (the player next in turn)
    const nextPlayerIndex = (this.currentTurn + this.direction + this.players.length) % this.players.length;
    const targetPlayer = this.players[nextPlayerIndex];
    const targetCardsCount = targetPlayer.cards.length;

    // Smart strategy: If opponent is close to winning, play aggressive cards (skips, draws)
    let chosenCard = null;
    const aggressiveCards = playableCards.filter(c => ['skip', 'reverse', 'draw2', 'wild_draw4'].includes(c.value));
    
    if (targetCardsCount <= 2 && aggressiveCards.length > 0) {
      // Prioritize draws and skips to block the winning opponent
      chosenCard = aggressiveCards.find(c => c.value === 'wild_draw4') || 
                   aggressiveCards.find(c => c.value === 'draw2') || 
                   aggressiveCards.find(c => c.value === 'skip') ||
                   aggressiveCards[0];
    } else {
      // Standard Play: Prioritize colored number cards matching the color or value to preserve wild cards
      const normalCards = playableCards.filter(c => c.color !== 'wild');
      if (normalCards.length > 0) {
        // Play the color the bot has the most of
        const colorCounts = {};
        botPlayer.cards.forEach(c => {
          if (c.color !== 'wild') {
            colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
          }
        });
        
        normalCards.sort((a, b) => (colorCounts[b.color] || 0) - (colorCounts[a.color] || 0));
        chosenCard = normalCards[0];
      } else {
        // Fallback to wild cards
        chosenCard = playableCards[0];
      }
    }

    // If wild card, pick the color bot has the most of
    let selectedWildColor = null;
    if (chosenCard.color === 'wild') {
      const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
      botPlayer.cards.forEach(c => {
        if (c.color !== 'wild') colorCounts[c.color]++;
      });
      // Pick the max color
      selectedWildColor = Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
    }

    return { action: 'play', card: chosenCard, wildColor: selectedWildColor };
  }

  getState(forPlayerId = null) {
    return {
      roomCode: 'OFFLINE',
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
      isOffline: true,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isReady: p.isReady,
        isHost: p.isHost,
        isDisconnected: p.isDisconnected,
        cardCount: p.cards.length,
        isBot: p.isBot,
        // Only return cards to human player index
        cards: (p.id === 'human' || p.id === forPlayerId) ? p.cards : undefined
      }))
    };
  }
}
