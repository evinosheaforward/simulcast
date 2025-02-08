// Game.tsx (snippet)
import React, { useState, useEffect, useCallback } from "react";
import DropZone from "./DropZone";
import Deck from "./Deck";

export type CardType = "rock" | "paper" | "scissors";

const GAME_DURATION = 30; // seconds

const Game: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameOver, setGameOver] = useState<boolean>(false);
  // Add a counter to signal a new game (this will be passed to Deck)
  const [gameReset, setGameReset] = useState<number>(0);

  const handleDrop = useCallback((card: "rock" | "paper" | "scissors") => {
    setSelectedCard(card);
    setGameOver(true);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    if (timeRemaining <= 0) {
      setGameOver(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, gameOver]);

  const handlePlayAgain = () => {
    setSelectedCard(null);
    setTimeRemaining(GAME_DURATION);
    setGameOver(false);
    // Increment the counter so Deck knows to re-draw
    setGameReset((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen">
      {/* Main game grid */}
      <div className="grid grid-rows-4 gap-4 bg-black text-white p-4 min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Rock-Paper-Scissors</h1>
          <p className="mb-4">
            Drag and drop one card into the drop zone below. You have{" "}
            {timeRemaining} second{timeRemaining !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="flex justify-center items-center">
          <DropZone onDropCard={handleDrop} />
        </div>

        <Deck gameReset={gameReset} />

        <div className="text-center">
          {gameOver && (
            <div className="mt-8 p-4 bg-black text-white text-center rounded">
              {selectedCard
                ? `You played ${selectedCard}!`
                : "Oops, you didn't play a card!"}
              <br />
              <button
                className="mt-4 bg-black hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={handlePlayAgain}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;
