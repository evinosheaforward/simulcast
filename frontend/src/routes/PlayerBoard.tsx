import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";

import CardContainerComponent, {
  AbilityQueue,
  OpponentDropZone,
} from "../CardContainer";
import gameStore, { CardSnapshot } from "../models/GameStore";
import GameOptions from "../GameStart";
import { CardDragOverlayComponent } from "../Card";
import { getSnapshot } from "mobx-state-tree";
import { Notification, UpdateLog } from "../Utilities";

export const ROUND_DURATION = 30; // seconds

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
        top: 352,
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
      if (!containerId) {
        return;
      }
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
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
    >
      {/* Header */}
      <GameOptions key="gameOptions" />

      <UpdateLog key={gameData.updateLog.join("")} />
      <div className="text-center text-white grid grid-rows-1 m-1">
        {gameData.gameId ? (
          <>
            <div>
              Connected to game:{" "}
              <span className="font-bold">{gameData.gameId}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <p>Not connected to a game.</p>
            </div>
          </>
        )}
      </div>
      <AbilityQueue />

      {/* Opponent Drop Zone */}
      <PlayerStats
        key="opponentPlayerStats"
        playerId={gameData.opponentPlayerId}
        isPlayer={false}
      />
      <OpponentDropZone key="opponentDropzone" />

      <div className="text-center justify-center text-white">
        <p className="mb-2 font-bold">
          {!gameData.gameId || gameData.gameStatus === "WAITING_FOR_OPPONENT"
            ? "Game hasn't started"
            : gameData.gameOver
              ? "Game over"
              : gameData.goesFirst
                ? "You go first this round"
                : "Your opponent goes first this round"}
        </p>
      </div>

      {/* Player Drop Zone */}
      {/* Not enough Mana overlay */}
      <div className="grid grid-cols-1 grid-rows-2 place-items-center">
        <div id="notEnoughMana">
          {showNotification && (
            <Notification
              message={notificationText}
              onClose={handleCloseNotification}
              duration={2000} // Displays for 2 seconds
            />
          )}
        </div>
        <PlayerStats
          key="thisPlayerStats"
          playerId={gameData.playerId}
          isPlayer={true}
        />
      </div>

      <CardContainerComponent id="dropzone" />

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
  );
};

const PlayerStats: React.FC<{ playerId: string; isPlayer: boolean }> = ({
  playerId,
  isPlayer,
}) => {
  const gameData = useObservable(gameStore);
  const title = isPlayer ? "playerDropzoneText" : "opponentDropzoneText";
  return (
    <div className="flex flex-nowrap justify-center">
      <div className="relative inline-block">
        <span className="absolute left-0 -translate-x-full whitespace-nowrap">
          {gameData.gameStatus != "PLAY" &&
          gameData.tick &&
          gameData.tick == playerId
            ? "⏳ "
            : "   "}
        </span>
        <span className="text-center text-white whitespace-nowrap">
          <p id={title}>
            <b>
              {playerId
                ? `${playerId.trim()}: `
                : isPlayer
                  ? "You: "
                  : "Opponent: "}
            </b>
            Health:{" "}
            <span className="font-bold">
              {isPlayer
                ? gameData.health === Number.MIN_SAFE_INTEGER
                  ? " "
                  : gameData.health
                : gameData.opponentHealth === Number.MIN_SAFE_INTEGER
                  ? " "
                  : gameData.opponentHealth}
            </span>
            {"    /    "}
            Mana:{" "}
            <span className="font-bold">
              {isPlayer
                ? gameData.mana === Number.MIN_SAFE_INTEGER
                  ? " "
                  : gameData.mana
                : gameData.opponentMana === Number.MIN_SAFE_INTEGER
                  ? " "
                  : gameData.opponentMana}
            </span>
            {!isPlayer && (
              <>
                {"    /    "}
                Cards In Hand:{" "}
                <span className="font-bold">
                  {gameData.opponentCardsInHand === Number.MIN_SAFE_INTEGER
                    ? " "
                    : gameData.opponentCardsInHand}
                </span>
              </>
            )}
          </p>
        </span>
      </div>
    </div>
  );
};

export default PlayerBoard;
