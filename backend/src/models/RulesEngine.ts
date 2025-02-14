import { Server } from "socket.io";
import Deck, {
  Ability,
  AbilityExpirations,
  AbilityQueue,
  Card,
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
    if (this.players.length === 2) {
      this.newRound(io);
    }
  }

  newRound(io: Server) {
    // TODO need to add opponent health and mana
    this.players.forEach((p) => {
      p.submitted = false;
      p.hand = drawHand(p.cardDraw);
      p.mana += 3;
      p.cardDraw = 0;
      p.dropzone = [];
      [p.opponentHealth, p.opponentMana] = this.players
        .filter((other) => other.id !== p.id)
        .map((other) => [other.health, other.mana])[0];
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

  resolveRound(io: Server) {
    this.players.forEach((player) => {
      player.mana = 0;
      player.cardDraw = 0;
    });
    this.rulesEngine.resolveRound(this.players, this.goesFirst, io);
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
}

class RulesEngine {
  gameId: string;
  abilityQueue = new AbilityQueue();
  players: Player[] = [];
  activePlayer: string | null = null;

  constructor(id: string) {
    this.gameId = id;
  }

  resolveRound(inPlayers: Player[], goesFirst: string, io: Server): void {
    const player1 = inPlayers.filter((player) => player.id === goesFirst)[0];
    const player2 = inPlayers.filter((player) => player.id != goesFirst)[0];
    this.players = [player1, player2];
    this.players.forEach((player) => {
      player.dropzone.forEach((card) => {
        card.timer = card.speed;
      });
    });
    while (this.players.some((player) => player.dropzone.length > 0)) {
      for (const player of this.players) {
        this.activePlayer = player.id;
        if (player.dropzone.length === 0) {
          continue;
        }
        // tick down remaining time
        player.dropzone[0].timer!--;
        while (player.dropzone[0]?.speed) {
          this.cast(player.dropzone.shift()!, io);
          this.expireAbilities(AbilityExpirations.NEXT_CARD, player.id, io);
        }
      }
    }
    this.expireAbilities(AbilityExpirations.END_OF_ROUND, player1.id, io);
  }

  cast(card: Card, io: Server) {
    const resolves = this.triggersAbility(card, io);
    if (resolves) {
      this.useAbility(card.ability, io);
    }
  }

  useAbility(
    ability: Ability,
    io: Server,
    owningPlayer: string | null = null,
    triggered: boolean = false,
  ) {
    if (!owningPlayer) {
      owningPlayer = this.activePlayer;
    }
    let update = new FrontEndUpdate();
    // inefficient when ability is triggered
    if (triggered) {
      update.dropzone?.set(
        owningPlayer!,
        this.players.filter((p) => p.id === owningPlayer)[0].dropzone,
      );
    }
    if (ability.effect.immediate) {
      let targetPlayer: Player;
      if (ability.effect.targetPlayer === PlayerTargets.SELF) {
        targetPlayer = this.players.filter((p) => p.id === owningPlayer)[0];
      } else {
        targetPlayer = this.players.filter((p) => p.id !== owningPlayer)[0];
      }
      switch (ability.effect.target) {
        case TargetTypes.DAMAGE:
          targetPlayer.health -= ability.effect.value!;
          update.health = {
            player: targetPlayer.id,
            value: targetPlayer.health,
          };
          break;
        case TargetTypes.HEALTH:
          targetPlayer.health += ability.effect.value!;
          update.health = {
            player: targetPlayer.id,
            value: targetPlayer.health,
          };
          break;
        case TargetTypes.DRAW:
          targetPlayer.cardDraw += ability.effect.value!;
          break;
        case TargetTypes.MANA:
          targetPlayer.mana += ability.effect.value!;
          break;
        case TargetTypes.SPELL:
          console.log("not implemented");
          switch (ability.effect.subtype) {
            case TargetSubTypes.PREVENTION:
              // delete the card
              targetPlayer.dropzone.shift();
              break;
            case TargetSubTypes.SPELL_SPEED:
              // reduce speed
              targetPlayer.dropzone[0].timer! += ability.effect.value!;
              break;
          }
          update.dropzone?.set(
            targetPlayer.id,
            this.players.filter((p) => p.id === targetPlayer.id)[0].dropzone,
          );
      }
    } else {
      this.abilityQueue.add(ability, owningPlayer!);
    }
    io.to(this.gameId).emit("resolveEvent", update);
  }

  triggersAbility(card: Card, io: Server) {
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
        this.useAbility(ability, io, player, true);
      }
    }
    return resolves;
  }

  modifySpell(card: Card, ability: Ability) {
    switch (ability.effect.subtype) {
      case TargetSubTypes.PREVENTION:
        return false;
        card.timer! -= ability.effect.value!;
        return true;
    }
  }

  expireAbilities(expiration: AbilityExpirations, player: string, io: Server) {
    const triggeredOnExpire = this.abilityQueue.expireAbilities(
      expiration,
      player,
    );
    for (const { player, ability } of triggeredOnExpire) {
      this.useAbility(ability, io, player, true);
    }
  }
}

class FrontEndUpdate {
  dropzone?: Map<string, Card[]>;
  health?: {
    value: number;
    player: string;
  };
}

export default Game;

/** Utility: Draw a hand (abstract implementation) */
function drawHand(delta: number = 0): Card[] {
  // Min CARD DRAW is 1
  return getRandomElements(Deck, Math.min(4 + delta, 1));
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
  return result;
};
