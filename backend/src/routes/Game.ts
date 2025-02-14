// backend/routes/game.ts
import { Router, Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Card } from "../models/Deck";
import Game, { GameState } from "../models/RulesEngine";

// In-memory store for games
const games: Map<string, Game> = new Map();

const router = Router();

/** POST /api/game/create
 *  Creates a new game using an optional gameId and a host playerName.
 *  Returns a game token (the gameId) and the host player's id.
 */
router.post("/create", (req: Request, res: Response) => {
  const { gameId } = req.body;
  const finalGameId = gameId || uuidv4().split("-")[0];
  const newGame = new Game(finalGameId);
  games.set(finalGameId, newGame);
  res.json({ gameId: finalGameId, playerId: newGame.players[0].id });
});

/** GET /api/game/get
 *  Retrieves a game state by its gameId.
 */
router.get("/get", (req: Request, res: Response) => {
  const { gameId } = req.query;
  if (typeof gameId !== "string") {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }
  const game = games.get(gameId);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const joinPlayer = game.addPlayer();
  res.json({ gameId: gameId, playerId: joinPlayer.id });
});

/** Socket.IO event handlers for game events */
export function handleSocketConnection(io: Server, socket: Socket) {
  socket.on(
    "joinGame",
    ({ gameId, playerId }: { gameId: string; playerId: string }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        socket.disconnect();
        return;
      }
      console.log(`player: ${playerId} trying to join game: ${game.id}`);
      if (!game.players.map((player): string => player.id).includes(playerId)) {
        socket.emit("error", { message: "You are not in this game!" });
        socket.disconnect();
        return;
      }
      console.log(`player: ${playerId} joined: ${game.id}`);
      socket.join(gameId);
      socket.emit("waitingForOpponent");
      game.startGame(io);
    },
  );

  socket.on(
    "submitRound",
    async ({
      gameId,
      playerId,
      dropzone,
      hand,
    }: {
      gameId: string;
      playerId: string;
      dropzone: Card[];
      hand: Card[];
    }) => {
      console.log(`submitRound - Player: ${playerId}`);
      const game = games.get(gameId);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }
      const player = game.players.find((p) => p.id === playerId);
      if (!player) {
        socket.emit("error", { message: "Player not found" });
        return;
      }
      player.dropzone = dropzone;
      player.hand = hand;
      player.submitted = true;

      if (game.players.every((p) => p.submitted)) {
        game.state = GameState.RESOLUTION;
        console.log("roundSubmitted by both players");
        console.log(
          `Player: ${game.players[0].id} -- ${game.players[0].dropzone.toString()}`,
        );
        console.log(
          `Player: ${game.players[1].id} -- ${game.players[1].dropzone.toString()}`,
        );
        game.roundSubmitted(io);
        // updates scores here as well
        game.resolveRound(io);
        // After resolution, reset submissions and deal new hands for the next round
        game.newRound(io);
      } else {
        socket.emit("waitingForOpponent", game);
      }
    },
  );
}

export default router;
