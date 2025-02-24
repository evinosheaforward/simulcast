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
        const response = await fetch(urlOf(`/deck/list`), {
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
      const response = await fetch(urlOf(`/deck/setActive`), {
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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Your Decks</h2>
      {loading && <p>Loading decks...</p>}
      {!loading && decks.length === 0 && <p>No decks found.</p>}
      <ul className="space-y-2">
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
