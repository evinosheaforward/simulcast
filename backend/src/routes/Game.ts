// backend/routes/game.ts
import { Router, Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

export enum GameState {
  WAITING_FOR_PLAYER = "WAITING_FOR_PLAYER",
  PLAY = "PLAY",
  WAITING_FOR_SUBMISSIONS = "WAITING_FOR_SUBMISSIONS",
  RESOLUTION = "RESOLUTION",
}

export interface Player {
  id: string;
  socketId?: string;
  hand: Card[];
  dropzone: Card[];
  submitted: boolean;
  winCount: number;
  lossCount: number;
}

export interface Game {
  id: string;
  players: Player[];
  state: GameState;
}

export interface Card {
  id: string;
  content: string;
}

// In-memory store for games
const games: Map<string, Game> = new Map();

/** Utility: Draw a hand (abstract implementation) */
function drawHand(): Card[] {
  const deck = ["Rock", "Paper", "Scissors"];
  const hand: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const card = {
      id: i.toString(),
      content: deck[Math.floor(Math.random() * deck.length)],
    } as Card;
    hand.push(card);
  }
  return hand;
}

const router = Router();

/** POST /api/game/create
 *  Creates a new game using an optional gameId and a host playerName.
 *  Returns a game token (the gameId) and the host player's id.
 */
router.post("/create", (req: Request, res: Response) => {
  const { gameId } = req.body;
  const finalGameId = gameId || uuidv4().split("-")[0];
  const hostPlayer: Player = {
    id: uuidv4(),
    hand: [],
    dropzone: [],
    submitted: false,
    winCount: 0,
    lossCount: 0,
  };
  const newGame: Game = {
    id: finalGameId,
    players: [hostPlayer],
    state: GameState.WAITING_FOR_PLAYER,
  };
  games.set(finalGameId, newGame);
  res.json({ gameId: finalGameId, playerId: hostPlayer.id });
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
  const joinPlayer: Player = {
    id: uuidv4(),
    hand: [],
    dropzone: [],
    submitted: false,
    winCount: 0,
    lossCount: 0,
  };
  game.players.push(joinPlayer);
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
      io.to(gameId).emit("waitingForOpponent", game);

      if (game.players.length === 2) {
        game.state = GameState.PLAY;
        game.players.forEach((player) => (player.hand = drawHand()));
        io.to(gameId).emit("roundStart", game);
        game.state = GameState.WAITING_FOR_SUBMISSIONS;
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
        io.to(gameId).emit("roundSubmitted", game);
        console.log("start waiting 10 seconds");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        console.log("done waiting 10 seconds");
        // updates scores here as well
        resolveRound(game);
        // After resolution, reset submissions and deal new hands for the next round
        game.players.forEach((p) => {
          p.submitted = false;
          p.hand = drawHand();
          p.dropzone = [];
        });
        game.state = GameState.PLAY;
        io.to(gameId).emit("roundStart", game);
        game.state = GameState.WAITING_FOR_SUBMISSIONS;
      } else {
        socket.emit("waitingForOpponent", game);
      }
    },
  );
}

function resolveRound(game: Game): void {
  const [player1, player2] = game.players;
  const rounds = Math.max(player1.dropzone.length, player2.dropzone.length);

  for (let i = 0; i < rounds; i++) {
    const card1 = player1.dropzone[i];
    const card2 = player2.dropzone[i];

    if (card1 && card2) {
      if (card1.content === card2.content) {
        continue;
      } else if (
        (card1.content === "Rock" && card2.content === "Scissors") ||
        (card1.content === "Scissors" && card2.content === "Paper") ||
        (card1.content === "Paper" && card2.content === "Rock")
      ) {
        // Player 1 wins.
        player1.winCount++;
        player2.lossCount++;
      } else {
        // Otherwise, player 2 wins.
        player2.winCount++;
        player1.lossCount++;
      }
    } else if (card1 && !card2) {
      // Only player1 played a card.
      player1.winCount++;
      player2.lossCount++;
    } else if (!card1 && card2) {
      // Only player2 played a card.
      player2.winCount++;
      player1.lossCount++;
    }
  }
}

export default router;
