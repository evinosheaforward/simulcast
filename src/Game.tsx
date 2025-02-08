import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine } from 'react-game-engine';
import Card from './Card';
import DropZone from './DropZone';

const GAME_DURATION = 30; // seconds

export type CardType = 'rock' | 'paper' | 'scissors';

const Game: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // This callback is passed to the drop zone so that when a card is dropped, we update the state,
  // immediately ending the game.
  const handleDrop = useCallback((card: CardType) => {
    setSelectedCard(card);
    setGameOver(true);
  }, []);

  // Timer effect: counts down every second until the game is over.
  useEffect(() => {
    if (gameOver) return; // Stop the timer if the game is over.
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

  // Define the game entities managed by React Game Engine.
  const entities: any = {
    rock: {
      x: 50,
      y: 250,
      cardType: "rock",
      renderer: (props: any) => <Card {...props} />,
    },
    paper: {
      x: 150,
      y: 250,
      cardType: "paper",
      renderer: (props: any) => <Card {...props} />,
    },
    scissors: {
      x: 250,
      y: 250,
      cardType: "scissors",
      renderer: (props: any) => <Card {...props} />,
    },
    dropZone: {
      x: 150,
      y: 100,
      renderer: (props: any) => <DropZone {...props} onDropCard={handleDrop} />,
    },
  };

  // If a card has been dropped, update its position to match the drop zone.
  if (selectedCard) {
    // Move the dropped card to the drop zone's coordinates.
    entities[selectedCard].x = entities.dropZone.x;
    entities[selectedCard].y = entities.dropZone.y;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Rock-Paper-Scissors</h1>
      <p>
        Drag and drop one card into the drop zone below. You have {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}.
      </p>
      <div style={{ border: '1px solid #ccc', height: '400px', position: 'relative' }}>
        <GameEngine
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          systems={[]} // No additional systems for this simple example.
          entities={entities}
        />
      </div>
      {gameOver && (
        <>
            <div>
            {selectedCard
                ? `You played ${selectedCard}!`
                : "Oops, you didn't play a card!"}
            </div>
            <br />
            <button onClick={handlePlayAgain}>Play Again</button>
        </>
      )}
    </div>
  );
};

export default Game;
