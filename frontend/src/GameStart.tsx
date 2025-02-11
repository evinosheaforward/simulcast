// Example UI Component: GameOptions.tsx
import React, { useState } from "react";
import gameStore from "./GameStore";
import { useObservable } from "mst-use-observable";

const GameOptions: React.FC = () => {
  const gameData = useObservable(gameStore);
  const [joinGameId, setJoinGameId] = useState("");

  const handleCreateGame = () => {
    gameStore.createGame();
  };

  const handleJoinGame = () => {
    if (!joinGameId) return;
    gameStore.joinGame(joinGameId);
  };

  return (
    <div>
      <button onClick={handleCreateGame}>Create New Game</button>
      <br />
      <input
        type="text"
        placeholder="Game ID to Join"
        value={joinGameId}
        onChange={(e) => setJoinGameId(e.target.value)}
      />
      <button onClick={handleJoinGame}>Join Game</button>
      {gameData.gameId && (
        <div>
          <p>Connected to game: {gameData.gameId}</p>
          <br />
          <p>
            Score is: {gameData.winCount} to {gameData.lossCount}.
          </p>
        </div>
      )}
    </div>
  );
};

export default GameOptions;
