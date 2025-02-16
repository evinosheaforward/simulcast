import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";
import gameStore from "./GameStore";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";

import CardComponent, { EmptyCard, CardFrameComponent } from "./Card";

interface CardContainerProps {
  id: string;
  title: string;
}

const CardContainerComponent: React.FC<CardContainerProps> = ({
  id,
  title,
}) => {
  const gameData = useObservable(gameStore);
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="mb-1">
      <section>
        <h2 className="text-xl font-bold text-center text-white mb-1">
          {id === "dropzone" ? "  " : ""}
          {title}
          {id === "dropzone" &&
          gameData.gameStatus != "PLAY" &&
          gameData.tick === gameData.playerId
            ? "⏳"
            : "  "}
        </h2>
        <motion.div
          ref={setNodeRef}
          id={id}
          layout
          className="flex-shrink-0 flex justify-center touch-pan-x items-center p-2 md:p-1 sm:p-0 border border-gray-700 rounded bg-gray-800 h-[140px] w-full shadow-sm"
        >
          <SortableContext
            items={gameData.getZone(id).map((card) => card.id) && [id]}
            strategy={rectSortingStrategy}
            id={id}
          >
            {gameData.getZone(id).length > 0 ? (
              <AnimatePresence>
                {gameData.getZone(id).map((card) => (
                  <CardComponent
                    key={gameData.updateKey + card.id}
                    card={card}
                    containerId={id}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <EmptyCard
                container={id}
                text={
                  id === "dropzone"
                    ? "Place your cards here"
                    : "Your hand is empty"
                }
              />
            )}
          </SortableContext>
        </motion.div>
      </section>
    </div>
  );
};

export default CardContainerComponent;

export const OpponentDropZone: React.FC = () => {
  const gameData = useObservable(gameStore);
  return (
    <div className="mb-1">
      <section>
        <h2 className="text-xl font-bold text-center text-white mb-1">
          {"  "}
          Opponent's Play
          {gameData.gameStatus != "PLAY" &&
          gameData.tick != null &&
          gameData.tick !== gameData.playerId
            ? "⏳"
            : "  "}
        </h2>
        <div className="flex-shrink-0 flex justify-center items-center flex-wrap p-2 md:p-1 sm:p-1 border border-gray-700 rounded bg-gray-800 h-[140px] w-full shadow-sm">
          {gameData.opponentDropzone.map((card) => (
            <motion.div
              key={`opponent ${card.id}`}
              layout
              whileHover={{ scale: 1.75, zIndex: 1000 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#D35400] text-white shadow-md"
            >
              <CardFrameComponent
                key={gameData.updateKey + card.id}
                card={card}
              />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
