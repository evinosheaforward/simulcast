import { types, flow, Instance } from "mobx-state-tree";
import { MoveableCardStoreReorderable } from "../models/GameStore";
import { requestWithAuth } from "..//Firebase";

const DeckStoreBase = types.compose(
  "DeckStore",
  // hand and dropzone
  MoveableCardStoreReorderable,
  types.model("DeckStoreExt", {
    deckId: types.optional(types.string, ""),
    name: types.optional(types.string, ""),
  }),
);

export const DeckStore = DeckStoreBase.actions((self) => ({
  setName(newName: string) {
    self.name = newName;
  },
  // The submit action calls the /api/deck/addOrUpdate API.
  submit: flow(function* submit() {
    try {
      // If no deckId exists, generate one (using crypto.randomUUID if available)
      if (!self.deckId) {
        self.deckId = crypto.randomUUID();
      }
      const payload = {
        deckId: self.deckId,
        deckName: self.name,
        deck: self.dropzone.map((c) => c.id),
      };
      const response = yield requestWithAuth(
        "PUT",
        `/api/deck/addOrUpdate`,
        JSON.stringify(payload),
      );

      if (!response.ok) {
        throw new Error("Failed to submit deck");
      }
      yield response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }),
  // The setActive action calls the /deck/setActive API.
  setActive: flow(function* setActive() {
    try {
      const payload = {
        deckId: self.deckId,
      };
      const response = yield requestWithAuth(
        "POST",
        `/api/deck/setActive`,
        JSON.stringify(payload),
      );
      if (!response.ok) {
        throw new Error("Failed to set active deck");
      }
      yield response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }),
}));

export type IDeckStore = Instance<typeof DeckStore>;

const deckStore = DeckStore.create();

export default deckStore;
