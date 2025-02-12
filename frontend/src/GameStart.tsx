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
    <div>
      <header className="text-center">
        <h1 className="text-4xl font-extrabold text-white mb-1">
          Rock-Paper-Scissors
        </h1>
        <h2 className="text-1xl text-white mb-1">
          Draw 5 play 3 Rock, Paper, Scissors
          <br />
          Each card you place will play R,P,S against your opponent
          <br />
          (if you don't play a card, you'll lose the point)
        </h2>

        <div className="items-center justify-center p-1 grid auto-rows-auto gap-1">
          <div className="justify-center">
            <button
              onClick={handleCreateGame}
              className="flex-none w-50 max-w-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-1 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
            >
              Create New Game
            </button>
          </div>
          <div className="justify-center">
            <button
              onClick={handleJoinGame}
              className="flex-none w-50 max-w-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-1 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
            >
              Join Game
            </button>
          </div>
          <div className="justify-center">
            <input
              type="text"
              placeholder="Game ID to Join"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              className="flex-none w-50 max-w-xl bg-gray-700 text-center text-white border border-gray-600 rounded py-2 sm:px-1 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="justify-center flex flex-col gap-1 text-center text-white grid grid-rows-2">
            {gameData.gameId ? (
              <>
                <div>
                  <p>
                    Connected to game:{" "}
                    <span className="font-bold">{gameData.gameId}</span>
                  </p>
                </div>
                <div>
                  <p>
                    Score is:{" "}
                    <span className="font-bold">{gameData.winCount}</span> to{" "}
                    <span className="font-bold">{gameData.lossCount}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p>Not connected to a game.</p>
                </div>
                <div>
                  <p></p>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default GameOptions;
