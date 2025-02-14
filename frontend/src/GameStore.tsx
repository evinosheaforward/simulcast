// GameStore.ts
import {
  getSnapshot,
  types,
  flow,
  Instance,
  SnapshotOut,
} from "mobx-state-tree";
import { io, Socket } from "socket.io-client";

import { v4 as uuidv4 } from "uuid";

const BACKEND_URL: string =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const urlOf = (endpoint: string): string => {
  return `${BACKEND_URL}${endpoint}`;
};

export const CardModel = types.model("Card", {
  id: types.string,
  content: types.string,
  cost: types.number,
  speed: types.number,
  timer: types.number,
});

export type Card = Instance<typeof CardModel>;
export type CardSnapshot = SnapshotOut<typeof CardModel>;

export const GameStoreBase = types
  .model("GameStore", {
    gameId: types.optional(types.string, ""),
    playerId: types.optional(types.string, ""),
    hand: types.optional(types.array(CardModel), []),
    dropzone: types.optional(types.array(CardModel), []),
    opponentDropzone: types.optional(types.array(CardModel), []),
    gameStatus: types.optional(types.string, "waiting"),
    health: types.optional(types.number, -1),
    opponentHealth: types.optional(types.number, -1),
    mana: types.optional(types.number, -1),
    opponentMana: types.optional(types.number, -1),
    error: types.maybe(types.string),
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
    setGameId(newGameId: string) {
      self.gameId = newGameId;
    },
    setPlayerId(newPlayerId: string) {
      self.playerId = newPlayerId;
    },
    setHand(newHand: typeof self.hand) {
      console.log("new hand is:", JSON.stringify(newHand));
      self.hand = newHand;
    },
    setDropzone(newDropzone: typeof self.dropzone) {
      self.dropzone.replace(newDropzone);
    },
    setOpponentDropzone(newOpponentDropzone: typeof self.opponentDropzone) {
      self.opponentDropzone.replace(newOpponentDropzone);
    },
    clearOpponentDropzone() {
      self.opponentDropzone.replace([]);
    },
    setGameStatus(newStatus: string) {
      self.gameStatus = newStatus;
    },
    setHealth(newHealth: number) {
      self.health = newHealth;
    },
    setOpponentHealth(newHealth: number) {
      self.opponentHealth = newHealth;
    },
    setMana(newMana: number) {
      self.mana = newMana;
    },
    setOpponentMana(newMana: number) {
      self.opponentMana = newMana;
    },
    setError(newError: string | undefined) {
      self.error = newError;
    },
    setZone(zone: string, update: typeof self.hand) {
      if (zone === "hand") {
        self.hand.replace(update);
      } else {
        self.dropzone.replace(update);
      }
    },
  }));

const GameStoreReorderable = GameStoreBase.actions((self) => ({
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
    const [movedCard] = zoneItems.splice(currentIndex, 1);

    if (targetIndex < 0 || targetIndex > zoneItems.length) {
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
    if (targetZone === "dropzone" && cardCost > self.mana) {
      console.log("Not enough Mana");
      return;
    }
    const sourceIndex = sourceItems.findIndex(
      (card) => card.id === activeCardId,
    );
    if (sourceIndex === -1) {
      console.log("move between zones return cause source index -1");
      return;
    }
    const movedCard = CardModel.create(
      getSnapshot(sourceItems.splice(sourceIndex, 1)[0]),
    );

    let targetIndex = targetItems.findIndex((card) => card.id === overCardId);
    console.log(`move between: source ${sourceIndex}, target: ${targetIndex}`);
    if (
      targetIndex === undefined ||
      targetIndex < 0 ||
      targetIndex >= targetItems.length
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
}));

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
    });
    self.socket.on("roundStart", (player: any) => {
      console.log("roundStart", player);
      if (player) {
        self.setHand(player.hand);
        self.setDropzone(player.dropzone);
        self.setHealth(player.health);
        self.setMana(player.mana);
        self.setOpponentHealth(player.opponentHealth);
        self.setOpponentMana(player.opponentMana);
      }
      self.clearOpponentDropzone();
      // todo refactor types to shared library
      self.setGameStatus("PLAY");
    });
    self.socket.on("waitingForOpponent", () => {
      console.log("waitingForOpponent");
      self.setGameStatus("WAITING_FOR_SUBMISSIONS");
    });
    self.socket.on("roundSubmitted", (opponentDropzone: any) => {
      console.log(`roundSubmitted -- ${JSON.stringify(opponentDropzone)}`);
      self.setOpponentDropzone(opponentDropzone);
      self.setGameStatus("RESOLUTION");
    });
    self.socket.on("resolveEvent", (updateEvent: any) => {
      console.log("resolveEvent: ", JSON.stringify(updateEvent));
      if (updateEvent.dropzone) {
        for (const [playerId, dropzone] of updateEvent.dropzone) {
          if (self.playerId == playerId) {
            self.setDropzone(dropzone);
          } else {
            self.setOpponentDropzone(dropzone);
          }
        }
      }
      if (updateEvent.health) {
        for (const [playerId, newHealth] of updateEvent.health) {
          if (self.playerId == playerId) {
            self.setHealth(newHealth);
          } else {
            self.setOpponentHealth(newHealth);
          }
        }
      }
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
  createGame: flow(function* createGame() {
    const gameId = uuidv4().split("-")[0];
    try {
      const response = yield fetch(urlOf("/api/game/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ gameId }),
      });
      const data = yield response.json();
      self.gameId = data.gameId;
      self.playerId = data.playerId;
      // Once the game is created, establish the socket connection.
      self.connectSocket();
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
      const response = yield fetch(urlOf(`/api/game/get?${queryParams}`), {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
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
