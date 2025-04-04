// GameStore.ts
import {
  getSnapshot,
  types,
  flow,
  Instance,
  SnapshotOut,
  detach,
} from "mobx-state-tree";
import { io, Socket } from "socket.io-client";

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { urlOf } from "../Utilities";
import { requestWithAuth } from "../Firebase";

const randomName = () => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals], // three dictionaries of words
    separator: "-", // use '-' to join words
    length: 2, // number of words
  });
};

export const CardModel = types.model("Card", {
  id: types.string,
  content: types.string,
  type: types.maybe(types.string),
  value: types.maybe(types.number),
  changedContent: types.maybe(types.string),
  changedBy: types.maybe(types.array(types.string)),
  cost: types.number,
  time: types.number,
  timer: types.optional(types.maybeNull(types.number), null),
});

export const CardArrayModel = types.optional(types.array(CardModel), []);

export type Card = Instance<typeof CardModel>;
export type CardSnapshot = SnapshotOut<typeof CardModel>;

export const AbilityQueueItemModel = types.model("AbilityQueueItem", {
  card: CardModel,
  playerId: types.string,
});

export const MoveableCardStoreBase = types
  .model("GameStore", {
    hand: CardArrayModel,
    dropzone: CardArrayModel,
    mana: types.optional(types.number, 0),
  })
  .volatile((_) => ({
    socket: null as Socket | null,
  }))
  .views((self) => ({
    getZone(zone: string) {
      if (zone === "hand") {
        return self.hand;
      }
      return self.dropzone;
    },
  }))
  .actions((self) => ({
    setHand(newHand: typeof self.hand) {
      console.log("new hand is:", JSON.stringify(newHand));
      self.hand = newHand;
    },
    setDropzone(newDropzone: typeof self.dropzone | null | undefined) {
      console.log("set dropzone", newDropzone);
      if (newDropzone && newDropzone.length > 0) {
        console.log("replace");
        self.dropzone.replace(newDropzone);
      } else {
        console.log("clear");
        self.dropzone.replace([]);
      }
    },
    clearDropzone() {
      self.dropzone.replace([]);
    },
    setZone(zone: string, update: typeof self.hand) {
      if (zone === "hand") {
        self.hand.replace(update);
      } else {
        self.dropzone.replace(update);
      }
    },
    setMana(newMana: number) {
      self.mana = newMana;
    },
  }));

export const MoveableCardStoreReorderable = MoveableCardStoreBase.actions(
  (self) => ({
    reorderCardWithinZone(zone: string, cardId: string, overId: string) {
      const zoneItems = self.getZone(zone).slice();
      const currentIndex = zoneItems.findIndex((card) => card.id === cardId);
      if (currentIndex === -1) return; // Card not found, do nothing.

      // Remove the card from its current position.

      let targetIndex: number;
      if (overId === zone) {
        targetIndex = zoneItems.length;
      } else {
        targetIndex = zoneItems.findIndex((card) => card.id === overId);
        if (targetIndex === -1) {
          targetIndex = zoneItems.length;
        }
      }
      let [movedCard] = zoneItems.splice(currentIndex, 1);

      if (targetIndex < 0) {
        targetIndex = 0;
      } else if (targetIndex >= zoneItems.length) {
        targetIndex = zoneItems.length;
      }
      zoneItems.splice(targetIndex, 0, movedCard);
      self.setZone(zone, zoneItems as typeof self.hand);
    },

    moveCardBetweenZones(
      sourceZone: string,
      targetZone: string,
      activeCardId: string,
      overCardId: string,
      cardCost: number,
    ) {
      const sourceItems = self.getZone(sourceZone);
      const targetItems = self.getZone(targetZone);
      const sourceIndex = sourceItems.findIndex(
        (card) => card.id === activeCardId,
      );
      if (sourceIndex === -1) {
        console.log("move between zones return cause source index -1");
        return;
      }
      const movedCard = CardModel.create(
        getSnapshot(detach(sourceItems[sourceIndex])),
      );

      let targetIndex = targetItems.findIndex((card) => card.id === overCardId);
      console.log(
        `move between: source ${sourceIndex}, target: ${targetIndex}`,
      );
      if (
        targetIndex === undefined ||
        targetIndex < 0 ||
        targetIndex >= targetItems.length - 1
      ) {
        // If no target index is provided or it's out-of-range, push to the end.
        targetItems.push(movedCard);
      } else {
        targetItems.splice(targetIndex, 0, movedCard);
      }
      if (targetZone === "dropzone") {
        self.mana -= cardCost;
      } else {
        self.mana += cardCost;
      }
    },
  }),
);

const GameStoreReorderable = types.compose(
  "GameStoreReorderable",
  MoveableCardStoreReorderable,
  types
    .model("GameStore", {
      gameId: types.optional(types.string, ""),
      playerId: types.optional(types.string, ""),
      opponentDropzone: types.optional(types.array(CardModel), []),
      opponentPlayerId: types.optional(types.string, ""),
      gameStatus: types.optional(types.string, "waiting"),
      health: types.optional(types.number, Number.MIN_SAFE_INTEGER),
      opponentHealth: types.optional(types.number, Number.MIN_SAFE_INTEGER),
      opponentCardsInHand: types.optional(
        types.number,
        Number.MIN_SAFE_INTEGER,
      ),
      goesFirst: types.optional(types.maybeNull(types.boolean), null),
      opponentMana: types.optional(types.number, Number.MIN_SAFE_INTEGER),
      gameOver: types.optional(types.boolean, false),
      tick: types.optional(types.maybeNull(types.string), null),
      updateLog: types.optional(types.array(types.string), []),
      abilityQueue: types.optional(types.array(AbilityQueueItemModel), []),
      isBotGame: types.optional(types.boolean, false),
      error: types.maybe(types.string),
    })
    .volatile((_) => ({
      socket: null as Socket | null,
    }))
    .actions((self) => ({
      setGameId(newGameId: string) {
        self.gameId = newGameId;
      },
      setPlayerId(newPlayerId: string) {
        self.playerId = newPlayerId;
      },
      setOpponentPlayerId(newPlayerId: string) {
        self.opponentPlayerId = newPlayerId;
      },
      setOpponentDropzone(
        newOpponentDropzone: typeof self.opponentDropzone | null | undefined,
      ) {
        console.log("set opp dropzone", newOpponentDropzone);
        if (newOpponentDropzone && newOpponentDropzone.length > 0) {
          console.log("replace");
          self.opponentDropzone.replace(newOpponentDropzone);
        } else {
          console.log("clear");
          self.opponentDropzone.replace([]);
        }
      },
      clearOpponentDropzone() {
        self.opponentDropzone.replace([]);
      },
      setGameStatus(newStatus: string) {
        self.gameStatus = newStatus;
      },
      setGoesFirst(goesFirst: boolean) {
        self.goesFirst = goesFirst;
      },
      setHealth(newHealth: number) {
        self.health = newHealth;
      },
      setOpponentHealth(newHealth: number) {
        self.opponentHealth = newHealth;
      },
      setOpponentMana(newMana: number) {
        self.opponentMana = newMana;
      },
      setOpponentCardsInHand(cardsInHand: number) {
        self.opponentCardsInHand = cardsInHand;
      },
      setError(newError: string | undefined) {
        self.error = newError;
      },
      setGameOver(over: boolean) {
        self.gameOver = over;
      },
      setTick(playerId: string) {
        self.tick = playerId;
      },
      setUpdateLog(log: string) {
        self.updateLog.push(log);
      },
      setAbilityQueue(abilityQueue: { card: Card; playerId: string }[]) {
        self.abilityQueue.replace(abilityQueue);
      },
      clearAbilityQueue() {
        self.abilityQueue.replace([]);
      },
    })),
);

const GameStoreConnectable = GameStoreReorderable.actions((self) => ({
  /**
   * Establish the Socket.IO connection and define event handlers.
   */
  connectSocket() {
    self.socket = io(urlOf(""), {
      autoConnect: true,
      auth: {
        gameId: self.gameId,
        playerId: self.playerId,
      },
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });
    self.socket.on("connect", () => {
      console.log("Connected to socket with id:", self.socket?.id);
      self.socket!.emit("joinGame", {
        gameId: self.gameId,
        playerId: self.playerId,
      });
      self.setGameOver(false);
    });
    self.socket.on("gameStart", (playerIds: any) => {
      playerIds.forEach((pId: string) => {
        if (pId != self.playerId) {
          self.setOpponentPlayerId(pId);
        }
      });
    }),
      self.socket.on("roundStart", (player: any) => {
        console.log("roundStart", player);
        if (player) {
          self.setHand(player.hand);
          self.setDropzone(player.dropzone);
          self.setHealth(player.health);
          self.setMana(player.mana);
          self.setGoesFirst(player.goesFirst);
          self.setOpponentHealth(player.opponentHealth);
          self.setOpponentMana(player.opponentMana);
          self.setOpponentCardsInHand(player.opponentCardsInHand);
        }
        self.clearOpponentDropzone();
        // todo refactor types to shared library
        self.setGameStatus("PLAY");
      });
    self.socket.on("waitingForOpponent", () => {
      console.log("waitingForOpponent");
      self.setGameStatus("WAITING_FOR_OPPONENT");
    });
    self.socket.on("roundSubmitted", (opponentDropzone: any) => {
      console.log(`roundSubmitted -- ${JSON.stringify(opponentDropzone)}`);
      self.setOpponentDropzone(opponentDropzone);
      self.setOpponentCardsInHand(
        self.opponentCardsInHand - opponentDropzone.length,
      );
      self.setGameStatus("RESOLUTION");
    });
    self.socket.on("resolveEvent", (updateEvent: any) => {
      console.log("resolveEvent: ", JSON.stringify(updateEvent));
      self.setTick(updateEvent.tick);
      if (updateEvent.dropzone !== null) {
        updateEvent.dropzone.forEach(
          ([playerId, dropzoneUpdate]: [string, any]) => {
            console.log(
              "resolveEvent dropzone: ",
              self.playerId,
              playerId,
              JSON.stringify(dropzoneUpdate),
            );
            if (self.playerId.trim() == playerId.trim()) {
              self.setDropzone(dropzoneUpdate);
            } else {
              self.setOpponentDropzone(dropzoneUpdate);
            }
          },
        );
      }
      if (updateEvent.health != null) {
        updateEvent.health.forEach(
          ([playerId, newHealth]: [string, number]) => {
            console.log(
              "resolveEvent health: ",
              self.playerId,
              playerId,
              newHealth,
            );
            if (self.playerId == playerId) {
              self.setHealth(newHealth);
            } else {
              self.setOpponentHealth(newHealth);
            }
          },
        );
      }
      if (updateEvent.mana != null) {
        updateEvent.mana.forEach(([playerId, newMana]: [string, number]) => {
          console.log("resolveEvent mana: ", self.playerId, playerId, newMana);
          if (self.playerId == playerId) {
            self.setMana(newMana);
          } else {
            self.setOpponentMana(newMana);
          }
        });
      }
      if (updateEvent.updateLog?.trim()) {
        self.setUpdateLog(updateEvent.updateLog);
      }
      if (updateEvent.abilityQueue != null) {
        self.setAbilityQueue(updateEvent.abilityQueue);
      }
    });
    self.socket.on("gameOver", (result: { winner: string }) => {
      console.log("winner:", result.winner);
      self.setGameOver(true);
      self.socket?.disconnect();
    });
    self.socket.on("error", (error: any) => {
      console.log("socket error:", error.message);
      self.setError(error.message);
    });
  },
}));

export const GameStore = GameStoreConnectable.actions((self) => ({
  /**
   * Create a new game by calling the backend API.
   * Expects the backend to return a { gameId, playerId }.
   */
  createGame: flow(function* createGame(isBotGame: boolean = false) {
    const gameId = randomName();
    const endpoint = isBotGame ? "/api/game/createBotGame" : "/api/game/create";
    try {
      const response = yield requestWithAuth(
        "POST",
        endpoint,
        JSON.stringify({ gameId }),
      );
      const data = yield response.json();
      self.gameId = data.gameId;
      self.playerId = data.playerId;
      self.isBotGame = isBotGame;
      // Once the game is created, establish the socket connection.
      self.connectSocket();
      self.clearAbilityQueue();
    } catch (error: any) {
      self.error = error.message;
    }
  }),

  /**
   * Join an existing game.
   * Connects the socket and emits the 'joinGame' event.
   */
  joinGame: flow(function* joinGame(gameId: string) {
    try {
      const queryParams = new URLSearchParams({
        gameId: gameId.trim(),
      }).toString();
      const response = yield requestWithAuth(
        "GET",
        `/api/game/get?${queryParams}`,
      );
      const data = yield response.json();
      self.gameId = data.gameId;
      self.playerId = data.playerId;
      // Once the game is created, establish the socket connection.
      self.connectSocket();
    } catch (error: any) {
      console.log(error);
      self.error = error.message;
    }
  }),

  /**
   * Submit the round by sending the current dropzone and hand data to the backend.
   */
  submitRound: flow(function* submitRound() {
    try {
      if (!self.socket) {
        throw new Error("Socket not connected");
      }
      if (self.gameStatus != "PLAY") {
        console.log("TRIED TO SUBMIT OUTSIDE PLAY");
        return;
      }
      self.socket.emit("submitRound", {
        gameId: self.gameId,
        playerId: self.playerId,
        dropzone: self.dropzone,
        hand: self.hand,
      });
      self.setGameStatus("WAITING_FOR_ROUND_SUBMITTED");
    } catch (error: any) {
      console.log("error in submitRound:", error.message);
      self.error = error.message;
    }
  }),

  /**
   * Disconnect the socket connection.
   * Typically called when the component unmounts.
   */
  disconnectSocket() {
    if (self.socket) {
      self.socket.disconnect();
      self.socket = null;
    }
  },
}));

const gameStore = GameStore.create();
export default gameStore;
