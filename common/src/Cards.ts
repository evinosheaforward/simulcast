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
  SPELL_TIME = "SPELL_TIME",
  SPELL_MANA = "SPELL_MANA",
  SPELL_COUNTER = "SPELL_COUNTER",
  SPELL_TYPE = "SPELL_TYPE",
}

export enum AbilityExpirations {
  END_OF_ROUND = "END_OF_ROUND",
  NEXT_CARD = "NEXT_CARD",
}

export enum PlayerTargets {
  SELF = "SELF",
  OPPONENT = "OPPONENT",
  BOTH = "BOTH",
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

export interface Effect {
  targetPlayer: PlayerTargets;
  type: TargetTypes;
  subtype?: TargetSubTypes;
  // used to make value negative
  prevention?: boolean;
  value?: number;
  spellChange?: {
    targetPlayer?: PlayerTargets;
    type?: TargetTypes;
    value?: number;
  };
  immediate?: boolean;
}

export interface Trigger {
  type?: TargetTypes;
  // trigger target player is about who _owns_ the spell, not who the spell targets
  targetPlayer?: PlayerTargets;
  subtype?: TargetSubTypes | AbilityExpirations;
  expiresOnTrigger?: boolean;
}

export interface Expiration {
  type: AbilityExpirations;
  // Trigger when the numActivations = -1
  triggerOnExpiration?: boolean;
  numActivations: number;
}

export interface Ability {
  effect: Effect;
  // when triggered, what condition to resolve
  trigger?: Trigger;
  expiration?: Expiration;
  condition?: Condition;
}

export type Card = {
  id: string;
  content: string;
  changedContent?: string;
  changedBy?: string[];
  cost: number;
  time: number;
  ability: Ability;
  timer?: number | null;
};

export interface ActiveAbility {
  player: string;
  card: Card;
}
