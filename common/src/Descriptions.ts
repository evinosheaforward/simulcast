import {
  Ability,
  AbilityExpirations,
  Condition,
  Effect,
  Evaluation,
  Expiration,
  PlayerTargets,
  TargetSubTypes,
  TargetTypes,
  Trigger,
} from "./Cards";

// Mapping for immediate effects: the verb to use for normal vs. prevention cases.
const immediateVerbs: Record<string, { normal: string; prevention: string }> = {
  MANA: { normal: "gain", prevention: "loses" },
  HEALTH: { normal: "gain", prevention: "lose" },
  DAMAGE: { normal: "deal", prevention: "reduce damage by" },
  DRAW: { normal: "draw", prevention: "draws" },
  SPELL: { normal: "increase", prevention: "decrease" },
};

const typeVerbWords: Record<string, string> = {
  MANA:  "mana",
  HEALTH:  "health",
  DAMAGE:  "damage",
  DRAW:  "cards", 
  SPELL:  "spell", 
  EXPIRATION: "turn",
};

// Mapping for effect type words.
const typeWords: Record<string, string> = {
  MANA: "mana",
  HEALTH: "healing",
  DAMAGE: "damage",
  DRAW: "card draw",
  SPELL: "next",
  EXPIRATION: "turn",
};

const spellSubtypeWords: Record<
  string,
  { noun: string; verb: string; prevention: string }
> = {
  SPELL_TYPE: { noun: "type", verb: "change", prevention: "" },
  SPELL_TIME: { noun: "time", verb: "increase", prevention: "decrease" },
  SPELL_MANA: { noun: "mana cost", verb: "increase", prevention: "decrease" },
  SPELL_COUNTER: { noun: "counter", verb: "remove", prevention: "remove" },
};

const preventionDescriptions: Record<string, string> = {
  DAMAGE: "reduce the value to 0 for",
  DRAW: "prevent",
  MANA: "remove all",
  HEALTH: "remove all",
  SPELL: "counter",
};

function getPlayerTargetString(targetPlayer: PlayerTargets): string {
  return targetPlayer === PlayerTargets.OPPONENT ? "your opponent's" : "your";
}

export function generateSpellModificationString(
  effect: Effect,
  trigger: Trigger | undefined,
  durationStr: string,
): string {
  const targetStr = getPlayerTargetString(effect.targetPlayer);
  const spellTypeStr = trigger?.type ? ` ${typeWords[trigger.type]}` : "";

  // Handle spell type changes
  if (effect.subtype === TargetSubTypes.SPELL_TYPE) {
    if (effect.spellChange) {
      const spellType = trigger?.type ? typeWords[trigger.type] : "next";
      const untilStr = trigger?.expiresOnTrigger || !trigger
        ? "next"
        : `until ${durationStr}`;

      if (effect.spellChange.type) {
        return `change ${targetStr} ${untilStr} ${spellType} spell to a ${typeWords[effect.spellChange.type]} spell.`;
      }

      const targetChange =
        effect.spellChange.targetPlayer === PlayerTargets.SELF
          ? "themselves"
          : effect.spellChange.targetPlayer === PlayerTargets.OPPONENT
            ? "you"
            : "";
      if (targetChange) {
        return `change ${targetStr} ${spellType} spells to target ${targetChange} ${durationStr}.`;
      }

      if (effect.spellChange.value !== undefined) {
        return `change the value of ${targetStr} ${spellType} spell to ${effect.spellChange.value}.`;
      }
    }
  }

  // Handle other spell modifications
  const actionVerb = effect.prevention ? "reduce" : "increase";
  const subtypeNoun = effect.subtype
    ? spellSubtypeWords[effect.subtype].noun
    : "value";
  const whenStr = trigger?.expiresOnTrigger || !trigger ? "next" : `until ${durationStr}`;

  return `${actionVerb} the ${subtypeNoun} of ${targetStr} ${whenStr}${spellTypeStr} spell by ${effect.value}.`;
}

function getTimingString(
  expiration: Expiration | undefined,
  trigger: Trigger | undefined,
  condition: Condition | undefined,
): string {
  if (!expiration) return "";

  if (trigger?.expiresOnTrigger) {
    return ""; // We'll handle this in the main text
  }

  if (condition?.type === TargetTypes.EXPIRATION) {
    if (condition.eval === Evaluation.EQUAL && condition.value === 1) {
      return "next turn";
    }
    if (condition.eval === Evaluation.LESS) {
      const rounds = condition.value || 0;
      if (rounds > 2) {
        return `in ${rounds - 1} rounds`;
      }
      return "next turn";
    }
  }

  if (expiration.triggerOnExpiration) {
    const roundsToWait = expiration.numActivations - 1;
    if (roundsToWait === 1) {
      return `at the end of next turn`;
    }
    return `in ${roundsToWait} rounds`;
  }

  return "this turn";
}

export function generateContent(ability: Ability): string {
  const content = generateContentString(ability)
  return content.split(". ").map((x) => x[0].toUpperCase() + x.substring(1)).join(". ")
}

export function generateContentString(ability: Ability): string {
  const { effect, trigger, expiration, condition } = ability;

  if (expiration?.triggerOnExpiration && !trigger) {
    const value = effect.value || 0;
    const verb = immediateVerbs[effect.type]?.normal.toLowerCase();
    const type =
      effect.type === TargetTypes.DRAW ? "cards" : typeWords[effect.type];

    // Get timing based on expiration type
    let timingStr;
    if (expiration.type === AbilityExpirations.END_OF_ROUND) {
      const rounds = expiration.numActivations - 1;
      if (rounds === 0) {
        timingStr = "at the end of this round";
      } else if (rounds === 1) {
        timingStr = "at the end of next round";
      } else {
        timingStr = `After the next ${rounds} rounds`;
      }
    } else if (expiration.type === AbilityExpirations.NEXT_CARD) {
      const cards = expiration.numActivations;
      const playerStr =
        effect.targetPlayer === PlayerTargets.OPPONENT
          ? "your opponent plays their"
          : "you play your";
      if (cards === 1) {
        timingStr = `when ${playerStr} next card`;
      } else {
        timingStr = `after ${playerStr} next ${cards} cards`;
      }
    }
    return `${timingStr}, ${verb} ${value} ${type}.`;
  }

  // Handle immediate effects
  if (effect.immediate) {
    const verb = effect.prevention
      ? immediateVerbs[effect.type]?.prevention
      : immediateVerbs[effect.type]?.normal;

    if (effect.type === TargetTypes.SPELL) {
      if (effect.subtype === TargetSubTypes.SPELL_COUNTER) {
        return "remove the opponent's left-most spell from the board.";
      }
      return generateSpellModificationString(effect, trigger, "");
    }

    // Handle prevention with no value (reduce to 0)
    if (effect.prevention && effect.value === undefined) {
      return `${preventionDescriptions[effect.type]} ${getPlayerTargetString(effect.targetPlayer)} next ${typeWords[effect.type]}.`;
    }

    if (effect.prevention && effect.type === TargetTypes.DRAW) {
      return `your opponent draws ${effect.value} fewer cards next turn.`;
    }

    const value = effect.prevention
      ? -1 * (effect.value || 0)
      : effect.value || 0;
    const type = typeVerbWords[effect.type];
    if (effect.targetPlayer === PlayerTargets.SELF) {
      return `${verb} ${Math.abs(value)} ${type}.`;
    } else {
      return `Your opponent ${verb} ${Math.abs(value)} ${type}.`;
    }
  }

  // Handle spell modifications
  if (effect.type === TargetTypes.SPELL) {
    const targetStr = getPlayerTargetString(
      trigger?.targetPlayer || effect.targetPlayer,
    );
    const actionVerb = effect.prevention ? "reduce" : "increase";
    const subtypeNoun = effect.subtype
      ? spellSubtypeWords[effect.subtype].noun
      : "value";
    const whenStr = trigger?.expiresOnTrigger ? "next" : "";
    const spellTypeStr = trigger?.type ? ` ${typeWords[trigger.type]}` : "";
    const durationStr = getTimingString(expiration, trigger, condition);

    // Handle condition-based countering (Moon case)
    if (
      effect.subtype === TargetSubTypes.SPELL_COUNTER &&
      condition?.type === TargetTypes.SPELL
    ) {
      const compareStr =
        condition.eval === Evaluation.LESS
          ? "less than"
          : condition.eval === Evaluation.GREATER
            ? "greater than"
            : "equal to";
      return `counter your opponent's spells with ${condition.subtype === TargetSubTypes.SPELL_TIME ? "time" : condition.subtype === TargetSubTypes.SPELL_MANA ? "mana" : "value"} ${compareStr} ${condition.value} ${durationStr}.`;
    }

    if (effect.spellChange) {
      const spellType = trigger?.type ? typeWords[trigger.type] : "spell";
        const spellPosition =
          effect.targetPlayer === PlayerTargets.SELF ? "next" : "left-most";
      const targetChange =
        effect.spellChange.targetPlayer === PlayerTargets.SELF
          ? "themselves"
          : effect.spellChange.targetPlayer === PlayerTargets.OPPONENT
            ? "you"
            : "";

      if (durationStr) {
        if (effect.spellChange.type) {
          return `convert ${targetStr} ${spellType} spells to ${typeWords[effect.spellChange.type]} spells ${durationStr}.`;
        }
        if (targetChange) {
          return `change ${targetStr} ${spellType} spells to target ${targetChange} ${durationStr}.`;
        }
        if (effect.spellChange.value !== undefined) {
          return `change the value of ${targetStr} ${spellType} spells to ${effect.spellChange.value} ${durationStr}.`;
        }
      } else {
        if (effect.spellChange.type) {
          return `convert ${targetStr} next ${spellType} spell to a ${typeWords[effect.spellChange.type]} spell.`;
        }
        if (targetChange) {
          return `change ${targetStr} next ${spellType} spell to target ${targetChange}.`;
        }
        if (effect.spellChange.value !== undefined) {
          return `change the value of ${targetStr} ${spellPosition} spell to ${effect.spellChange.value}.`;
        }

      }

    }

    // For immediate spell value changes without triggers
    if (!trigger && effect.value !== undefined) {
      return `${actionVerb} the ${subtypeNoun} of ${targetStr} next spell by ${effect.value}.`;
    }

    if (effect.prevention) {
      if (effect.value === undefined) {
        const nextStr = trigger?.expiresOnTrigger ? "next " : "";
        return `${preventionDescriptions[effect.type]} ${targetStr} ${nextStr}${spellTypeStr} spell ${durationStr}.`;
      }
      return `${actionVerb} the ${subtypeNoun} of ${targetStr} ${whenStr}${spellTypeStr} spell by ${effect.value} ${durationStr}.`;
    }

    return `${actionVerb} the ${subtypeNoun} of ${targetStr} ${whenStr}${spellTypeStr} spell by ${effect.value} ${durationStr}.`;
  }

  // Handle triggered effects
  if (trigger) {
    const triggerTargetPlayer = trigger.targetPlayer ?? effect.targetPlayer;
    const value = effect.value || 0;
    const type = typeVerbWords[effect.type];
    const durationStr = getTimingString(expiration, trigger, condition);

    if (trigger.subtype === AbilityExpirations.NEXT_CARD) {
      const eventStr =
        triggerTargetPlayer === PlayerTargets.OPPONENT
          ? "your opponent casts a spell"
          : "you cast a spell";
      const suffix = triggerTargetPlayer === PlayerTargets.SELF ? " (including this one)" : ""
        
      if (trigger.expiresOnTrigger) {
        return `${immediateVerbs[effect.type]?.normal} ${value} ${type} when ${eventStr}.`;
      }

      return `${immediateVerbs[effect.type]?.normal} ${value} ${type} whenever ${eventStr} ${durationStr}${suffix}.`;
    }

    if (expiration?.numActivations && expiration.numActivations > 2) {
      const rounds = expiration.numActivations - 1;
      return `${immediateVerbs[effect.type]?.normal} ${value} ${type} at the end of the next ${rounds} rounds.`;
    }
  }

  if (effect.prevention && effect.value === undefined) {
    const durationStr = getTimingString(expiration, trigger, condition);
    return `${preventionDescriptions[effect.type]} ${effect.targetPlayer === PlayerTargets.OPPONENT ? "your opponent's" : "your"} ${typeWords[effect.type]} ${durationStr}.`;
  }
  const value = effect.prevention
    ? -1 * (effect.value || 0)
    : effect.value || 0;
  return `${effect.targetPlayer === PlayerTargets.OPPONENT ? "deal" : "gain"} ${Math.abs(value)} ${typeVerbWords[effect.type]}.`;
}
