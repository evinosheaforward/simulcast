import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import gameRoutes, { handleSocketConnection } from "./routes/Game";
import deckRoutes from "./routes/DeckRoutes";

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Mount the game API endpoints under /api/game
app.use("/api/game", gameRoutes);
app.use("/api/deck", deckRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }, // Socket.IO CORS configuration
});

// Wire up socket connections using the game module helper
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  handleSocketConnection(io, socket);
});

server.listen(5000, () => {
  console.log("Server listening on port 5000");
});
