export enum TargetTypes {
  HEALTH = "HEALTH",
  DAMAGE = "DAMAGE",
  DRAW = "DRAW",
  MANA = "MANA",
  SPELL = "SPELL",
  EXPIRATION = "EXPIRATION",
}

export enum TargetSubTypes {
  SPELL_SPEED = "SPELL_SPEED",
  SPELL_MANA = "SPELL_MANA",
  PREVENTION = "PREVENTION",
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
  target: TargetTypes | "expiration";
  subtype?: TargetSubTypes;
  eval: Evaluation;
  value?: number;
}

export interface Ability {
  effect: {
    targetPlayer: PlayerTargets;
    target: TargetTypes;
    subtype?: TargetSubTypes;
    value?: number;
    immediate?: boolean;
  };
  // when triggered, what condition to resolve
  trigger?: {
    target?: TargetTypes;
    subtype?: TargetSubTypes;
    expiresOnTrigger?: boolean;
  };
  expiration?: {
    type: AbilityExpirations;
    triggerOnExpiration?: boolean;
    numActivations: number;
  };
  condition?: Condition;
}

export type Card = {
  id: string;
  content: string;
  cost: number;
  speed: number;
  ability: Ability;
  timer?: number;
};

export interface ActiveAbility {
  player: string;
  ability: Ability;
}

export function populate(cards: Card[]) {
  return structuredClone(
    cards.map((card) => DeckMap.get(card.id)).filter((c) => c !== undefined),
  );
}

/** Utility: Draw a hand (abstract implementation) */
export function drawHand(delta: number = 0): Card[] {
  // Min CARD DRAW is 1
  return getRandomElements(Deck, Math.max(4 + delta, 1));
}

const getRandomElements = (array: any[], n: number) => {
  if (n > array.length) return array;
  const result = [];
  const tempArray = [...array];

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * tempArray.length);
    result.push(tempArray[randomIndex]);
    tempArray.splice(randomIndex, 1); // Remove the selected element
  }
  return structuredClone(result);
};

export const Deck: Card[] = [
  {
    id: "Crown",
    content: "Gain 3 mana next turn.",
    cost: 2,
    speed: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.MANA,
        value: 3,
        immediate: true,
      },
    },
  },
  {
    id: "Ring",
    content: "Gain 1 mana next turn.",
    cost: 1,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.MANA,
        value: 1,
        immediate: true,
      },
    },
  },
  {
    id: "Cloud",
    content: "Prevent the next damage you would take this turn.",
    cost: 1,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.DAMAGE,
        subtype: TargetSubTypes.PREVENTION,
      },
      expiration: {
        type: AbilityExpirations.END_OF_ROUND,
        numActivations: 1,
      },
    },
  },
  {
    id: "Diamond",
    content: "Gain 2 mana next turn.",
    cost: 0,
    speed: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.MANA,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Goblet",
    content: "Gain 2 health.",
    cost: 2,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.HEALTH,
        value: 3,
        immediate: true,
      },
    },
  },
  {
    id: "Helm",
    content: "Gain prevent all damage next turn.",
    cost: 2,
    speed: 4,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.DAMAGE,
      },
      trigger: {
        target: TargetTypes.DAMAGE,
      },
      expiration: {
        numActivations: 2,
        type: AbilityExpirations.END_OF_ROUND,
      },
      condition: {
        target: TargetTypes.EXPIRATION,
        eval: Evaluation.EQUAL,
        value: 1,
      },
    },
  },
  {
    id: "Spark",
    content: "Deal 2 damage.",
    cost: 1,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.DAMAGE,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Flame",
    content: "Deal 4 damage.",
    cost: 3,
    speed: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.DAMAGE,
        value: 4,
        immediate: true,
      },
    },
  },
  {
    id: "Horse",
    content: "Reduce the speed of your next spell by 3",
    cost: 1,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.SPELL,
        subtype: TargetSubTypes.SPELL_SPEED,
        value: -2,
        immediate: true,
      },
    },
  },
  {
    id: "Scroll",
    content: "Your opponent loses 2 mana next turn.",
    cost: 2,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.MANA,
        value: -2,
        immediate: true,
      },
    },
  },
  {
    id: "Counter",
    content: "Counter the opponent's next spell",
    cost: 2,
    speed: 1,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.SPELL,
        subtype: TargetSubTypes.PREVENTION,
      },
      trigger: {
        target: TargetTypes.SPELL,
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.NEXT_CARD,
      },
    },
  },
  {
    id: "Book",
    content: "Draw 2 more cards next turn",
    cost: 2,
    speed: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.DRAW,
        value: 2,
        immediate: true,
      },
    },
  },
  {
    id: "Axe",
    content: "Your opponent draws 1 fewer cards next turn",
    cost: 2,
    speed: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.DRAW,
        value: 1,
        immediate: true,
      },
    },
  },
  {
    id: "Sword",
    content: "Add 2 damage to your next damage spell this turn",
    cost: 1,
    speed: 2,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.SELF,
        target: TargetTypes.SPELL,
        value: 2,
        immediate: true,
      },
      trigger: {
        target: TargetTypes.DAMAGE,
        expiresOnTrigger: true,
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
      },
    },
  },
];

export const DeckMap = new Map<string, Card>(Deck.map((c) => [c.id, c]));

export default Deck;
