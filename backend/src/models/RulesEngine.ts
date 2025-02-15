import { Server } from "socket.io";
import {
  Ability,
  AbilityExpirations,
  AbilityQueue,
  Card,
  drawHand,
  PlayerTargets,
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
  goesFirst: string;
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
    this.goesFirst = "";
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
    this.goesFirst =
      Math.random() >= 0.5 ? this.players[0].id : this.players[1].id;
    return joinPlayer;
  }

  startGame(io: Server) {
    console.log("starting new game");
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
      p.goesFirst = p.id == this.goesFirst;
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
      player.mana = 0;
      player.cardDraw = 0;
    });
    await this.rulesEngine.resolveRound(this.players, this.goesFirst, io);
    console.log("RESOLVE ROUND OVER");
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

  constructor(id: string) {
    this.gameId = id;
  }

  async resolveRound(inPlayers: Player[], goesFirst: string, io: Server) {
    const player1 = inPlayers.filter((player) => player.id === goesFirst)[0];
    const player2 = inPlayers.filter((player) => player.id != goesFirst)[0];
    this.players = [player1, player2];
    this.players.forEach((player) => {
      player.dropzone.forEach((card) => {
        card.timer = card.speed;
      });
    });
    try {
      while (this.players.some((p) => p.dropzone.length > 0)) {
        for (const player of this.players) {
          this.activePlayer = player.id;
          if (player.dropzone.length === 0) {
            continue;
          }
          // tick down remaining time
          player.dropzone[0].timer!--;
          while (
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
  ) {
    if (!owningPlayer) {
      owningPlayer = this.activePlayer;
    }
    console.log(
      `useAbility:\n  player: ${owningPlayer}\n  triggerd: ${triggered}\n  ability: ${JSON.stringify(ability)}`,
    );
    let updateEvent = new FrontEndUpdate();
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
                targetPlayer.dropzone[0].ability.effect.value! -=
                  ability.effect.value;
              } else {
                targetPlayer.dropzone[0].ability.effect.value! = 0;
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
          targetPlayer.cardDraw += ability.effect.value!;
          break;
        case TargetTypes.MANA:
          targetPlayer.mana += ability.effect.value!;
          break;
        case TargetTypes.SPELL:
          switch (ability.effect.subtype) {
            case TargetSubTypes.PREVENTION:
              // delete the card
              targetPlayer.dropzone.shift();
              break;
            case TargetSubTypes.SPELL_SPEED:
              // reduce speed
              if (targetPlayer.dropzone[0]) {
                targetPlayer.dropzone[0].timer! += ability.effect.value!;
              }
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
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
        await this.useAbility(ability, io, player, true);
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

class FrontEndUpdate {
  dropzone: Map<string, Card[]> | null = null;
  health: Map<string, number> | null = null;

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

  toObject() {
    return {
      dropzone: this.dropzone != null ? [...this.dropzone] : null,
      health: this.health != null ? [...this.health] : null,
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
