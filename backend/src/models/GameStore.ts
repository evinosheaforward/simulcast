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
  hand: types.array(Card),
  dropzone: types.array(Card),
  opponentDropzone: types.array(Card),
  gameStatus: types.optional(types.string, "playing"),
});

export type GameStoreType = typeof GameStoreModel.Type;
