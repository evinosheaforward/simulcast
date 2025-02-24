import db from "../db";

/**
 * Inserts or updates the active deck for a user.
 *
 * @param userId - The Firebase user UID.
 * @param deckId - A unique deck identifier (UUID).
 * @returns The active deck row.
 */
export async function setUserActiveDeck(
  userId: string,
  deckId: string,
): Promise<any> {
  try {
    const rows = await db("user_active_deck")
      .insert({ user_id: userId, deck_id: deckId })
      .onConflict("user_id")
      .merge()
      .returning("*");
    // For SQLite (if .returning() is not supported), you might simply return the object you inserted:
    return rows && rows.length ? rows[0] : { user_id: userId, deck_id: deckId };
  } catch (error) {
    console.error("Error inserting/updating active deck:", error);
    throw error;
  }
}

/**
 * Inserts or updates a user's deck row in the user_decks table.
 *
 * @param userId - The Firebase user UID.
 * @param deckId - The unique identifier for the deck.
 * @param deckName - The name of the deck.
 * @param deck - An array of card IDs (strings) representing the deck.
 * @returns The upserted user deck row.
 */
export async function putUserDeck(
  userId: string,
  deckId: string,
  deckName: string,
  deck: string[],
): Promise<any> {
  try {
    // We store the deck as JSON.
    const rows = await db("user_decks")
      .insert({
        user_id: userId,
        deck_id: deckId,
        deck_name: deckName,
        deck: JSON.stringify(deck),
      })
      .onConflict("deck_id")
      .merge({
        deck_name: deckName,
        deck: JSON.stringify(deck),
      })
      .returning("*");
    return rows && rows.length
      ? rows[0]
      : { user_id: userId, deck_id: deckId, deck_name: deckName, deck };
  } catch (error) {
    console.error("Error upserting user deck:", error);
    throw error;
  }
}

/**
 * Retrieves the active deck for a given user by joining
 * the user_active_deck and user_decks tables.
 *
 * @param userId - The Firebase user UID.
 * @returns The active deck (as an array of card IDs) if found, or null.
 */
export async function getUserDeck(userId: string): Promise<string[] | null> {
  try {
    const row = await db("user_active_deck as uad")
      .join("user_decks as ud", "uad.deck_id", "ud.deck_id")
      .select("ud.deck")
      .where("uad.user_id", userId)
      .first();

    if (row && row.deck) {
      // If deck is stored as JSON, parse it if necessary.
      const deck: string[] =
        typeof row.deck === "string" ? JSON.parse(row.deck) : row.deck;
      console.log("Active deck:", deck);
      return deck;
    } else {
      console.log("No deck found for the user");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving active user deck:", error);
    throw error;
  }
}

/**
 * Retrieves a deck (and its name) for a given user by deckId.
 *
 * @param userId - The Firebase user UID.
 * @param deckId - The deck identifier.
 * @returns An object with the deck (array of card IDs) and its name, or null.
 */
export async function getDeck(userId: string, deckId: string): Promise<any> {
  try {
    const row = await db("user_decks")
      .select("deck", "deck_name")
      .where({ user_id: userId, deck_id: deckId })
      .first();
    if (row) {
      const deck =
        typeof row.deck === "string" ? JSON.parse(row.deck) : row.deck;
      return { deck, name: row.deck_name };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error retrieving deck:", error);
    throw error;
  }
}

/**
 * Retrieves all decks for a given user.
 *
 * @param userId - The Firebase user UID.
 * @returns An array of decks with their IDs and names.
 */
export async function getDecks(userId: string): Promise<any> {
  try {
    const rows = await db("user_decks")
      .select("deck_id", "deck_name")
      .where("user_id", userId);
    return rows || [];
  } catch (error) {
    console.error("Error retrieving decks:", error);
    throw error;
  }
}

/**
 * Deletes a user's deck from the user_decks table.
 *
 * @param userId - The Firebase user UID.
 * @param deckId - The unique identifier for the deck.
 * @returns The deleted row if found, or null.
 */
export async function deleteUserDeck(
  userId: string,
  deckId: string,
): Promise<any> {
  try {
    const rows = await db("user_decks")
      .where({ deck_id: deckId, user_id: userId })
      .del()
      .returning("*");
    return rows && rows.length ? rows[0] : null;
  } catch (error) {
    console.error("Error deleting user deck:", error);
    throw error;
  }
}
