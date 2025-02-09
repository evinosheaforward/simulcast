import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
// import { useObservable } from "mst-react";

import CardComponent, { Card, CardType } from "./Card";
import CardContainerComponent, { CardContainer } from "./CardContainer";
// import { gameStore } from "./GameStore";

const GAME_DURATION = 10; // seconds

const PlayerBoard: React.FC = () => {
  //const data = useObservable(gameStore);
  const startingHand = Array.from({ length: 3 }, (_, i) => {
    return {
      id: i,
      content: Object.values(CardType)[Math.floor(Math.random() * 3)],
    } as Card;
  });
  // Manage cards in each container (“hand” and “dropzone”)
  const [containers, setContainers] = useState<CardContainer>({
    hand: startingHand,
    dropzone: [],
  });
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameReset, setGameReset] = useState<number>(0);

  useEffect(() => {
    if (gameOver) return;
    if (timeRemaining <= 0) {
      setGameOver(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, gameOver]);

  const getContainer = useCallback(
    (cardId: number): string | undefined => {
      if (containers.hand.some((card) => card.id === cardId)) {
        return "hand";
      }
      if (containers.dropzone.some((card) => card.id === cardId)) {
        return "dropzone";
      }
      return undefined;
    },
    [containers],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const containerId = getContainer(active.id as number);
      if (!containerId) return;
      const card = containers[containerId].find((c) => c.id === active.id);
      setActiveCard(card || null);
    },
    [containers, getContainer],
  );

  // When a drag ends, either reorder within a container or move between containers.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || gameOver) {
        setActiveCard(null);
        return;
      }

      const activeContainer = getContainer(active.id as number);
      let overContainer: string | undefined;
      if (over.id === "hand" || over.id === "dropzone") {
        overContainer = over.id;
      } else {
        overContainer = getContainer(over.id as number);
      }

      if (!activeContainer || !overContainer) {
        setActiveCard(null);
        return;
      }

      // Reordering within the same container.
      if (activeContainer === overContainer) {
        setContainers((prev) => {
          const items = prev[activeContainer];
          const oldIndex = items.findIndex((card) => card.id === active.id);
          let newIndex: number;
          if (over.id === activeContainer) {
            newIndex = items.length;
          } else {
            newIndex = items.findIndex((card) => card.id === over.id);
          }
          if (oldIndex === -1 || newIndex === -1) return prev;
          return {
            ...prev,
            [activeContainer]: arrayMove(items, oldIndex, newIndex),
          };
        });
      } else {
        setContainers((prev) => {
          const sourceItems = [...prev[activeContainer]];
          const targetItems = [...prev[overContainer!]];
          const sourceIndex = sourceItems.findIndex(
            (card) => card.id === active.id,
          );
          if (sourceIndex === -1) return prev;
          const [movedCard] = sourceItems.splice(sourceIndex, 1);

          // If dropped on the container background, append to the end.
          let targetIndex: number;
          if (over.id === overContainer) {
            targetIndex = targetItems.length;
          } else {
            targetIndex = targetItems.findIndex((card) => card.id === over.id);
            if (targetIndex === -1) {
              targetIndex = targetItems.length;
            }
          }
          targetItems.splice(targetIndex, 0, movedCard);
          return {
            ...prev,
            [activeContainer]: sourceItems,
            [overContainer!]: targetItems,
          };
        });
      }
      setActiveCard(null);
    },
    [getContainer, gameOver],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
  }, []);

  const handleSubmitCards = () => {
    setGameOver(true);
  };

  const handlePlayAgain = () => {
    const newHand = Array.from({ length: 3 }, (_, i) => {
      return {
        id: i,
        content: Object.values(CardType)[Math.floor(Math.random() * 3)],
      } as Card;
    });
    setContainers({
      hand: newHand,
      dropzone: [],
    });
    setTimeRemaining(GAME_DURATION);
    setGameOver(false);
    // Increment the counter so Deck knows to re-draw
    setGameReset((prev) => prev + 1);
    console.log(gameReset);
  };
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

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="max-w-3xl mx-auto p-4 flex min-h-screen">
        {/* Main game grid */}
        <div className="grid grid-rows-4 gap-3 bg-black text-white p-4 min-h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Rock-Paper-Scissors</h1>
            <p className="mb-4">
              Drag and drop one card into the drop zone below.
              <br />
              You have {timeRemaining} second
              {timeRemaining !== 1 ? "s" : ""}.
            </p>
            <button
              className="mt-1 bg-black hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleSubmitCards}
            >
              Submit Cards
            </button>
          </div>
          {/* Drop Zone */}
          <CardContainerComponent id="dropzone" title="Drop Zone">
            <SortableContext
              items={containers.dropzone.map((card) => card.id)}
              strategy={rectSortingStrategy}
            >
              <AnimatePresence>
                {containers.dropzone.map((card) => (
                  <CardComponent
                    key={card.id}
                    card={card}
                    containerId="dropzone"
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </CardContainerComponent>

          {/* Your Hand */}
          <CardContainerComponent id="hand" title="Your Hand">
            <SortableContext
              items={containers.hand.map((card) => card.id)}
              strategy={rectSortingStrategy}
            >
              <AnimatePresence>
                {containers.hand.map((card) => (
                  <CardComponent key={card.id} card={card} containerId="hand" />
                ))}
              </AnimatePresence>
            </SortableContext>
          </CardContainerComponent>

          <div className="text-center">
            {gameOver && (
              <div className="p-4 bg-black text-white text-center rounded">
                {containers.dropzone.length > 0
                  ? `You played ${JSON.stringify(containers.dropzone.map((card) => card.content))}!`
                  : "Oops, you didn't play a card!"}
                <br />
                <button
                  className="mt-4 bg-black hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  onClick={handlePlayAgain}
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay: Animate the overlay appearance */}
      <DragOverlay>
        {activeCard ? (
          <motion.div
            layout
            className="text-center w-20 h-[120px] border-2 border-[#333] rounded-lg bg-[#ff5f6d] shadow"
            // Animate overlay appearance with a slight scale effect
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0.8 }}
          >
            {activeCard.content}
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PlayerBoard;
