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

interface Condition {
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

interface ActiveAbility {
  player: string;
  ability: Ability;
}

export class AbilityQueue {
  abilities: ActiveAbility[] = [];

  add(ability: Ability, player: string) {
    this.abilities.push({ ability: ability, player: player } as ActiveAbility);
  }

  playerAbilites(player: string) {
    return this.abilities.filter((ability) => ability.player === player);
  }

  triggeredAbilites(card: Card, activePlayer: string) {
    let i = 0;
    const triggers = [];
    while (i < this.abilities.length) {
      if (triggerMatches(card, activePlayer, this.abilities[i])) {
        if (this.abilities[i].ability.trigger?.expiresOnTrigger) {
          triggers.push(this.abilities.splice(i, 1)[0]);
        } else {
          triggers.push(this.abilities[i]);
          i++;
        }
      } else {
        i++;
      }
    }
    return triggers;
  }

  expireAbilities(expiration: AbilityExpirations, activePlayer: string) {
    let i = 0;
    const triggers = [];
    let currentTrigger: Ability;
    let owningPlayer: string;
    while (i < this.abilities.length) {
      currentTrigger = this.abilities[i].ability;
      owningPlayer = this.abilities[i].player;
      console.log(
        `expireAbilities: ${expiration.toString()} - ${JSON.stringify(currentTrigger)}`,
      );
      if (
        currentTrigger.expiration!.type === expiration &&
        evalExpiration(
          expiration,
          owningPlayer,
          activePlayer,
          currentTrigger.effect.targetPlayer,
        )
      ) {
        currentTrigger.expiration!.numActivations -= 1;
        if (currentTrigger.expiration!.numActivations < 1) {
          console.log("should expire ability");
          if (currentTrigger.expiration?.triggerOnExpiration) {
            triggers.push(this.abilities.splice(i, 1)[0]);
          } else {
            this.abilities.splice(i, 1);
            i++;
          }
        }
      } else {
        i++;
      }
    }
    console.log(
      `Triggered on expiration: ${expiration.toString()}:\n${JSON.stringify(triggers)}`,
    );
    return triggers;
  }
}

export function evalExpiration(
  expiration: AbilityExpirations,
  owningPlayer: string,
  activePlayer: string,
  targetPlayer: PlayerTargets,
) {
  if (expiration !== AbilityExpirations.NEXT_CARD) {
    return true;
  } else if (targetPlayer === PlayerTargets.SELF) {
    return owningPlayer == activePlayer;
  } else if (targetPlayer === PlayerTargets.OPPONENT) {
    return owningPlayer != activePlayer;
  } else {
    console.log("evalExpiration reached IMPOSSIBLE conclusion");
    return false;
  }
}

export function triggerMatches(
  card: Card,
  activePlayer: string,
  currentTrigger: ActiveAbility,
) {
  if (
    // player matches
    ((currentTrigger.ability.effect.targetPlayer === PlayerTargets.SELF &&
      currentTrigger.player === activePlayer) ||
      (currentTrigger.ability.effect.targetPlayer === PlayerTargets.OPPONENT &&
        currentTrigger.player !== activePlayer)) &&
    // trigger matches
    currentTrigger.ability.trigger?.target === card.ability.effect.target &&
    (!currentTrigger.ability.trigger?.subtype ||
      currentTrigger.ability.trigger.subtype === card.ability.effect.subtype) &&
    // condition matches, if there is one
    (!currentTrigger.ability.condition ||
      evalCondition(currentTrigger.ability.condition!, card))
  ) {
    return true;
  }
  return false;
}

function evalCondition(condition: Condition, card: Card) {
  let target: number;
  switch (condition.target) {
    case TargetTypes.SPELL:
      switch (condition.subtype) {
        case TargetSubTypes.SPELL_SPEED:
          target = card.timer!;
        case TargetSubTypes.SPELL_MANA:
          target = card.cost;
        default:
          target = card.ability.effect.value!;
          break;
      }
      break;
    case TargetTypes.EXPIRATION:
      target = card.ability.expiration!.numActivations;
      break;
    default:
      target = card.ability.effect.value!;
      break;
  }

  switch (condition.eval) {
    case Evaluation.EQUAL:
      return target === condition.value!;
    case Evaluation.GREATER:
      return target > condition.value!;
    case Evaluation.LESS:
      return target < condition.value!;
  }
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
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
        triggerOnExpiration: true,
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
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
        triggerOnExpiration: true,
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
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
        triggerOnExpiration: true,
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
    content: "Deal 5 damage.",
    cost: 3,
    speed: 3,
    ability: {
      effect: {
        targetPlayer: PlayerTargets.OPPONENT,
        target: TargetTypes.DAMAGE,
        value: 5,
        immediate: true,
      },
    },
  },
  {
    id: "Horse",
    content: "Reduce the speed of your next spell by 2",
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
      },
      expiration: {
        numActivations: 1,
        type: AbilityExpirations.END_OF_ROUND,
        triggerOnExpiration: true,
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
];

export const DeckMap = new Map<string, Card>(Deck.map((c) => [c.id, c]));

export default Deck;
