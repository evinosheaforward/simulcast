// deckRoutes.ts
import { Router, Request, Response } from "express";
import { strictAuth } from "../Authentication";
import {
  setUserActiveDeck,
  putUserDeck,
  getDeck,
  deleteUserDeck,
  getDecks,
} from "../models/DeckStore"; // adjust import paths as needed
import { DECK_LENGTH } from "simulcast-common";

const deckRoutes = Router();

/**
 * POST /deck/setActive
 * Sets the active deck for the authenticated user.
 * Expects JSON body: { deckId: string }
 */
deckRoutes.post(
  "/setActive",
  strictAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid; // guaranteed by strictAuth
      const { deckId } = req.body;
      if (!deckId) {
        res.status(400).json({ error: "deckId is required" });
        return;
      }
      const activeDeck = await setUserActiveDeck(userId, deckId);
      res.status(200).json(activeDeck);
    } catch (error) {
      console.error("Error setting active deck:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * POST /deck/addOrUpdate
 * Inserts or updates a user's deck.
 * Expects JSON body: { deckId: string, deck: string[] }
 */
deckRoutes.put(
  "/addOrUpdate",
  strictAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;
      const { deckId, deckName, deck } = req.body;
      if (!deckId || !deck || deck.length != DECK_LENGTH) {
        res
          .status(400)
          .json({ error: "Both deckId and deck array are required" });
        return;
      }
      const userDeck = await putUserDeck(userId, deckId, deckName, deck);
      res.status(200).json(userDeck);
    } catch (error) {
      console.error("Error adding or updating deck:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * GET /deck
 * Retrieves the active deck for the authenticated user.
 */
deckRoutes.get("/getDeck", strictAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;

    const { deckId } = req.query;
    const deck = await getDeck(userId, deckId as string);
    if (!deck) {
      res.status(404).json({ error: "Active deck not found" });
      return;
    }
    res.status(200).json({ deck });
  } catch (error) {
    console.error("Error retrieving deck:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /deck
 * Retrieves the active deck for the authenticated user.
 */
deckRoutes.get(
  "/listDecks",
  strictAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.uid;

      const decks = await getDecks(userId);
      res.status(200).json({ decks });
    } catch (error) {
      console.error("Error retrieving decks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * DELETE /deck
 * Deletes a deck for the authenticated user.
 * Expects JSON body: { deckId: string }
 */
deckRoutes.delete("/deck", strictAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { deckId } = req.body;

    if (!deckId) {
      res.status(400).json({ error: "deckId is required" });
      return;
    }

    const deletedDeck = await deleteUserDeck(userId, deckId);
    if (!deletedDeck) {
      res.status(404).json({ error: "Deck not found or not owned by user" });
    }

    res.status(200).json({ deletedDeck });
  } catch (error) {
    console.error("Error deleting deck:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default deckRoutes;
