import { Server } from "socket.io";
import {
  Ability,
  AbilityExpirations,
  ActiveAbility,
  Card,
  Condition,
  drawHand,
  Evaluation,
  PlayerTargets,
  populate,
  TargetSubTypes,
  TargetTypes,
} from "../models/Deck";

import { v4 as uuidv4 } from "uuid";

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

  constructor(id: string) {
    this.id = id;
    const hostPlayer: Player = {
      id: uuidv4(),
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
      id: uuidv4(),
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

  async startGame(io: Server) {
    console.log("starting new game");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    this.newRound(io);
  }

  newRound(io: Server) {
    this.players.forEach((p) => {
      p.submitted = false;
      p.hand = drawHand(p.cardDraw);
      p.mana = Math.max(p.mana + 3, 0);
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
        console.log("CHEATER???");
        player.dropzone = [];
      }
      player.cardDraw = 0;
    });
    await this.rulesEngine.resolveRound(this.players, io);
    const endRoundUpdate = new FrontEndUpdate(null);
    this.players.forEach((p) => {
      endRoundUpdate.setDropzone(p.id, p.dropzone);
    });
    console.log("RESOLVE ROUND OVER");
    io.to(this.rulesEngine.gameId).emit(
      "resolveEvent",
      endRoundUpdate.toObject(),
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
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
        card.timer = card.speed;
      });
    });
    try {
      let lastPlayer: string = player1.id;
      while (this.players.some((p) => p.dropzone.length > 0)) {
        for (const player of this.players) {
          lastPlayer = player.id;
          this.activePlayer = player.id;
          if (player.dropzone.length === 0 || player.dropzone[0] == null) {
            continue;
          }

          if (player.dropzone[0].timer == null) {
            console.log("DROPZONE CARD TIMER == NUL");
            player.dropzone.shift();
          }
          // tick down remaining time
          player.dropzone[0].timer!--;
          if (player.dropzone[0].timer! > 0) {
            // update if all we did is tick down
            io.to(this.gameId).emit(
              "resolveEvent",
              new FrontEndUpdate(
                this.activePlayer!,
                player.dropzone,
              ).toObject(),
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
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
              io.to(this.gameId).emit(
                "resolveEvent",
                new FrontEndUpdate(
                  this.activePlayer!,
                  player.dropzone,
                ).toObject(),
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      }
      await this.expireAbilities(
        AbilityExpirations.END_OF_ROUND,
        player1.id,
        io,
      );
    } catch (error) {
      if (error instanceof PlayerDiedError) {
        console.log(`Player died: ${error.playerId}`);
        io.to(this.gameId).emit("gameOver", {
          winner: this.players.filter((p) => p.id != error.playerId)[0].id,
        });
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
      await this.useAbility(card.ability, io);
    }
  }

  async useAbility(
    ability: Ability,
    io: Server,
    owningPlayer: string | null = null,
    triggered: boolean = false,
    card: Card | null = null,
  ) {
    if (!owningPlayer) {
      owningPlayer = this.activePlayer;
    }
    console.log(
      `useAbility:\n  player: ${owningPlayer}\n  triggerd: ${triggered}\n  ability: ${JSON.stringify(ability)}`,
    );
    let updateEvent = new FrontEndUpdate(this.activePlayer!);
    if (ability.effect.immediate || triggered) {
      let targetPlayer: Player;
      if (ability.effect.targetPlayer === PlayerTargets.SELF) {
        targetPlayer = this.players.filter((p) => p.id === owningPlayer)[0];
      } else {
        targetPlayer = this.players.filter((p) => p.id !== owningPlayer)[0];
      }
      switch (ability.effect.target) {
        case TargetTypes.DAMAGE:
          switch (ability.effect.subtype) {
            case TargetSubTypes.PREVENTION:
              if (ability.effect.value) {
                targetPlayer.dropzone[0].ability.effect.value! = Math.max(
                  targetPlayer.dropzone[0].ability.effect.value! -
                    ability.effect.value,
                  0,
                );
              } else {
                card!.ability.effect.value! = 0;
              }
              break;
            default:
              targetPlayer.health -= ability.effect.value!;
              updateEvent.setHealth(targetPlayer.id, targetPlayer.health);
              break;
          }
          break;
        case TargetTypes.HEALTH:
          targetPlayer.health += ability.effect.value!;
          updateEvent.setHealth(targetPlayer.id, targetPlayer.health);
          break;
        case TargetTypes.DRAW:
          targetPlayer.cardDraw = Math.max(
            (targetPlayer.cardDraw += ability.effect.value!),
            0,
          );
          break;
        case TargetTypes.MANA:
          targetPlayer.mana += ability.effect.value!;
          updateEvent.setHealth(targetPlayer.id, targetPlayer.mana);
          break;
        case TargetTypes.SPELL:
          switch (ability.effect.subtype) {
            case TargetSubTypes.PREVENTION:
              // delete the card
              targetPlayer.dropzone.shift();
              break;
            case TargetSubTypes.SPELL_SPEED:
              // change speed
              if (targetPlayer.dropzone[0]) {
                targetPlayer.dropzone[0].timer! = Math.max(
                  targetPlayer.dropzone[0].timer! + ability.effect.value!,
                  0,
                );
              }
              break;
            default:
              console.log("SPELL TARGET card:", JSON.stringify(card));
              card!.ability.effect.value! = Math.max(
                card!.ability.effect.value! + ability.effect.value!,
                0,
              );

              break;
          }
      }
    } else {
      this.abilityQueue.add(ability, owningPlayer!);
    }

    this.players.forEach((p) => {
      updateEvent.setDropzone(p.id, p.dropzone);
    });

    console.log("resolveEvent", JSON.stringify(updateEvent.toObject()));
    io.to(this.gameId).emit("resolveEvent", updateEvent.toObject());
    console.log("sleep");
    if (triggered) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.players.forEach((p) => {
      if (p.health <= 0) {
        throw new PlayerDiedError(p.id);
      }
    });
  }

  async triggersAbility(card: Card, io: Server) {
    let resolves = true;
    for (const { player, ability } of this.abilityQueue.triggeredAbilites(
      card,
      this.activePlayer!,
    )) {
      if (
        ability.effect.target === TargetTypes.SPELL &&
        ability.effect.subtype === TargetSubTypes.PREVENTION
      ) {
        resolves = false;
      } else {
        // resolve the triggered ability
        await this.useAbility(ability, io, player, true, card);
      }
    }
    return resolves;
  }

  async expireAbilities(
    expiration: AbilityExpirations,
    player: string,
    io: Server,
  ) {
    console.log(`expireAbilities - ${expiration.toString()}`);
    const triggeredOnExpire = this.abilityQueue.expireAbilities(
      expiration,
      player,
    );
    for (const { player, ability } of triggeredOnExpire) {
      await this.useAbility(ability, io, player, true);
    }
  }
}

class AbilityQueue {
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
          }
        } else {
          i++;
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
      evalCondition(currentTrigger.ability.condition!, card, currentTrigger))
  ) {
    return true;
  }
  return false;
}

function evalCondition(
  condition: Condition,
  card: Card,
  trigger: ActiveAbility,
) {
  let target: number;
  console.log(
    "evalCondition: ",
    JSON.stringify(card.ability),
    JSON.stringify(trigger),
  );
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
      target = trigger.ability.expiration!.numActivations;
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

class FrontEndUpdate {
  dropzone: Map<string, Card[]> | null = null;
  health: Map<string, number> | null = null;
  mana: Map<string, number> | null = null;
  tickPlayer: string | null;
  updateKey: string = uuidv4().split("-")[0];

  constructor(playerId: string | null, dropzone: Card[] | null = null) {
    this.tickPlayer = playerId;
    if (dropzone) {
      this.setDropzone(playerId!, dropzone);
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
      updateKey: this.updateKey,
    };
  }
}

export default Game;
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
