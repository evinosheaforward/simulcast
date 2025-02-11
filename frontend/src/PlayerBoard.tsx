import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { useObservable } from "mst-use-observable";

import CardComponent from "./Card";
import CardContainerComponent, { OpponentDropZone } from "./CardContainer";
import gameStore from "./GameStore";
import GameOptions from "./GameStart";

const GAME_DURATION = 10; // seconds

type CardStruct = {
  id: string;
  content: string;
} | null;

const PlayerBoard: React.FC = () => {
  const gameData = useObservable(gameStore);
  const [activeCard, setActiveCard] = useState<CardStruct>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);

  useEffect(() => {
    if (gameData.gameStatus != "PLAY") {
      return;
    }
    if (timeRemaining <= 0) {
      setActiveCard(null);
      gameData.submitRound();
      setTimeRemaining(10);
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, gameData]);

  const getContainer = useCallback(
    (cardId: string): string | undefined => {
      if (gameData.hand.some((card) => card.id === cardId)) {
        return "hand";
      }
      if (gameData.dropzone.some((card) => card.id === cardId)) {
        return "dropzone";
      }
      return undefined;
    },
    [gameData],
  );

  const moveOrReorderCard = (
    activeContainer: string,
    overContainer: string,
    activeCardId: string,
    overId: string,
    gameData: typeof gameStore,
  ) => {
    console.log(`Move or Re-order card: 
      ${activeContainer} 
      ${overContainer}
      ${activeCardId}
      ${overId}
      ${gameData}
    `);
    if (activeContainer === overContainer) {
      gameData.reorderCardWithinZone(activeContainer, activeCardId, overId);
    } else {
      gameData.moveCardBetweenZones(
        activeContainer,
        overContainer,
        activeCardId,
        overId,
      );
    }
  };

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      console.log(`Drag Start event: ${active.id}`);
      const containerId = getContainer(active.id as string);
      if (!containerId) return;
      const card = gameData
        .getZone(containerId)
        .find((c) => c.id === active.id);
      setActiveCard(!card ? null : { id: card.id, content: card.content });
    },
    [gameData, activeCard, getContainer],
  );

  // When a drag ends, either reorder within a container or move between containers.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      console.log(`DragEndEvent: ${active.id}, ${over?.id}`);
      if (over === null || gameData.gameStatus != "PLAY") {
        console.log(
          `drag event short-circuit - ${over}, ${gameData.gameStatus}`,
        );
        setActiveCard(null);
        return;
      }

      const activeContainer = getContainer(active.id as string);
      let overContainer: string | undefined;
      if (over.id === "hand" || over.id === "dropzone") {
        // over the zone
        overContainer = over.id;
      } else {
        // over a card
        overContainer = getContainer(over.id as string);
      }
      if (!activeContainer || !overContainer) {
        console.log(
          `drag event short-circuit containers - ${activeContainer}, ${overContainer}`,
        );
        setActiveCard(null);
        return;
      }
      moveOrReorderCard(
        activeContainer,
        overContainer,
        activeCard!.id,
        over!.id as string,
        gameData,
      );
      setActiveCard(null);
    },
    [gameData, setActiveCard, getContainer, moveOrReorderCard],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
  }, [activeCard]);

  const handleSubmitCards = () => {
    setActiveCard(null);
    gameData.submitRound();
    setTimeRemaining(10);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="max-w-3xl mx-auto p-4 flex min-h-screen">
        {/* Main game grid */}
        <div className="grid grid-rows-5 gap-2 bg-black text-white p-4 min-h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Rock-Paper-Scissors</h1>
            <GameOptions />
          </div>
          {/* Opponent Drop Zone */}
          <OpponentDropZone
            cards={gameData.opponentDropzone.map((card) => {
              return { id: card.id, content: card.content };
            })}
          />

          {/* Drop Zone */}
          <CardContainerComponent id="dropzone" title="Drop Zone">
            <SortableContext
              items={gameData.dropzone.map((card) => card.id)}
              strategy={rectSortingStrategy}
            >
              <AnimatePresence>
                {gameData.dropzone.map((card) => (
                  <CardComponent
                    key={card.id}
                    cardId={card.id}
                    cardContent={card.content}
                    containerId="dropzone"
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </CardContainerComponent>

          {/* Your Hand */}
          <CardContainerComponent id="hand" title="Your Hand">
            <SortableContext
              items={gameData.hand.map((card) => card.id)}
              strategy={rectSortingStrategy}
            >
              <AnimatePresence>
                {gameData.hand.map((card) => (
                  <CardComponent
                    key={card.id}
                    cardId={card.id}
                    cardContent={card.content}
                    containerId="hand"
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </CardContainerComponent>
          <div>
            <p className="mb-4">
              Order Cards in the Drop Zone to play your cards against your
              oppenent!
              <br />
              {gameData.gameStatus == "PLAY"
                ? `You have ${timeRemaining} second${timeRemaining !== 1 ? "s" : ""}`
                : gameData.gameStatus == "RESOLUTION" ? "Round is being scored - see what your opponent played!" : "Waiting for you opponent!"}
            </p>
            <button
              className="mt-1 bg-black hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleSubmitCards}
            >
              Submit Cards
            </button>
          </div>
        </div>
      </div>

      {/* Drag overlay: Animate the overlay appearance */}
      <DragOverlay>
        {activeCard && (
          <motion.div
            layout
            className="text-center w-20 h-[120px] border-2 border-[#333] rounded-lg bg-[#ff5f6d] shadow"
            // Animate overlay appearance with a slight scale effect
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0.8 }}
          >
            {activeCard!.content}
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default PlayerBoard;
