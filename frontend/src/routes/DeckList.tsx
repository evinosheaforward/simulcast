// DecksListPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // or useHistory for react-router v5
import { urlOf } from "../Utilities"; // your helper function for API URLs

interface Deck {
  deckId: string;
  name: string;
}

const DecksListPage: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDecks() {
      setLoading(true);
      try {
        // Example request pattern.
        const response = await fetch(urlOf(`/api/deck/list`), {
          method: "GET",
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (response.ok) {
          const data = await response.json();
          // Expecting data.decks to be an array of { deckId, name } objects.
          setDecks(data.decks);
        }
      } catch (error) {
        console.error("Error fetching decks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDecks();
  }, []);

  async function handleSetActive(deckId: string) {
    try {
      const response = await fetch(urlOf(`/api/deck/setActive`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ deckId }),
      });
      if (response.ok) {
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
      <ul className="space-y-2 flex flex-col items-center">
        <li
          key="newDeck"
          className="flex justify-between items-center p-2 bg-gray-800 rounded"
        >
          <div className="space-x-2">
            <button
              onClick={handleNewDeck}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Create New Deck
            </button>
          </div>
        </li>
        {decks.map((deck) => (
          <li
            key={deck.deckId}
            className="flex justify-between items-center p-2 bg-gray-800 rounded"
          >
            <span>{deck.name}</span>
            <div className="space-x-2">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                onClick={() => handleEdit(deck.deckId)}
              >
                Edit
              </button>
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                onClick={() => handleSetActive(deck.deckId)}
              >
                Set Active
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DecksListPage;
