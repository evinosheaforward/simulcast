// DecksListPage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // or useHistory for react-router v5
import { auth, requestWithAuth } from "../Firebase";

interface Deck {
  deckId: string;
  deckName: string;
  isActive: boolean;
}

const DecksListPageInterface: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    async function fetchDecks() {
      setLoading(true);
      console.log("fetching deck list");
      try {
        // Example request pattern.
        const response = await requestWithAuth("GET", `/api/deck/list`);
        if (response.ok) {
          const data = await response.json();
          // Expecting data.decks to be an array of { deckId, deckName } objects.
          setDecks(data.decks);
        }
      } catch (error) {
        console.error("Error fetching decks:", error);
      } finally {
        setLoading(false);
      }
    }
    const unsubscribe = auth.onAuthStateChanged(fetchDecks);
    return () => unsubscribe();
  }, []);

  async function handleSetActive(deckId: string) {
    try {
      const response = await requestWithAuth(
        "POST",
        `/api/deck/setActive`,
        JSON.stringify({ deckId }),
      );
      if (response.ok) {
        setDecks(
          decks.map((deck) => {
            if (deck.deckId == deckId) {
              return { ...deck, isActive: true };
            } else if (deck.isActive) {
              return { ...deck, isActive: false };
            } else {
              return deck;
            }
          }),
        );
        alert("Deck set as active!");
      } else {
        alert("Failed to set active deck.");
      }
    } catch (error) {
      console.error("Error setting active deck:", error);
      alert("Error setting active deck.");
    }
  }

  function handleEdit(deckId: string) {
    navigate(`/deck/edit?deckId=${deckId}`);
  }

  const handleNewDeck = () => {
    // Generate a unique deck ID.
    const newDeckId = window.crypto.randomUUID();
    // Redirect to the deck builder with the new deckId as a query parameter.
    navigate(`/deck/edit?deckId=${newDeckId}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Your Decks</h2>
      {loading && <p>Loading decks...</p>}
      {!loading && decks.length === 0 && <p>No decks found.</p>}
      <ul className="w-full max-w-4xl mx-auto">
        <li
          key="newDeck"
          className="flex justify-between justify-center items-center p-2 rounded my-2"
        >
          <div className="flex justify-center items-center">
            <button
              onClick={handleNewDeck}
              className="bg-purple-500 hover:bg-purple-700 text-white justify-center font-bold py-2 px-4 rounded"
            >
              Create New Deck
            </button>
          </div>
        </li>
        {decks.map((deck) => (
          <li
            key={deck.deckId}
            className="flex justify-between items-center p-2 bg-gray-800 rounded my-2"
          >
            <span className="font-bold truncate max-w-[70%]">
              {deck.deckName}
            </span>
            <div className="space-x-2">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                onClick={() => handleEdit(deck.deckId)}
              >
                Edit
              </button>
              {deck.isActive ? (
                <button
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                  onClick={() => {}}
                >
                  Active
                </button>
              ) : (
                <button
                  className="bg-red-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                  onClick={() => handleSetActive(deck.deckId)}
                >
                  Set Active
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const DeckListPage = () => {
  const location = useLocation();
  return <DecksListPageInterface key={location.pathname} />;
};

export default DeckListPage;
