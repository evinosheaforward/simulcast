// backend/routes/game.ts
import { Router, Request, Response } from "express";
import { getSnapshot, applySnapshot } from "mobx-state-tree";
import { GameStoreModel } from "../models/GameStore";

const router = Router();

// In-memory game storage (for demo purposes)
const games: { [gameId: string]: typeof GameStoreModel.Type } = {};

// GET /api/game/:gameId
router.get("/:gameId", (req: Request, res: Response) => {
    const { gameId } = req.params;
    res.send(`gameId: ${gameId}`);
    // If no game exists for this gameId, create a default one.
    if (!games[gameId]) {
        games[gameId] = GameStoreModel.create({
            gameId,
            playerId: "unknown", // You could refine this if you pass player details in your request
            hand: [],
            dropzone: [],
            opponentDropzone: [],
        });
    }
    // res.json(getSnapshot(games[gameId]));
});

// POST /api/game/:gameId
router.post("/:gameId", (req: Request<{ gameId: string }>, res: Response) => {
    const { gameId } = req.params;
    const data = req.body;
    if (!games[gameId]) {
        res.status(404).json({ error: "Game not found" });
    }
    try {
        // Use MST to validate and apply the new snapshot.
        applySnapshot(games[gameId], data);
        res.json(getSnapshot(games[gameId]));
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
    res.send();
});

export default router;
