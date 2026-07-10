export const COLORS = ['red', 'blue', 'green', 'yellow'];
export const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
export const WILD_VALUES = ['wild', 'wild_draw4'];

export function createDeck() {
  const deck = [];
  let idCounter = 0;

  // Add colored cards
  for (const color of COLORS) {
    // There is one '0' card per color
    deck.push({
      id: `${color}-0-${idCounter++}`,
      color,
      value: '0',
      type: 'number'
    });

    // There are two of each '1'-'9', skip, reverse, draw2 per color
    for (const val of VALUES.slice(1)) {
      let cardType = 'number';
      if (val === 'skip' || val === 'reverse') cardType = 'action';
      if (val === 'draw2') cardType = 'draw';

      deck.push({
        id: `${color}-${val}-${idCounter++}`,
        color,
        value: val,
        type: cardType
      });
      deck.push({
        id: `${color}-${val}-${idCounter++}`,
        color,
        value: val,
        type: cardType
      });
    }
  }

  // Add wild cards (4 of each)
  for (const wildVal of WILD_VALUES) {
    const cardType = wildVal === 'wild' ? 'wild' : 'wild_draw4';
    for (let i = 0; i < 4; i++) {
      deck.push({
        id: `wild-${wildVal}-${idCounter++}`,
        color: 'wild',
        value: wildVal,
        type: cardType
      });
    }
  }

  return deck;
}

export function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
