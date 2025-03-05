import {
  AbilityExpirations,
  Card,
  Evaluation,
  PlayerTargets,
  TargetSubTypes,
  TargetTypes,
} from "./Cards";
import { generateContent } from "./Descriptions";
export const DECK_LENGTH = 25;
export const MAX_DECK_CYCLES = 3;
export const CARDS_PER_TURN = 3;
export const MANA_PER_TURN = 3;

export function populate(cards: Card[]) {
  return structuredClone(
    cards.map((card) => DeckMap.get(card.id)).filter((c) => c !== undefined),
  );
}

export const Deck: Card[] = [
  {
    id: "Crown",
    content: "Gain 4 mana.",
    cost: 2,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.MANA,
        value: 4,
        immediate: true,
      },
    },
  },
  {
    id: "Ring",
    content: "Gain 1 mana.",
    cost: 0,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.MANA,
        value: 1,
        immediate: true,
      },
    },
  },
  {
    id: "Cloud",
    content:
      "Reduce the value to 0 for the next damage spell your opponent casts this turn.",
    cost: 1,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        prevention: true,
      },
      trigger: {
        type: TargetTypes.DAMAGE,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Shield",
    content:
      "Reduce the value to 1 for all damage spells your opponent casts this turn.",
    cost: 3,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        spellChange: {
          value: 1,
        },
      },
      trigger: {
        type: TargetTypes.DAMAGE,
        targetPlayer: PlayerTargets.OPPONENT,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Diamond",
    content: "Gain 2 mana.",
    cost: 1,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.MANA,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Goblet",
    content: "Gain 3 health.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.HEALTH,
        value: 3,
        immediate: true,
      },
    },
  },
  {
    id: "Helm",
    content:
      "Reduce the value to 0 for damage spells your opponent casts next turn.",
    cost: 3,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        prevention: true,
      },
      trigger: {
        type: TargetTypes.DAMAGE,
      },
      expiration: {
        numActivations: 2,
        type: AbilityExpirations.END_OF_ROUND,
      },
      condition: {
        type: TargetTypes.EXPIRATION,
        eval: Evaluation.EQUAL,
        value: 1,
      },
    },
  },
  {
    id: "Tree",
    content: "Gain 2 health at the end of the next two rounds.",
    cost: 2,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.HEALTH,
        value: 2,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.END_OF_ROUND,
      },
      expiration: {
        numActivations: 3,
        type: AbilityExpirations.END_OF_ROUND,
      },
      condition: {
        type: TargetTypes.EXPIRATION,
        eval: Evaluation.LESS,
        value: 3,
      },
    },
  },
  {
    id: "Spark",
    content: "Deal 2 damage.",
    cost: 1,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Flame",
    content: "Deal 3 damage.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 3,
        immediate: true,
      },
    },
  },
  {
    id: "Blast",
    content: "Deal 4 damage to both players.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.BOTH,
        type: TargetTypes.DAMAGE,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Curse",
    content: "Change opponent's next healing spell to damage themself.",
    cost: 2,
    time: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        spellChange: {
          type: TargetTypes.DAMAGE,
        },
      },
      trigger: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.HEALTH,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Lightning",
    content: "Deal 5 damage.",
    cost: 5,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 5,
        immediate: true,
      },
    },
  },
  {
    id: "Steed",
    content: "Reduce the time by 3 for your next spell this turn.",
    cost: 1,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TIME,
        value: 3,
        prevention: true,
        immediate: true,
      },
    },
  },
  {
    id: "Slow",
    content: "Increase the time of your opponent's left-most spell by 4.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TIME,
        value: 4,
        immediate: true,
      },
    },
  },
  {
    id: "Scroll",
    content: "Your opponent loses 3 mana.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.MANA,
        value: 3,
        prevention: true,
        immediate: true,
      },
    },
  },
  {
    id: "Counter",
    content: "Remove the opponent's left-most spell from the board.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_COUNTER,
        immediate: true,
      },
    },
  },
  {
    id: "Totem",
    content: "Counter the opponent's next spell of mana cost 3 or less.",
    cost: 1,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_COUNTER,
      },
      trigger: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
      condition: {
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_MANA,
        eval: Evaluation.LESS,
        value: 4,
      },
    },
  },
  {
    id: "Ward",
    content: "Counter the opponent's next spell of mana cost 3 or greater.",
    cost: 1,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_COUNTER,
      },
      trigger: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
      condition: {
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_MANA,
        eval: Evaluation.GREATER,
        value: 2,
      },
    },
  },
  {
    id: "Book",
    content: "Draw 2 more cards next turn.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.DRAW,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Quill",
    content: "Convert your next healing spell this turn to a card-draw spell.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        spellChange: {
          targetPlayer: PlayerTargets.SELF,
          type: TargetTypes.DRAW,
        },
      },
      trigger: {
        type: TargetTypes.HEALTH,
        targetPlayer: PlayerTargets.SELF,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
        triggerOnExpiration: false,
      },
    },
  },
  {
    id: "Axe",
    content: "Your opponent draws 3 fewer cards next turn.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DRAW,
        value: 3,
        prevention: true,
        immediate: true,
      },
    },
  },
  {
    id: "Sword",
    content: "Add 2 to the value of your next damage spell this turn.",
    cost: 1,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        value: 2,
      },
      trigger: {
        type: TargetTypes.DAMAGE,
        expiresOnTrigger: true,
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
      },
    },
  },
  {
    id: "Inferno",
    content:
      "After each of your opponent's spells activate this turn, they take 2 damage.",
    cost: 9,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 5,
      },
      trigger: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.NEXT_CARD,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Frost",
    content: "Deal 3 damage.",
    cost: 1,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 3,
        immediate: true,
      },
    },
  },
  {
    id: "Scepter",
    content: "Increase the value by 2 for your next spell this turn.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Wand",
    content: "Increase the value by 1 for your spells this turn.",
    cost: 2,
    time: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        value: 1,
      },
      trigger: {
        type: TargetTypes.SPELL,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Bow",
    content:
      "Deal 1 damage for each spell you cast this turn (including this one).",
    cost: 3,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 1,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.NEXT_CARD,
        targetPlayer: PlayerTargets.SELF,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "River",
    content: "Gain 3 health for each spell your opponent casts this turn.",
    cost: 3,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.HEALTH,
        value: 3,
      },
      trigger: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.NEXT_CARD,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Torch",
    content: "At the end of the next round, draw 3 cards.",
    cost: 3,
    time: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.DRAW,
        value: 3,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 2,
        triggerOnExpiration: true,
      },
    },
  },
  {
    id: "Shatter",
    content: "Decrease the opponent's left-most spell's value to 0.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        immediate: true,
        spellChange: {
          value: 0,
        },
      },
    },
  },
  {
    id: "Alchemy",
    content: "Convert your next mana spell this turn to a card draw spell.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        spellChange: {
          type: TargetTypes.DRAW,
        },
      },
      trigger: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.MANA,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Hex",
    content:
      "Change your opponents damage spells to target themself this turn.",
    cost: 5,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        spellChange: {
          targetPlayer: PlayerTargets.SELF,
        },
      },
      trigger: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Bloom",
    content:
      "Gain 1 health whenever you cast a spell this turn (including this one).",
    cost: 2,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.HEALTH,
        value: 1,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.NEXT_CARD,
        targetPlayer: PlayerTargets.SELF,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Crypt",
    content:
      "Deal 2 damage to your opponent at the end of the next three rounds.",
    cost: 5,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 2,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.END_OF_ROUND,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 4,
      },
      condition: {
        type: TargetTypes.EXPIRATION,
        eval: Evaluation.LESS,
        value: 4,
      },
    },
  },
  {
    id: "Sun",
    content: "Deal 2 damage to your opponent at the end of the next 12 rounds.",
    cost: 15,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 3,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.END_OF_ROUND,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 8,
      },
    },
  },
  {
    id: "Oct",
    content: "You opponent loses 1 mana for the next 8 rounds.",
    cost: 8,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.MANA,
        prevention: true,
        value: 1,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.END_OF_ROUND,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 8,
      },
    },
  },
  {
    id: "Land",
    content: "Gain 2 mana for the 10 rounds.",
    cost: 10,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.MANA,
        value: 2,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.END_OF_ROUND,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 10,
      },
    },
  },
  {
    id: "Well",
    content: "Gain 2 mana at the end of the next two rounds.",
    cost: 2,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.MANA,
        value: 2,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.END_OF_ROUND,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 3,
      },
      condition: {
        type: TargetTypes.EXPIRATION,
        eval: Evaluation.LESS,
        value: 3,
      },
    },
  },
  {
    id: "Moon",
    content:
      "Counter all spells your opponent plays that have lower than 3 time this turn",
    cost: 4,
    time: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_COUNTER,
      },
      trigger: {
        type: TargetTypes.SPELL,
        targetPlayer: PlayerTargets.OPPONENT,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
      condition: {
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TIME,
        eval: Evaluation.LESS,
        value: 3,
      },
    },
  },
  {
    id: "Harp",
    content: "Add 1 to the value of your healing spells this turn.",
    cost: 2,
    time: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        value: 1,
      },
      trigger: {
        type: TargetTypes.HEALTH,
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
      },
    },
  },
  {
    id: "Blood",
    content: "Change your healing spells to damage spells this turn.",
    cost: 3,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_TYPE,
        spellChange: {
          targetPlayer: PlayerTargets.OPPONENT,
          type: TargetTypes.DAMAGE,
        },
      },
      trigger: {
        type: TargetTypes.HEALTH,
        targetPlayer: PlayerTargets.SELF,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
];

function shuffle(array: any[]) {
  // Create a copy of the array to avoid mutating the original
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at indices i and j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function newDeck(cardsInHand: string[] = [], deck: string[]) {
  return shuffle([...deck.filter((cId) => !cardsInHand.includes(cId))]);
}

export const BOT_DECK = [
  "Tree",
  "Flame",
  "Harp",
  "Blast",
  "Book",
  "Steed",
  "Well",
  "Spark",
  "Crown",
  "Ring",
  "Diamond",
  "Cloud",
  "Scepter",
  "Wand",
  "Counter",
  "Torch",
  "Bow",
  "Bloom",
  "Crypt",
  "Blood",
  "Hex",
  "Alchemy",
  "Frost",
  "Sword",
  "Goblet",
];

export const AGGRO_DECK = [
  "Tree",
  "Flame",
  "Harp",
  "Blast",
  "Book",
  "Steed",
  "Well",
  "Spark",
  "Crown",
  "Ring",
  "Diamond",
  "Cloud",
  "Scepter",
  "Wand",
  "Counter",
  "Torch",
  "Bow",
  "Bloom",
  "Crypt",
  "Blood",
  "Hex",
  "Alchemy",
  "Frost",
  "Sword",
  "Goblet",
];

Deck.forEach((c) => {
  c.content = generateContent(c.ability);
  c.changedBy = [];
  c.changedContent = "";
});

export const DeckMap = new Map<string, Card>(Deck.map((c) => [c.id, c]));
