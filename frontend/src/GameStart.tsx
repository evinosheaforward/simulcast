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
    console.log(`try join game with id: ${joinGameId}`);
    if (!joinGameId) return;
    gameStore.joinGame(joinGameId);
  };

  return (
    <div className="items-center justify-center p-1 grid auto-rows-auto gap-1 place-items-center">
      <div>
        <button
          onClick={handleCreateGame}
          className="flex-none w-50 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-1 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
        >
          Create New Game
        </button>
      </div>
      <div>
        <button
          onClick={handleJoinGame}
          className="flex-none w-50 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
        >
          Join Game
        </button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Game ID to Join"
          value={joinGameId}
          onChange={(e) => setJoinGameId(e.target.value)}
          className="flex-none w-50 bg-gray-700 text-center text-white border border-gray-600 rounded py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div className="text-center text-white grid grid-rows-1 m-1">
        {gameData.gameId ? (
          <>
            <div>
              Connected to game:{" "}
              <span className="font-bold">{gameData.gameId}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <p>Not connected to a game.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameOptions;
