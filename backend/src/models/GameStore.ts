// backend/models/GameStore.ts
import { types } from "mobx-state-tree";

// Define a Card model.
export const Card = types.model("Card", {
  id: types.identifier,
  content: types.string,
});

// Define the GameStore model that will hold the game state.
export const GameStoreModel = types.model("GameStore", {
  gameId: types.string,
  playerId: types.string,
  // Your own cards
  hand: types.array(Card),
  // Cards played by you
  dropzone: types.array(Card),
  // The opponent’s revealed moves
  opponentDropzone: types.array(Card),
  // Game status (e.g. 'playing' or 'finished')
  gameStatus: types.optional(types.string, "playing"),
});

export type GameStoreType = typeof GameStoreModel.Type;
