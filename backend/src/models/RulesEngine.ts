import { Server } from "socket.io";
import {
  Ability,
  AbilityExpirations,
  ActiveAbility,
  Card,
  Condition,
  DeckMap,
  Evaluation,
  NewDeck,
  PlayerTargets,
  populate,
  TargetSubTypes,
  TargetTypes,
  CARDS_PER_TURN,
  MANA_PER_TURN,
  randomName,
} from "simulcast-common";

export enum GameState {
  WAITING_FOR_PLAYER = "WAITING_FOR_PLAYER",
  PLAY = "PLAY",
  WAITING_FOR_SUBMISSIONS = "WAITING_FOR_SUBMISSIONS",
  RESOLUTION = "RESOLUTION",
}

class Game {
  id: string;
  players: Player[];
  state: GameState;
  rulesEngine: RulesEngine;
  decks = new Map<string, string[]>();

  constructor(id: string) {
    this.id = id;
    const hostPlayer: Player = {
      id: randomName(),
      hand: [],
      dropzone: [],
      submitted: false,
      health: 10,
      mana: 0,
      cardDraw: 0,
    };
    this.players = [hostPlayer];
    this.state = GameState.WAITING_FOR_PLAYER;
    this.rulesEngine = new RulesEngine(id);
  }

  addPlayer() {
    const joinPlayer: Player = {
      id: randomName(),
      hand: [],
      dropzone: [],
      submitted: false,
      health: 10,
      mana: 0,
      cardDraw: 0,
    };
    this.players.push(joinPlayer);
    this.rulesEngine.goesFirst =
      Math.random() >= 0.5 ? this.players[0].id : this.players[1].id;
    return joinPlayer;
  }

  async playerJoined(playerId: string, io: Server) {
    await new FrontEndUpdate(null, null, `Player ${playerId} joined`).send(
      io,
      this.rulesEngine.gameId,
    );
  }

  async startGame(io: Server) {
    console.log("starting new game");
    io.to(this.rulesEngine.gameId).emit(
      "gameStart",
      this.players.map((p) => p.id),
    );
    await new FrontEndUpdate(null, null, "Game Starting").send(
      io,
      this.rulesEngine.gameId,
    );
    this.players.forEach((p) => {
      this.decks.set(p.id, NewDeck());
    });
    this.newRound(io);
  }

  newRound(io: Server) {
    this.players.forEach((p) => {
      p.submitted = false;
      p.hand = this.drawHand(p.cardDraw, p.id, p.hand);
      p.mana = Math.max(p.mana + MANA_PER_TURN, 0);
      p.cardDraw = 0;
      p.dropzone = [];
      [p.opponentHealth, p.opponentMana] = this.players
        .filter((other) => other.id !== p.id)
        .map((other) => [other.health, other.mana])[0];
      p.goesFirst = p.id == this.rulesEngine.goesFirst;
    });

    this.state = GameState.PLAY;
    this.players.forEach((p) => {
      io.to(p.id).emit("roundStart", p);
    });
  }

  roundSubmitted(io: Server) {
    this.players.forEach((p) => {
      io.to(p.id).emit(
        "roundSubmitted",
        this.players.filter((otherPlayer) => otherPlayer.id != p.id)[0]
          .dropzone,
      );
    });
  }

  async resolveRound(io: Server) {
    this.players.forEach((player) => {
      player.mana =
        player.mana -
        player.dropzone
          .map((p) => p.cost)
          .reduce((total, num) => total + num, 0);
      if (player.mana < 0) {
        console.log("MANA CHEATER???");
        player.dropzone = [];
      }
      player.cardDraw = 0;
    });
    await this.rulesEngine.resolveRound(this.players, io);
    const endRoundUpdate = new FrontEndUpdate(null, null, "Round Ended");
    this.players.forEach((p) => {
      endRoundUpdate.setDropzone(p.id, p.dropzone);
    });
    endRoundUpdate.send(io, this.rulesEngine.gameId);
    console.log("RESOLVE ROUND OVER");
  }

  /** Utility: Draw a hand (abstract implementation) */
  drawHand(delta: number = 0, playerId: string, currentHand: Card[]): Card[] {
    // HOW DOES CARD DRAW WORK?
    const drawCount = Math.max(
      delta + Math.max(CARDS_PER_TURN - currentHand.length, 1),
      0,
    );
    let array = this.decks.get(playerId)!;
    const result = [...currentHand.map((c) => c.id)];

    for (let i = 0; i < drawCount; i++) {
      if (array.length === 0) {
        this.decks.set(playerId, NewDeck(result));
        array = this.decks.get(playerId)!;
        // while deck in hand
        if (array.length === 0) {
          break;
        }
      }
      const randomIndex = Math.floor(Math.random() * array.length);
      result.push(array.splice(randomIndex, 1)[0]); // Remove the selected element
    }
    return structuredClone(result.map((cardId) => DeckMap.get(cardId)!));
  }
}

export default Game;

export interface Player {
  id: string;
  socketId?: string;
  hand: Card[];
  dropzone: Card[];
  submitted: boolean;
  health: number;
  mana: number;
  cardDraw: number;
  opponentHealth?: number;
  opponentMana?: number;
  goesFirst?: boolean;
}

class RulesEngine {
  gameId: string;
  abilityQueue = new AbilityQueue();
  players: Player[] = [];
  activePlayer: string | null = null;
  goesFirst: string = "";

  constructor(id: string) {
    this.gameId = id;
  }

  async resolveRound(inPlayers: Player[], io: Server) {
    const player1 = inPlayers.filter(
      (player) => player.id === this.goesFirst,
    )[0];
    const player2 = inPlayers.filter(
      (player) => player.id != this.goesFirst,
    )[0];
    this.players = [player1, player2];
    this.players.forEach((player) => {
      player.dropzone = populate(player.dropzone);
      player.dropzone.forEach((card) => {
        card.timer = card.time;
      });
    });
    await this.sendActivePlayerUpdate(player1.id, io);
    try {
      let lastPlayer: string = player1.id;
      // While cards remain in dropzone
      while (this.players.some((p) => p.dropzone.length > 0)) {
        // cycle through player ticks
        for (const player of this.players) {
          lastPlayer = player.id;
          this.activePlayer = player.id;
          if (player.dropzone.length === 0) {
            await this.sendDropzoneUpdate(player, io);
            continue;
          }
          if (player.dropzone[0] == null || player.dropzone[0].timer == null) {
            throw new Error("DROPZONE CARD or TIMER == NULL?");
          }
          // tick down remaining time
          player.dropzone[0].timer!--;
          if (player.dropzone[0].timer! > 0) {
            // update if all we did is tick down
            await this.sendDropzoneUpdate(player, io);
          }
          // While player's left-most card is at 0 timer
          while (
            player.dropzone.length !== 0 &&
            player.dropzone[0].timer != null &&
            player.dropzone[0].timer <= 0
          ) {
            const card = player.dropzone.shift();
            if (card) {
              await this.cast(card, io);
              await this.expireAbilities(
                AbilityExpirations.NEXT_CARD,
                player.id,
                io,
              );
              this.goesFirst = this.players.filter(
                (p) => p.id != lastPlayer,
              )[0].id;
            } else {
              new FrontEndUpdate(
                this.activePlayer!,
                player.dropzone,
                "card was somehow null?",
              ).send(io, this.gameId);
            }
          }
        }
      }
      await this.expireAbilities(AbilityExpirations.END_OF_ROUND, null, io);
    } catch (error) {
      if (error instanceof PlayerDiedError) {
        console.log(`Player died: ${error.playerId}`);
        io.to(this.gameId).emit("gameOver", {
          winner: this.players.filter((p) => p.id != error.playerId)[0].id,
        });
        await new FrontEndUpdate(
          null,
          null,
          `${error.playerId} died - Game Over`,
        );
        io.to(this.gameId).disconnectSockets();
        for (const playerId of this.players.map((p) => p.id)) {
          io.to(playerId).disconnectSockets();
        }
      } else {
        console.log("FATAL ERROR: ", error);
      }
    }
  }

  async cast(card: Card, io: Server) {
    const resolves = await this.triggersAbility(card, io);
    if (resolves) {
      await this.useAbility(card, io);
    }
  }

  async useAbility(
    // card being cast or card trigger
    activeCard: Card,
    io: Server,
    owningPlayer: string | null = null,
    triggered: boolean = false,
    targetCard: Card | null = null,
  ) {
    if (!owningPlayer) {
      owningPlayer = this.activePlayer;
    }
    console.log(
      `useAbility:\n  player: ${owningPlayer}\n  triggerd: ${triggered}\n  ability: ${JSON.stringify(activeCard.ability)}\n  targetCard: ${JSON.stringify(targetCard)}`,
    );
    let updateEvent = new FrontEndUpdate(this.activePlayer!);

    if (!activeCard.ability.effect.immediate && !triggered) {
      // -- put trigger in the queue --
      this.abilityQueue.add(activeCard, owningPlayer!);
      updateEvent.updateLog = `${activeCard.id} saved as passive ability`;
    } else {
      // -- use ability now --
      let targetPlayer: Player;
      if (activeCard.ability.effect.targetPlayer === PlayerTargets.SELF) {
        targetPlayer = this.players.filter((p) => p.id === owningPlayer)[0];
      } else {
        targetPlayer = this.players.filter((p) => p.id !== owningPlayer)[0];
      }

      let effectValue = activeCard.ability.effect.value;
      if (effectValue) {
        effectValue =
          effectValue * (activeCard.ability.effect.prevention ? -1 : 1);
      }

      console.log(
        `useAbility:\n  targetCard: ${targetCard}\n  targetPlayer: ${targetPlayer.id}`,
      );
      // apply effect to target Card - Note - we already know the trigger is valid
      if (targetCard) {
        // careful of 0!
        if (effectValue != null) {
          targetCard!.ability.effect.value! = Math.max(
            effectValue + targetCard!.ability.effect.value!,
            0,
          );
        } else if (activeCard.ability.effect.prevention) {
          // no effect.value for prevention => prevent all
          targetCard!.ability.effect.value! = 0;
        } else {
          throw new Error(
            "CARD MISCONFIGURED - no effect.value and not effect.prevention",
          );
        }
        updateEvent.updateLog = `${activeCard.id} changed the ${targetCard.ability.effect.type} of ${targetCard!.id} to ${targetCard!.ability.effect.value!}`;
      } else {
        // effect activates now, not on a card
        switch (activeCard.ability.effect.type) {
          case TargetTypes.DAMAGE:
            // damage IS negative to health
            targetPlayer.health -= effectValue!;
            updateEvent.setHealth(targetPlayer.id, targetPlayer.health);
            updateEvent.updateLog = `${activeCard.id} dealt ${activeCard.ability.effect.value!} damage to ${targetPlayer.id}`;
            break;
          case TargetTypes.HEALTH:
            targetPlayer.health += effectValue!;
            updateEvent.setHealth(targetPlayer.id, targetPlayer.health);
            updateEvent.updateLog = `${activeCard.id} healed ${activeCard.ability.effect.value!} to ${targetPlayer.id}`;
            break;
          case TargetTypes.DRAW:
            targetPlayer.cardDraw = Math.max(
              (targetPlayer.cardDraw += effectValue!),
              0,
            );
            updateEvent.updateLog = `${activeCard.id} gave ${activeCard.ability.effect.value!} draw to ${targetPlayer.id}`;
            break;
          case TargetTypes.MANA:
            targetPlayer.mana += effectValue!;
            updateEvent.setMana(targetPlayer.id, targetPlayer.mana);
            updateEvent.updateLog = `${activeCard.id} gave ${activeCard.ability.effect.value!} mana to ${targetPlayer.id}`;
            break;
          case TargetTypes.SPELL:
            switch (activeCard.ability.effect.subtype) {
              case TargetSubTypes.SPELL_COUNTER:
                // delete the card
                let preventedCard = targetPlayer.dropzone.shift();
                updateEvent.updateLog = `${activeCard.id} countered ${preventedCard ? preventedCard.id : "nothing"}`;
                break;
              case TargetSubTypes.SPELL_TIME:
                // change time
                if (targetPlayer.dropzone[0]) {
                  targetPlayer.dropzone[0].timer! = Math.max(
                    targetPlayer.dropzone[0].timer! + effectValue!,
                    0,
                  );
                  updateEvent.updateLog = `${activeCard.id} changed the time of ${targetPlayer.dropzone[0].id} by ${effectValue!}`;
                }
                break;
              default:
                let targetCard = targetPlayer.dropzone[0];
                console.log("SPELL TARGET card:", JSON.stringify(targetCard));
                if (!targetCard) {
                  updateEvent.updateLog = `${activeCard.id} did nothing because there is no card to target`;
                } else if (!targetCard.ability.effect.value) {
                  updateEvent.updateLog = `${activeCard.id} did nothing because ${targetCard.id} has no value to affect`;
                } else {
                  if (!activeCard.ability.effect.value) {
                    targetCard.ability.effect.value = 0;
                    console.log("SPELL WITH FULL NEGATION OF VALUE");
                  } else {
                    targetCard.ability.effect.value = Math.max(
                      targetCard.ability.effect.value! + effectValue!,
                      0,
                    );
                  }
                  updateEvent.updateLog = `${activeCard.id} changed the ${targetCard.ability.effect.type} of ${targetCard.id} to ${targetCard.ability.effect.value}`;
                }
                break;
            }
            break;
        }
      }
    }

    this.players.forEach((p) => {
      updateEvent.setDropzone(p.id, p.dropzone);
    });

    await updateEvent.send(io, this.gameId);

    this.players.forEach((p) => {
      if (p.health <= 0) {
        throw new PlayerDiedError(p.id);
      }
    });
  }

  async triggersAbility(activeCard: Card, io: Server) {
    let resolves = true;
    for (const {
      player: player,
      card: triggeredCard,
    } of await this.abilityQueue.triggeredAbilites(
      activeCard,
      this.activePlayer!,
      io,
      this.gameId,
    )) {
      if (
        triggeredCard.ability.effect.subtype === TargetSubTypes.SPELL_COUNTER
      ) {
        resolves = false;
      } else {
        // resolve the triggered ability
        await this.useAbility(triggeredCard, io, player, true, activeCard);
      }
    }
    return resolves;
  }

  async expireAbilities(
    expiration: AbilityExpirations,
    player: string | null,
    io: Server,
  ) {
    console.log(`expireAbilities - ${expiration.toString()}`);
    const triggeredOnExpire = await this.abilityQueue.expireAbilities(
      expiration,
      player,
      io,
      this.gameId,
    );
    for (const { player, card } of triggeredOnExpire) {
      await this.useAbility(card, io, player, true);
    }
  }

  async sendDropzoneUpdate(player: Player, io: Server) {
    await new FrontEndUpdate(this.activePlayer!, player.dropzone).send(
      io,
      this.gameId,
    );
  }

  async sendActivePlayerUpdate(playerId: string, io: Server) {
    await new FrontEndUpdate(playerId).send(io, this.gameId);
  }
}

class AbilityQueue {
  abilities: ActiveAbility[] = [];

  add(card: Card, player: string) {
    this.abilities.push({
      card: card,
      player: player,
    } as ActiveAbility);
  }

  playerAbilites(player: string) {
    return this.abilities.filter((ability) => ability.player === player);
  }

  async triggeredAbilites(
    card: Card,
    activePlayer: string,
    io: Server,
    gameId: string,
  ) {
    let i = 0;
    const triggers = [];
    while (i < this.abilities.length) {
      if (triggerMatches(card, activePlayer, this.abilities[i])) {
        await new FrontEndUpdate(
          null,
          null,
          `${this.abilities[i].card.id} triggered`,
        ).send(io, gameId);
        if (this.abilities[i].card.ability.trigger?.expiresOnTrigger) {
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

  async expireAbilities(
    expiration: AbilityExpirations,
    activePlayer: string | null,
    io: Server,
    gameId: string,
  ) {
    let i = 0;
    const triggers = [];
    let currentTrigger: Card;
    let owningPlayer: string;
    while (i < this.abilities.length) {
      currentTrigger = this.abilities[i].card;
      owningPlayer = this.abilities[i].player;
      console.log(
        `expireAbilities: ${expiration.toString()} - ${JSON.stringify(currentTrigger)}`,
      );

      // Expiration-type triggers
      if (
        currentTrigger.ability.trigger!.type === TargetTypes.EXPIRATION &&
        currentTrigger.ability.trigger!.subtype === expiration &&
        evalExpiration(
          expiration,
          owningPlayer,
          activePlayer,
          currentTrigger.ability.trigger?.targetPlayer
            ? currentTrigger.ability.trigger.targetPlayer
            : currentTrigger.ability.effect.targetPlayer,
        ) &&
        evalCondition(currentTrigger.ability.condition, currentTrigger.ability)
      ) {
        console.log(
          `${expiration}: ${owningPlayer === activePlayer ? "SELF" : "OPPONENT"} expiration triggered ${currentTrigger.id}`,
        );
        await new FrontEndUpdate(
          null,
          null,
          `${currentTrigger.id} triggered`,
        ).send(io, gameId);
        triggers.push(this.abilities[i]);
      }

      // Expirations and trigger on expiration
      if (
        currentTrigger.ability.expiration!.type === expiration &&
        evalExpiration(
          expiration,
          owningPlayer,
          activePlayer,
          currentTrigger.ability.effect.targetPlayer,
        )
      ) {
        currentTrigger.ability.expiration!.numActivations -= 1;
        if (currentTrigger.ability.expiration!.numActivations < 1) {
          console.log("should expire ability");
          if (currentTrigger.ability.expiration?.triggerOnExpiration) {
            triggers.push(this.abilities.splice(i, 1)[0]);
            await new FrontEndUpdate(
              null,
              null,
              `${currentTrigger.id} triggered and expired`,
            ).send(io, gameId);
          } else {
            this.abilities.splice(i, 1);
            await new FrontEndUpdate(
              null,
              null,
              `${currentTrigger.id} expired`,
            ).send(io, gameId);
          }
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    console.log(
      `Triggered on expiration: ${expiration.toString()}: ${JSON.stringify(triggers)}`,
    );
    return triggers;
  }
}

export function evalExpiration(
  expiration: AbilityExpirations,
  owningPlayer: string,
  activePlayer: string | null,
  targetPlayer: PlayerTargets,
) {
  if (expiration === AbilityExpirations.END_OF_ROUND) {
    return true;
  } else {
    console.log("NEXT_CARD evaling if it's self or other player");
    return (
      (targetPlayer === PlayerTargets.SELF) === (owningPlayer == activePlayer)
    );
  }
}

export function triggerMatches(
  activeCard: Card,
  activePlayer: string,
  currentTrigger: ActiveAbility,
) {
  let targetPlayerType = currentTrigger.card.ability.trigger?.targetPlayer
    ? currentTrigger.card.ability.trigger.targetPlayer
    : currentTrigger.card.ability.effect.targetPlayer;

  if (
    // SELF/OPPONENT matches
    (targetPlayerType === PlayerTargets.SELF) ===
      (currentTrigger.player === activePlayer) &&
    // trigger type matches, or is spell
    (currentTrigger.card.ability.trigger?.type === TargetTypes.SPELL ||
      currentTrigger.card.ability.trigger?.type ===
        activeCard.ability.effect.type) &&
    // don't trigger on prevention spells
    !activeCard.ability.effect.prevention &&
    // if a trigger has a subtype, it must match
    (!currentTrigger.card.ability.trigger?.subtype ||
      currentTrigger.card.ability.trigger.subtype ===
        activeCard.ability.effect.subtype) &&
    // check condition matches, if there is one
    evalCondition(
      currentTrigger.card.ability.condition,
      currentTrigger.card.ability,
      activeCard,
    )
  ) {
    console.log(`${activeCard.id} triggered ${currentTrigger.card.id}`);
    return true;
  }
  return false;
}

function evalCondition(
  condition: Condition | undefined,
  trigger: Ability,
  card: Card | null = null,
) {
  let target: number;
  console.log(
    "evalCondition: ",
    JSON.stringify(card?.ability),
    JSON.stringify(trigger),
  );
  if (!condition) {
    return true;
  }
  switch (condition.type) {
    case TargetTypes.SPELL:
      switch (condition.subtype) {
        case TargetSubTypes.SPELL_TIME:
          target = card!.time;
        case TargetSubTypes.SPELL_MANA:
          target = card!.cost;
        default:
          target = card!.ability.effect.value!;
          break;
      }
      break;
    case TargetTypes.EXPIRATION:
      target = trigger!.expiration!.numActivations;
      break;
    default:
      target = card!.ability.effect.value!;
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

class FrontEndUpdate {
  dropzone: Map<string, Card[]> | null = null;
  health: Map<string, number> | null = null;
  mana: Map<string, number> | null = null;
  tickPlayer: string | null;
  updateLog: string = "";

  constructor(
    playerId: string | null,
    dropzone: Card[] | null = null,
    updateLog: string | null = null,
  ) {
    this.tickPlayer = playerId;
    if (dropzone) {
      this.setDropzone(playerId!, dropzone);
    }
    if (updateLog) {
      this.updateLog = updateLog;
    }
  }

  setDropzone(player: string, dropzone: Card[]) {
    if (!this.dropzone) {
      this.dropzone = new Map<string, Card[]>();
    }
    this.dropzone.set(player, dropzone);
  }

  setHealth(player: string, health: number) {
    if (!this.health) {
      this.health = new Map<string, number>();
    }
    this.health.set(player, health);
  }

  setMana(player: string, mana: number) {
    if (!this.mana) {
      this.mana = new Map<string, number>();
    }
    this.mana.set(player, mana);
  }

  toObject() {
    return {
      dropzone: this.dropzone != null ? [...this.dropzone] : null,
      health: this.health != null ? [...this.health] : null,
      tick: this.tickPlayer,
      updateLog: this.updateLog,
    };
  }

  async send(io: Server, gameId: string) {
    io.to(gameId).emit("resolveEvent", this.toObject());
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

class PlayerDiedError extends Error {
  public playerId: string;

  constructor(playerId: string, message: string = "Player died") {
    super(message);
    this.playerId = playerId;
    this.name = "PlayerDiedError";
    // Fix the prototype chain (necessary for extending Error)
    Object.setPrototypeOf(this, PlayerDiedError.prototype);
  }
}
