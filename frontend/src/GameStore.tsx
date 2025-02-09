// GameComponent.tsx
import { types, flow, getSnapshot } from "mobx-state-tree";
import { io, Socket } from 'socket.io-client';

// Define a Card model.
export const Card = types.model("Card", {
  id: types.identifier,
  content: types.string,
});

export const GameStoreBase = types.model("GameStore", {
  gameId: types.string,
  playerId: types.string,
  hand: types.array(Card),
  dropzone: types.array(Card),
  opponentDropzone: types.array(Card),
  gameStatus: types.optional(types.string, "playing"),
  error: types.maybe(types.string),
});

export const GameStoreUpdater = GameStoreBase.actions((self) => ({
  /**
   * Update (push) the current game state to the backend.
   */
  updateGameState: flow(function* updateGameState() {
    try {
      const snapshot = getSnapshot(self);
      yield fetch(`/api/game/${self.gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
    } catch (error) {
      console.log(error);
      self.error = "Failed to update game state.";
    }
  }),
}));

// The GameStore holds the game state for both players.
export const GameStore = GameStoreUpdater.actions((self) => ({
  /**
   * Update (push) the current game state to the backend.
   */
  updateGameState: flow(function* updateGameState() {
    try {
      const snapshot = getSnapshot(self);
      yield fetch(`/api/game/${self.gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
    } catch (error) {
      console.log(error);
      self.error = "Failed to update game state.";
    }
  }),

  /**
   * Move a card from one container to another.
   * @param from - "hand" or "dropzone"
   * @param to - "hand" or "dropzone"
   * @param cardId - the ID of the card to move
   * @param newIndex - where to insert it in the target container
   */
  moveCard(
    from: "hand" | "dropzone",
    to: "hand" | "dropzone",
    cardId: string,
    newIndex: number,
  ) {
    let card;
    if (from === "hand") {
      const index = self.hand.findIndex((c) => c.id === cardId);
      if (index !== -1) {
        card = self.hand.splice(index, 1)[0];
      }
    } else {
      const index = self.dropzone.findIndex((c) => c.id === cardId);
      if (index !== -1) {
        card = self.dropzone.splice(index, 1)[0];
      }
    }
    if (card) {
      if (to === "hand") {
        self.hand.splice(newIndex, 0, card);
      } else {
        self.dropzone.splice(newIndex, 0, card);
      }
      // After a local state change, update the backend.
      self.updateGameState();
    }
  },

  /**
   * When the game time is up, both players “finalize” their moves.
   * In a real game, the backend might do additional validation.
   */
  finishGame() {
    self.gameStatus = "finished";
    self.updateGameState();
  },

  /**
   * Fetch the current game state from the backend.
   * (This could be called periodically or via a WebSocket event.)
   */
  fetchGameState: flow(function* fetchGameState() {
    try {
      const response = yield fetch(`/api/game/${self.gameId}`);
      const data = yield response.json();
      // Update the local state with the data from the backend.
      // (Assuming the response has the same shape as the MST store snapshot.)
      self.hand = data.hand;
      self.dropzone = data.dropzone;
      self.opponentDropzone = data.opponentDropzone;
      self.gameStatus = data.gameStatus;
    } catch (error) {
      console.log(error);
      self.error = "Failed to fetch game state.";
    }
  }),
}));
/*
  .actions((self) => {
    let socket: Socket | null = null;

    return {
      // Connect to Socket.IO and join the game room.
      connectSocket() {
        socket = io('http://localhost:5000'); // adjust URL as needed
        socket.emit('joinGame', self.gameId);

        socket.on('gameStateUpdate', (newState: any) => {
          console.log('Received game state update:', newState);
          applySnapshot(self, newState);
        });
      },
      disconnectSocket() {
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      },
      // Submit a move (this would call your REST PUT endpoint)
      submitMove: flow(function* submitMove(moveData: any) {
        const response = yield fetch(`/api/game/${self.gameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(moveData),
        });
        const updatedState = yield response.json();
        applySnapshot(self, updatedState);
      }),
    };
  });
  */

export const gameStore = GameStore.create();
