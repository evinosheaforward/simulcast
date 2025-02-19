export const CARDS_PER_TURN = 3;
export const MANA_PER_TURN = 3;

export enum TargetTypes {
  HEALTH = "HEALTH",
  DAMAGE = "DAMAGE",
  DRAW = "DRAW",
  MANA = "MANA",
  SPELL = "SPELL",
  // Trigger at expiration event
  EXPIRATION = "EXPIRATION",
}

export enum TargetSubTypes {
  SPELL_TIME = "SPELL_SPEED",
  SPELL_MANA = "SPELL_MANA",
  SPELL_COUNTER = "SPELL_COUNTER",
}

export enum AbilityExpirations {
  END_OF_ROUND = "END_OF_ROUND",
  NEXT_CARD = "NEXT_CARD",
}

export enum PlayerTargets {
  SELF = "SELF",
  OPPONENT = "OPPONENT",
}

export enum Evaluation {
  LESS = "LESS",
  EQUAL = "EQUAL",
  GREATER = "GREATER",
}

export interface Condition {
  // expiration is for things like "next turn"
  type: TargetTypes | "expiration";
  subtype?: TargetSubTypes;
  eval: Evaluation;
  value?: number;
}

export interface Ability {
  effect: {
    targetPlayer: PlayerTargets;
    type: TargetTypes;
    subtype?: TargetSubTypes;
    // used to make value negative
    prevention?: boolean;
    value?: number;
    immediate?: boolean;
  };
  // when triggered, what condition to resolve
  trigger?: {
    type?: TargetTypes;
    targetPlayer?: PlayerTargets;
    subtype?: TargetSubTypes | AbilityExpirations;
    expiresOnTrigger?: boolean;
  };
  expiration?: {
    type: AbilityExpirations;
    // Trigger when the numActivations = 0
    triggerOnExpiration?: boolean;
    numActivations: number;
  };
  condition?: Condition;
}

export type Card = {
  id: string;
  content: string;
  cost: number;
  time: number;
  ability: Ability;
  timer?: number;
};

export interface ActiveAbility {
  player: string;
  card: Card;
}

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
    content: "Reduce the value to 0 of the next damage spell your casts this turn.",
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
    content: "Reduce the damage value by 1 for spells your opponent casts this turn.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        prevention: true,
        value: 1,
      },
      trigger: {
        type: TargetTypes.DAMAGE,
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
    content: "Gain 2 health.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.HEALTH,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Helm",
    content: "Reduce the damage to 0 of spells your opponent casts next turn.",
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
    content: "Deal 1 damage.",
    cost: 1,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 1,
        immediate: true,
      },
    },
  },
  {
    id: "Flame",
    content: "Deal 3 damage.",
    cost: 3,
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
    id: "Steed",
    content:
      "Reduce the time of your next spell by 3",
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
    id: "Scroll",
    content: "Your opponent loses 2 mana.",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.MANA,
        value: 2,
        prevention: true,
        immediate: true,
      },
    },
  },
  {
    id: "Counter",
    content: "Remove the opponent's left-most spell from the board.",
    cost: 2,
    time: 1,
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
    id: "Book",
    content: "Draw 2 more cards next turn",
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
    content: "Draw 1 more cards next turn",
    cost: 2,
    time: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.DRAW,
        value: 1,
        immediate: true,
      },
    },
  },
  {
    id: "Axe",
    content: "Your opponent draws 1 fewer cards next turn",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DRAW,
        value: 1,
        immediate: true,
      },
    },
  },
  {
    id: "Sword",
    content: "Add 2 to the value of your next damage spell this turn",
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
    content: "After each of your opponent's spells activate this turn, they take 2 damage.",
    cost: 6,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        type: TargetTypes.DAMAGE,
        value: 2,
      },
      trigger: {
        type: TargetTypes.EXPIRATION,
        subtype: AbilityExpirations.NEXT_CARD,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      }
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
    content: "Increase the power of your next spell by 2.",
    cost: 2,
    time: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        value: 2,
        immediate: true
      },
    },
  },
  {
    id: "Wand",
    content: "Increase the power of your spells this turn by 1.",
    cost: 1,
    time: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        type: TargetTypes.SPELL,
        value: 1,
      },
      trigger: {
        type: TargetTypes.SPELL,
        expiresOnTrigger: true,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Bow",
    content: "Deal 1 damage for each spell you cast this turn.",
    cost: 2,
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
      }
    },
  }
];

export const DeckMap = new Map<string, Card>(Deck.map((c) => [c.id, c]));
export function NewDeck(cardsInHand: string[] = []) {
  return [...Deck.map((c) => c.id).filter((cId) => !cardsInHand.includes(cId))];
}
