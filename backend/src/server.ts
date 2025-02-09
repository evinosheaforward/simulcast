import express from "express";
import router from "./routes/Game";
import { Server } from "socket.io";

const app = express();
const port = process.env.PORT || 5000;

// Parse JSON bodies
app.use(express.json());

// Register the game API routes under /api/game
app.use("/api/game", router);

// Optionally serve your frontend (if you’re doing SSR or serving a built React app)
// app.use(express.static("build"));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

/*
  useEffect(() => {
    // Connect to the socket when the component mounts.
    gameStore.connectSocket();
    return () => {
      gameStore.disconnectSocket();
    };
  }, [gameStore]);

  const handleSubmit = async () => {
    // Your move data here (for example, the cards played)
    const moveData = {
      // ... move details,
      gameStatus: 'submittedByThisPlayer' // The backend logic will reconcile both players' moves.
    };
    await gameStore.submitMove(moveData);
  };
  */
