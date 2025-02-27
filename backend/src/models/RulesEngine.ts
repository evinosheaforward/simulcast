import { Server } from "socket.io";
import {
  Ability,
  AbilityExpirations,
  ActiveAbility,
  Card,
  Condition,
  DeckMap,
  Evaluation,
  newDeck,
  PlayerTargets,
  populate,
  TargetSubTypes,
  TargetTypes,
  CARDS_PER_TURN,
  MANA_PER_TURN,
  randomName,
  AGGRO_DECK,
  MAX_DECK_CYCLES,
  BOT_DECK,
  generateContent,
} from "simulcast-common";
import { getUserDeck } from "./DeckStore";

export enum GameState {
  WAITING_FOR_PLAYER = "WAITING_FOR_PLAYER",
  PLAY = "PLAY",
  WAITING_FOR_SUBMISSIONS = "WAITING_FOR_SUBMISSIONS",
  RESOLUTION = "RESOLUTION",
}

const STARTING_HEALTH = 20;

class Game {
  id: string;
  players: Player[];
  state: GameState;
  rulesEngine: RulesEngine;
  decks = new Map<
    string,
    { current: string[]; full: string[]; cycle: number }
  >();
  isBotGame: boolean = false;
  botPlayerId?: string;

  constructor(id: string) {
    this.id = id;
    this.players = [];
    this.state = GameState.WAITING_FOR_PLAYER;
    this.rulesEngine = new RulesEngine(id);
  }

  async addPlayer(uid: string | undefined) {
    let playerDeck: string[];
    if (!uid) {
      playerDeck = [...AGGRO_DECK];
    } else {
      const tmpDeck = await getUserDeck(uid);
      if (!tmpDeck) {
        playerDeck = [...AGGRO_DECK];
      } else {
        playerDeck = tmpDeck;
      }
    }
    const name = randomName();
    const joinPlayer: Player = {
      id: name,
      hand: [],
      dropzone: [],
      submitted: false,
      health: STARTING_HEALTH,
      mana: 0,
      cardDraw: 0,
    };
    this.players.push(joinPlayer);
    this.decks.set(joinPlayer.id, {
      full: playerDeck,
      current: [...playerDeck],
      cycle: 1,
    });
    if (this.players.length === 2) {
      this.rulesEngine.goesFirst =
        Math.random() >= 0.5 ? this.players[0].id : this.players[1].id;
    }
    return joinPlayer;
  }

  addBot() {
    this.isBotGame = true;
    const name = "BOT-" + randomName();
    const botPlayer: Player = {
      id: name,
      hand: [],
      dropzone: [],
      submitted: false,
      health: STARTING_HEALTH,
      mana: 0,
      cardDraw: 0,
    };
    this.players.push(botPlayer);
    this.botPlayerId = botPlayer.id;
    this.decks.set(botPlayer.id, {
      full: BOT_DECK,
      current: [...BOT_DECK],
      cycle: 1,
    });
    this.rulesEngine.goesFirst =
      Math.random() >= 0.5 ? this.players[0].id : this.players[1].id;
    return botPlayer;
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
    await this.newRound(io);
  }

  async newRound(io: Server) {
    try {
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
    } catch (error) {
      if (error instanceof PlayerDiedError) {
        console.log(`Player died: ${error.playerId}`);
        await new FrontEndUpdate(
          null,
          null,
          `${error.playerId}: ${error.message}`,
        ).send(io, this.id);
        io.to(this.id).emit("gameOver", {
          winner: this.players.filter((p) => p.id != error.playerId)[0].id,
        });
        for (const playerId of this.players.map((p) => p.id)) {
          io.to(playerId).disconnectSockets();
        }
      } else {
        console.log("FATAL ERROR: ", error);
      }
    }

    this.state = GameState.PLAY;
    if (this.isBotGame) {
      this.playBotTurn();
    }
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
    endRoundUpdate.abilityQueue = this.rulesEngine.abilityQueue.cardList();
    endRoundUpdate.send(io, this.rulesEngine.gameId);
    console.log("RESOLVE ROUND OVER");
  }

  drawHand(delta: number = 0, playerId: string, currentHand: Card[]): Card[] {
    const drawCount = Math.max(
      delta + Math.max(CARDS_PER_TURN - currentHand.length, 1),
      0,
    );
    let array = this.decks.get(playerId)!.current;
    const newHand = [...currentHand.map((c) => c.id)];

    for (let i = 0; i < drawCount; i++) {
      if (array.length === 0) {
        if (this.decks.get(playerId)!.cycle === MAX_DECK_CYCLES) {
          throw new PlayerDiedError(
            playerId,
            `Finished ${MAX_DECK_CYCLES} Deck Cycles, they lose. Game Over`,
          );
        }
        this.decks.get(playerId)!.current = newDeck(
          newHand,
          this.decks.get(playerId)!.full,
        );
        array = this.decks.get(playerId)!.current;
        // whole deck in hand
        if (array.length === 0) {
          break;
        }
        this.decks.get(playerId)!.cycle++;
      }

      const randomIndex = Math.floor(Math.random() * array.length);
      newHand.push(array.splice(randomIndex, 1)[0]); // Remove the selected element
    }
    return structuredClone(newHand.map((cardId) => DeckMap.get(cardId)!));
  }

  playBotTurn() {
    const botPlayer = this.players.find((p: any) => p.id === this.botPlayerId);
    if (!botPlayer || !botPlayer.hand || botPlayer.hand.length === 0) {
      return;
    }
    let availableMana = botPlayer.mana;
    const playableCards: Card[] = botPlayer.hand.filter(
      (card: Card) => card.cost <= availableMana,
    );
    console.log(
      `BOT PlAYABLE CARDS: ${JSON.stringify(playableCards.map((c) => c.id))}`,
    );
    const counterPlay = playableCards.filter(
      (card: Card) =>
        (card.ability.trigger &&
          // cards that trigger on the opponent playing cards
          card.ability.trigger.subtype === AbilityExpirations.NEXT_CARD &&
          card.ability.trigger.targetPlayer === PlayerTargets.OPPONENT) ||
        // cards that affect their spells, like counter
        (card.ability.effect.type === TargetTypes.SPELL &&
          ((card.ability.trigger?.targetPlayer &&
            card.ability.trigger.targetPlayer === PlayerTargets.OPPONENT) ||
            (!card.ability.trigger?.targetPlayer &&
              card.ability.effect.targetPlayer === PlayerTargets.OPPONENT))),
    );
    console.log(
      `BOT Counterplay cards ${JSON.stringify(counterPlay.map((c) => c.id))}`,
    );
    if (counterPlay.length > 0) {
      console.log("BOT PLAY Counterplay card");
      const chosen = counterPlay.reduce((best, card) =>
        card.cost > best.cost ? card : best,
      );
      botPlayer.dropzone = [chosen];
      botPlayer.hand = botPlayer.hand.filter((c: Card) => c.id !== chosen.id);
      return;
    }

    // check for combo
    const comboCards = playableCards
      .filter(
        (card: Card) =>
          (card.ability.effect.type == TargetTypes.SPELL &&
            // Cards that modify others, like sword
            ((card.ability.trigger?.targetPlayer &&
              card.ability.trigger?.targetPlayer === PlayerTargets.SELF) ||
              (!card.ability.trigger?.targetPlayer &&
                card.ability.effect.targetPlayer === PlayerTargets.SELF))) ||
          // cards like bow, bloom
          (card.ability.trigger &&
            card.ability.trigger?.subtype === AbilityExpirations.NEXT_CARD &&
            ((card.ability.trigger.targetPlayer &&
              card.ability.trigger.targetPlayer === PlayerTargets.SELF) ||
              (!card.ability.trigger.targetPlayer &&
                card.ability.effect.targetPlayer === PlayerTargets.SELF))),
      )
      // sort reverse-alphabetically - bad hueristic for bloom and bow go after wand, scepter, sword, but it works
      .sort((a, b) => b.id.localeCompare(a.id));
    console.log(
      `BOT AVAIL COMBO CARDS: ${JSON.stringify(comboCards.map((c) => c.id))}`,
    );
    if (comboCards.length > 2) {
      let comboMana =
        availableMana - comboCards.reduce((a, b) => a + b.cost, 0);
      let playableCount = 0;

      playableCards
        .sort((a, b) => a.cost - b.cost)
        .forEach((c) => {
          if (!comboCards.some((cc) => cc.id == c.id)) {
            if (c.cost <= comboMana && c.cost < 5) {
              comboMana -= c.cost;
              playableCount++;
              comboCards.push(c);
            }
          }
        });
      if (playableCount > 2) {
        // scepter-wand is a must
        if (comboCards[0].id === "Wand") {
          const scepterIndex = comboCards.findIndex(
            (card) => card.id === "Scepter",
          );
          if (scepterIndex > -1) {
            // Remove the "Scepter" card from its current position
            const [scepterCard] = comboCards.splice(scepterIndex, 1);
            // Insert it at the front of the list
            comboCards.unshift(scepterCard);
          }
        }
        if (comboCards[0].id === "Wand") {
          const scepterIndex = comboCards.findIndex(
            (card) => card.id === "Scepter",
          );
          if (scepterIndex > -1) {
            // Remove the "Scepter" card from its current position
            const [scepterCard] = comboCards.splice(scepterIndex, 1);
            // Insert it at the front of the list
            comboCards.unshift(scepterCard);
          }
        }
        console.log("BOT COMBO");
        botPlayer.dropzone = comboCards;
        botPlayer.hand = botPlayer.hand.filter(
          (c: Card) => !comboCards.some((chosen) => chosen.id === c.id),
        );
        return;
      }
    }
    // play a boring, end of turn spell like torch
    const endOfRoundSpell = playableCards
      .filter(
        (card: Card) =>
          card.ability.expiration &&
          card.ability.expiration?.type === AbilityExpirations.END_OF_ROUND &&
          // triggers on end of round
          (card.ability.expiration?.triggerOnExpiration ||
            card.ability.trigger?.subtype === AbilityExpirations.END_OF_ROUND),
      )
      .sort((a, b) => b.cost - a.cost)[0];

    if (endOfRoundSpell && Math.random() > 0.7) {
      console.log("BOT PLAY boring spell");
      if (endOfRoundSpell) {
        botPlayer.dropzone = [endOfRoundSpell];
        botPlayer.hand = botPlayer.hand.filter(
          (c: Card) => c.id !== endOfRoundSpell.id,
        );
        return;
      }
    }

    // no counterplay or combo, or boring play => play card draw or mana
    const chosenCards: Card[] = [];
    const cardDraw: Card[] = botPlayer.hand.filter((card: Card) => {
      return card.ability.effect.type === TargetTypes.DRAW;
    });
    if (cardDraw.length > 0) {
      console.log("BOT PLAY card draw");
      // Choose the most expensive card draw spell
      const chosenCard = cardDraw.sort((a, b) => b.cost - a.cost)[0];
      chosenCards.push(chosenCard);
      availableMana -= chosenCard.cost;
    }

    const manaSpells: Card[] = botPlayer.hand.filter((card: Card) => {
      return card.ability.effect.type === TargetTypes.MANA;
    });
    if (chosenCards.length === 0 && manaSpells.length > 0) {
      console.log("BOT PLAY mana spell");
      // Choose the most expensive mana generator
      const mg = manaSpells.sort((a, b) => b.cost - a.cost)[0];
      chosenCards.push(mg);
      availableMana -= mg.cost;
    }

    botPlayer.dropzone = chosenCards;
    botPlayer.hand = botPlayer.hand.filter(
      (c: Card) => !chosenCards.some((chosen) => chosen.id === c.id),
    );
  }
}

/*
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
  */

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
              await new FrontEndUpdate(
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
        await new FrontEndUpdate(
          null,
          null,
          `${error.playerId}: ${error.message}`,
        ).send(io, this.gameId);
        io.to(this.gameId).emit("gameOver", {
          winner: this.players.filter((p) => p.id != error.playerId)[0].id,
        });
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
      updateEvent.abilityQueue = this.abilityQueue.cardList();
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
        switch (activeCard.ability.effect.subtype) {
          case TargetSubTypes.SPELL_TYPE:
            if (activeCard.ability.effect.spellChange?.type) {
              targetCard.ability.effect.type =
                activeCard.ability.effect.spellChange.type;
              updateEvent.updateLog += `${activeCard.id} changed the type of ${targetCard!.id} to ${targetCard!.ability.effect.type}`;
            }
            if (
              activeCard.ability.effect.spellChange?.targetPlayer &&
              targetCard.ability.effect.targetPlayer !=
                activeCard.ability.effect.spellChange!.targetPlayer
            ) {
              targetCard.ability.effect.targetPlayer =
                activeCard.ability.effect.spellChange!.targetPlayer;
              updateEvent.updateLog += `${updateEvent.updateLog ? " AND" : ""} ${activeCard.id} changed the target of ${targetCard!.id} to ${targetCard!.ability.effect.type}`;
            }
            if (
              activeCard.ability.effect.spellChange?.value &&
              targetCard.ability.effect.value &&
              targetCard.ability.effect.value !=
                activeCard.ability.effect.spellChange.value
            ) {
              targetCard.ability.effect.value =
                activeCard.ability.effect.spellChange.value;
              updateEvent.updateLog += `${updateEvent.updateLog ? " AND" : ""} ${activeCard.id} changed the value of ${targetCard!.id} to ${targetCard.ability.effect.value}`;
            }
            break;
          default:
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
            break;
        }
        console.log("CHANGED CARD");
        targetCard.changedContent = generateContent(targetCard.ability);
        if (targetCard.changedBy) {
          targetCard.changedBy.push(activeCard.id);
        } else {
          targetCard.changedBy = [activeCard.id];
        }
      } else {
        // effect activates now, not on a card
        switch (activeCard.ability.effect.type) {
          case TargetTypes.DAMAGE:
            // damage IS negative to health
            targetPlayer.health -= effectValue!;
            updateEvent.setHealth(targetPlayer.id, targetPlayer.health);
            updateEvent.updateLog = `${activeCard.id} dealt ${effectValue!} damage to ${targetPlayer.id}`;
            break;
          case TargetTypes.HEALTH:
            targetPlayer.health += effectValue!;
            updateEvent.setHealth(targetPlayer.id, targetPlayer.health);
            updateEvent.updateLog = `${activeCard.id} healed ${effectValue!} to ${targetPlayer.id}`;
            break;
          case TargetTypes.DRAW:
            targetPlayer.cardDraw += effectValue!;
            updateEvent.updateLog = `${activeCard.id} gave ${effectValue!} draw to ${targetPlayer.id}`;
            break;
          case TargetTypes.MANA:
            targetPlayer.mana += effectValue!;
            updateEvent.setMana(targetPlayer.id, targetPlayer.mana);
            updateEvent.updateLog = `${activeCard.id} gave ${effectValue!} mana to ${targetPlayer.id}`;
            break;
          case TargetTypes.SPELL:
            const immediateTargetCard = targetPlayer.dropzone[0];
            switch (activeCard.ability.effect.subtype) {
              case TargetSubTypes.SPELL_COUNTER:
                // delete the card
                let preventedCard = targetPlayer.dropzone.shift();
                updateEvent.updateLog = `${activeCard.id} countered ${preventedCard ? preventedCard.id : "nothing"}`;
                break;
              case TargetSubTypes.SPELL_TIME:
                // change time
                if (immediateTargetCard) {
                  immediateTargetCard.timer! = Math.max(
                    immediateTargetCard.timer! + effectValue!,
                    0,
                  );
                  updateEvent.updateLog = `${activeCard.id} changed the time of ${immediateTargetCard.id} by ${effectValue!}`;
                }
                break;
              case TargetSubTypes.SPELL_TYPE:
                console.log(
                  `useAbility: immediate, SPELL, SPELL_TYPE - targets: ${JSON.stringify(immediateTargetCard.ability)}`,
                );
                if (immediateTargetCard) {
                  if (activeCard.ability.effect.spellChange?.type) {
                    immediateTargetCard.ability.effect.type =
                      activeCard.ability.effect.spellChange.type;
                    updateEvent.updateLog += `${activeCard.id} changed the type of ${immediateTargetCard!.id} to ${immediateTargetCard!.ability.effect.type}`;
                  }
                  if (
                    activeCard.ability.effect.spellChange?.targetPlayer &&
                    immediateTargetCard.ability.effect.targetPlayer !=
                      activeCard.ability.effect.spellChange!.targetPlayer
                  ) {
                    immediateTargetCard.ability.effect.targetPlayer =
                      activeCard.ability.effect.spellChange!.targetPlayer;
                    updateEvent.updateLog += `${updateEvent.updateLog ? " AND" : ""} ${activeCard.id} changed the target of ${immediateTargetCard.id} to ${immediateTargetCard.ability.effect.type}`;
                  }
                  if (
                    activeCard.ability.effect.spellChange?.value != null &&
                    immediateTargetCard.ability.effect.value != null
                  ) {
                    immediateTargetCard.ability.effect.value =
                      activeCard.ability.effect.spellChange.value;
                    updateEvent.updateLog += `${updateEvent.updateLog ? " AND" : ""} ${activeCard.id} changed the value of ${immediateTargetCard.id} to ${immediateTargetCard.ability.effect.value}`;
                    console.log("IT HAPPENED");
                  }
                } else {
                  updateEvent.updateLog += `${activeCard.id} had no valid target`;
                }
                break;

              default:
                console.log(
                  "SPELL TARGET card:",
                  JSON.stringify(immediateTargetCard),
                );
                if (!immediateTargetCard) {
                  updateEvent.updateLog = `${activeCard.id} did nothing because there is no card to target`;
                } else if (!immediateTargetCard.ability.effect.value) {
                  updateEvent.updateLog = `${activeCard.id} did nothing because ${immediateTargetCard.id} has no value to affect`;
                } else {
                  if (!activeCard.ability.effect.value) {
                    immediateTargetCard.ability.effect.value = 0;
                    console.log("SPELL WITH FULL NEGATION OF VALUE");
                  } else {
                    immediateTargetCard.ability.effect.value = Math.max(
                      immediateTargetCard.ability.effect.value! + effectValue!,
                      0,
                    );
                  }
                  updateEvent.updateLog = `${activeCard.id} changed the ${immediateTargetCard.ability.effect.type} of ${immediateTargetCard.id} to ${immediateTargetCard.ability.effect.value}`;
                }
                break;
            }
            console.log("CHANGED CARD");
            immediateTargetCard.changedContent = generateContent(
              immediateTargetCard.ability,
            );
            if (
              immediateTargetCard.changedContent != immediateTargetCard.content
            ) {
              console.log("CONTENT CHANGED");
            }
            if (immediateTargetCard.changedBy) {
              immediateTargetCard.changedBy.push(activeCard.id);
            } else {
              immediateTargetCard.changedBy = [activeCard.id];
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
        throw new PlayerDiedError(
          p.id,
          "Health reached 0, they lose. Game Over.",
        );
      }
    });
  }

  async triggersAbility(activeCard: Card, io: Server) {
    let resolves = true;
    for await (const {
      player: player,
      card: triggeredCard,
    } of this.abilityQueue.triggeredAbilites(
      activeCard,
      this.activePlayer!,
      io,
      this.gameId,
    )) {
      if (
        triggeredCard.ability.effect.subtype === TargetSubTypes.SPELL_COUNTER
      ) {
        await new FrontEndUpdate(
          this.activePlayer,
          null,
          `${triggeredCard.id} countered ${activeCard.id}`,
        ).send(io, this.gameId, 800);
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
      500,
    );
  }

  async sendActivePlayerUpdate(playerId: string, io: Server) {
    await new FrontEndUpdate(playerId).send(io, this.gameId, 500);
  }
}

class AbilityQueue {
  abilities: ActiveAbility[] = [];

  cardList() {
    return this.abilities.map((c) => ({
      card: c.card,
      playerId: c.player,
    }));
  }

  map(fn: (ability: ActiveAbility) => any) {
    return this.abilities.map(fn);
  }

  add(card: Card, player: string) {
    this.abilities.push({
      card: card,
      player: player,
    } as ActiveAbility);
  }

  playerAbilites(player: string) {
    return this.abilities.filter((ability) => ability.player === player);
  }

  async *triggeredAbilites(
    card: Card,
    activePlayer: string,
    io: Server,
    gameId: string,
  ) {
    let i = 0;
    while (i < this.abilities.length) {
      if (triggerMatches(card, activePlayer, this.abilities[i])) {
        let retTrigger: ActiveAbility;
        if (this.abilities[i].card.ability.trigger?.expiresOnTrigger) {
          retTrigger = this.abilities.splice(i, 1)[0];
        } else {
          retTrigger = this.abilities[i];
          i++;
        }
        await new FrontEndUpdate(
          activePlayer,
          null,
          `${retTrigger.card.id} triggered`,
          this,
        ).send(io, gameId, 200);
        yield retTrigger;
      } else {
        i++;
      }
    }
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
        currentTrigger.ability.trigger?.type === TargetTypes.EXPIRATION &&
        currentTrigger.ability.trigger?.subtype === expiration &&
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
          activePlayer,
          null,
          `${currentTrigger.id} triggered`,
        ).send(io, gameId, 100);
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
              activePlayer,
              null,
              `${currentTrigger.id} triggered and expired`,
            ).send(io, gameId, 200);
          } else {
            this.abilities.splice(i, 1);
            await new FrontEndUpdate(
              activePlayer,
              null,
              `${currentTrigger.id} expired`,
            ).send(io, gameId, 100);
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
  abilityQueue: { card: Card; playerId: string }[] | null = null;
  tickPlayer: string | null;
  updateLog: string = "";

  constructor(
    playerId: string | null,
    dropzone: Card[] | null = null,
    updateLog: string | null = null,
    abilityQueue: AbilityQueue | null = null,
  ) {
    this.tickPlayer = playerId;
    if (dropzone) {
      this.setDropzone(playerId!, dropzone);
    }
    if (updateLog) {
      this.updateLog = updateLog;
    }
    if (abilityQueue) {
      this.abilityQueue = abilityQueue.cardList();
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
      abilityQueue: this.abilityQueue,
    };
  }

  async send(io: Server, gameId: string, wait: number = 1000) {
    io.to(gameId).emit("resolveEvent", this.toObject());
    await new Promise((resolve) => setTimeout(resolve, wait));
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
