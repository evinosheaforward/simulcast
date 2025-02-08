import React, { useState, useEffect, useCallback } from "react";
import Card from "./Card";
import DropZone from "./DropZone";

const GAME_DURATION = 30; // seconds

export type CardType = "rock" | "paper" | "scissors";

const Game: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Called when a card is dropped into the drop zone
  const handleDrop = useCallback((card: CardType) => {
    setSelectedCard(card);
    setGameOver(true);
  }, []);

  // Timer effect: counts down until time runs out or the game is over.
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
  };

  return (
    <div className="flex min-h-screen">
      {/* Title text */}
      <div className="grid grid-rows-4 gap-4 bg-black text-white p-4 min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Rock-Paper-Scissors</h1>
          <p className="mb-4">
            Drag and drop one card into the drop zone below. You have{" "}
            {timeRemaining} second{timeRemaining !== 1 ? "s" : ""}.
          </p>
        </div>

        {/* Drop Zone at the top-center with tan background */}
        <div className="flex justify-center items-center">
          <DropZone onDropCard={handleDrop} />
        </div>

        {/* Grid for the cards: three columns */}
        <div className="grid grid-cols-3 justify-items-center items-center">
          <Card cardType="rock" />
          <Card cardType="paper" />
          <Card cardType="scissors" />
        </div>

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

      {/* Deck sidebar */}
      <div className="w-1/5 grid grid-rows-4 gap-4 p-4 min-h-screen">
        <div className="flex items-center justify-center row-start-3 text-xl font-bold">
          Deck
        </div>
      </div>
    </div>
  );
};

export default Game;
