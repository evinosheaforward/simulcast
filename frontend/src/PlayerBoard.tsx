import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";

import CardContainerComponent, { OpponentDropZone } from "./CardContainer";
import gameStore, { CardSnapshot } from "./GameStore";
import GameOptions from "./GameStart";
import { CardDragOverlayComponent } from "./Card";
import { getSnapshot } from "mobx-state-tree";

const GAME_DURATION = 10; // seconds

type ActiveCard = CardSnapshot | null;

const PlayerBoard: React.FC = () => {
  const gameData = useObservable(gameStore);
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);
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
    cardCost: number,
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
        cardCost,
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
      setActiveCard(!card ? null : getSnapshot(card));
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
        activeCard!.cost,
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
      <div className="overflow-y-auto flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-black p-2 md:p-1 sm:p-0">
        <div className="w-full max-w-4xl bg-gray-900 rounded-lg shadow-xl p-2 md:p-1 sm:p-1 flex flex-col grid auto-rows-auto gap-1">
          {/* Header */}
          <GameOptions />

          {/* Opponent Drop Zone */}
          <OpponentDropZone cards={gameData.opponentDropzone} />

          {/* Drop Zone */}
          <CardContainerComponent id="dropzone" title="Drop Zone" />

          {/* Your Hand */}
          <CardContainerComponent id="hand" title="Your Hand" />

          <footer className="flex flex-col items-center">
            <p className="text-sm text-gray-300 mb-1 text-center">
              Order Cards in the Drop Zone to play your cards against your
              oppenent
              <br />
              {gameData.gameStatus == "PLAY"
                ? `You have ${timeRemaining} second${timeRemaining !== 1 ? "s" : ""}`
                : gameData.gameStatus == "RESOLUTION"
                  ? "Round is being scored - see what your opponent played"
                  : "Waiting for you opponent"}
            </p>
            <button
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
              onClick={handleSubmitCards}
            >
              Submit Cards
            </button>
          </footer>
        </div>
        {/* Drag overlay: Animate the overlay appearance */}
        {activeCard && <CardDragOverlayComponent card={activeCard} />}
      </div>
    </DndContext>
  );
};

export default PlayerBoard;
