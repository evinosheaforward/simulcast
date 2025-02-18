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
import { Notification } from "./Utilities";
import PageFrame from "./PageFrame";

export const ROUND_DURATION = 15; // seconds

type ActiveCard = CardSnapshot | null;

const PlayerBoard: React.FC = () => {
  const gameData = useObservable(gameStore);
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(ROUND_DURATION);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState("");

  useEffect(() => {
    if (gameData.gameId) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [gameData.gameId]); // or any observable value that triggers a re-render

  const triggerNotification = (notification: string) => {
    setNotificationText(notification);
    setShowNotification(true);
  };

  const handleCloseNotification = useCallback(
    () => setShowNotification(false),
    [],
  );

  useEffect(() => {
    if (gameData.gameStatus != "PLAY") {
      return;
    }
    if (timeRemaining <= 0) {
      setActiveCard(null);
      gameData.submitRound();
      setTimeRemaining(ROUND_DURATION);
      return;
    }
    const timer = setInterval(() => {
      if (gameData.gameStatus === "PLAY") {
        setTimeRemaining((t) => t - 1);
      }
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
      if (overContainer === "dropzone" && cardCost > gameData.mana) {
        console.log("Not enough Mana");
        triggerNotification("Not enough Mana!");
        return;
      }
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
    setTimeRemaining(ROUND_DURATION);
  };

  return (
    <PageFrame>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Header */}
        <GameOptions />

        {/* Opponent Drop Zone */}
        <div className="text-center justify-center text-white">
          <p>
            {gameData.gameStatus != "PLAY" &&
            gameData.tick != null &&
            gameData.tick !== gameData.playerId
              ? "⏳"
              : "  "}{" "}
            Health:{" "}
            <span className="font-bold">
              {gameData.opponentHealth === Number.MIN_SAFE_INTEGER
                ? " "
                : gameData.opponentHealth}
            </span>
            {"    /    "}
            Mana:{" "}
            <span className="font-bold">
              {gameData.opponentMana === Number.MIN_SAFE_INTEGER
                ? " "
                : gameData.opponentMana}
            </span>
          </p>
        </div>
        <OpponentDropZone key={gameStore.updateKey + "opponentDropzone"} />

        <div className="text-center justify-center text-white">
          <p className="mb-2 font-bold">
            {gameData.gameOver
              ? !gameData.gameId ||
                gameData.gameStatus === "WAITING_FOR_OPPONENT"
                ? "Game hasn't started"
                : "Game over"
              : gameData.goesFirst
                ? "You go first this round"
                : "Your opponent goes first this round"}
          </p>
        </div>

        {/* Player Drop Zone */}
        <div className="text-center justify-center text-white">
          <p id="playerDropzoneText">
            {gameData.gameStatus != "PLAY" &&
            gameData.tick === gameData.playerId
              ? "⏳"
              : "  "}{" "}
            Health:{" "}
            <span className="font-bold">
              {gameData.health === Number.MIN_SAFE_INTEGER
                ? " "
                : gameData.health}
            </span>
            {"    /    "}
            Mana:{" "}
            <span className="font-bold">
              {gameData.mana === Number.MIN_SAFE_INTEGER ? " " : gameData.mana}
            </span>
          </p>
        </div>

        {/* Not enough Mana overlay */}
        <div>
          {showNotification && (
            <Notification
              message={notificationText}
              onClose={handleCloseNotification}
              duration={2000} // Displays for 2 seconds
            />
          )}
        </div>

        <CardContainerComponent
          key={gameStore.updateKey + "dropzone"}
          id="dropzone"
        />

        <div className="grid w-full place-items-center">
          {gameData.gameStatus == "PLAY" ? (
            <button
              className="w-full justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-101"
              onClick={handleSubmitCards}
            >
              Submit Early - You have {timeRemaining} second
              {timeRemaining !== 1 ? "s" : ""}
            </button>
          ) : (
            <button
              className="w-full justify-center bg-red-600 text-white font-bold py-2 px-4 rounded shadow-md"
              onClick={handleSubmitCards}
            >
              {gameData.gameOver
                ? "Game Over"
                : gameData.gameStatus == "RESOLUTION"
                  ? "Round is resolving"
                  : "Waiting for your opponent"}
            </button>
          )}
        </div>

        {/* Your Hand */}
        <CardContainerComponent id="hand" />
        {/* Drag overlay: Animate the overlay appearance */}
        {activeCard && <CardDragOverlayComponent card={activeCard} />}
      </DndContext>
    </PageFrame>
  );
};

export default PlayerBoard;
