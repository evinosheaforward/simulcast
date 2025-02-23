// backend/routes/game.ts
import { Router, Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { Card, populate, randomName } from "simulcast-common";
import Game, { GameState } from "../models/RulesEngine";

const games: Map<string, Game> = new Map();

const router = Router();

/** POST /api/game/create
 *  Creates a new game using an optional gameId and a host playerName.
 *  Returns a game token (the gameId) and the host player's id.
 */
router.post("/create", (req: Request, res: Response) => {
  const { gameId } = req.body;
  console.log("game ID: ", gameId);
  const finalGameId = gameId || randomName();
  console.log("final game ID: ", finalGameId);
  const newGame = new Game(finalGameId);
  games.set(finalGameId, newGame);
  res.json({ gameId: finalGameId, playerId: newGame.players[0].id });
});

/** POST /api/game/createBotGame */
router.post("/createBotGame", (req: Request, res: Response) => {
  const { gameId } = req.body;
  console.log("game ID: ", gameId);
  const finalGameId = gameId || randomName();
  console.log("final game ID: ", finalGameId);
  const newGame = new Game(finalGameId);
  newGame.addBot();
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
    async ({ gameId, playerId }: { gameId: string; playerId: string }) => {
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
      socket.join(gameId);
      console.log(`player: ${playerId} joined: ${game.id}`);
      socket.join(playerId);
      console.log(`player: ${playerId} joined player socket`);

      await game.playerJoined(playerId, io);

      if (game.players.length === 2) {
        await game.startGame(io);
      } else {
        console.log("only 1 player");
        socket.emit("waitingForOpponent");
      }
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
        socket.disconnect();
        return;
      }
      const player = game.players.find((p) => p.id === playerId);
      if (!player) {
        socket.emit("error", { message: "Player not found" });
        socket.disconnect();
        return;
      }
      player.dropzone = populate(dropzone);

      let cheated = false;
      for (const item of player.dropzone) {
        // Check if `target` already has an element with the same `id`
        const index = player.hand.findIndex((t) => t.id === item.id);
        if (index !== -1) {
          player.hand.splice(index, 1);
        } else {
          cheated = true;
          console.log("CHEAT? card that wasn't in hand into dropzone");
        }
      }
      if (cheated) {
        player.dropzone = [];
      }
      player.hand = hand;
      player.submitted = true;

      if (game.players.every((p) => p.submitted) || game.isBotGame) {
        game.state = GameState.RESOLUTION;
        console.log("roundSubmitted by both players");
        game.roundSubmitted(io);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // updates scores here as well
        await game.resolveRound(io);
        // After resolution, reset submissions and deal new hands for the next round
        game.newRound(io);
      } else {
        console.log("Waiting for second player to submit");
      }
    },
  );
}

export default router;
