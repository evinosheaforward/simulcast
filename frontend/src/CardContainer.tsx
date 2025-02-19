import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";
import gameStore, { Card } from "./GameStore";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";

import CardComponent, { EmptyCard, CardFrameComponent } from "./Card";
import { DeckMap } from "simulcast-common";

interface CardContainerProps {
  id: string;
}

const CardContainerComponent: React.FC<CardContainerProps> = ({ id }) => {
  const gameData = useObservable(gameStore);
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="mb-1 mt-1">
      <section>
        <motion.div
          ref={setNodeRef}
          id={id}
          layout
          className="h-[140px] w-full flex flex-shrink-0 flex-wrap justify-center touch-pan-x items-center p-4 md:p-2 sm:p-1 border border-gray-700 rounded bg-gray-800 shadow-sm"
        >
          <SortableContext
            items={gameData.getZone(id).map((card) => card.id) && [id]}
            strategy={rectSortingStrategy}
            id={id}
          >
            {gameData.getZone(id).length > 0 ? (
              <AnimatePresence>
                {gameData.getZone(id).map((card) => (
                  <CardComponent card={card} containerId={id} />
                ))}
              </AnimatePresence>
            ) : (
              <EmptyCard
                container={id}
                text={id === "dropzone" ? "Your Board" : "Your hand"}
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
    <div className="mb-1 mt-1 w-full">
      <section>
        <div className="flex-shrink-0 flex h-[140px] w-full justify-center items-center flex-wrap p-4 md:p-2 sm:p-1 border border-gray-700 rounded bg-gray-800 shadow-sm">
          {gameData.opponentDropzone.length === 0 ? (
            <EmptyCard container="opponentDropzone" text="Opponent Board" />
          ) : (
            gameData.opponentDropzone.map((card) => (
              <motion.div
                key={`opponent ${card.id}`}
                layout
                whileHover={{ scale: 1.75, zIndex: 1000 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#8c3720] text-white shadow-md"
              >
                <CardFrameComponent card={card} />
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export const AbilityQueue: React.FC = () => {
  const gameData = useObservable(gameStore);
  return (
    <div className="mb-1 mt-1 w-full scale-50">
      {!gameData.abilityQueue.length ? (
        <EmptyCard container="AbilityQueue" text="AbilityQueue" />
      ) : (
        gameData.abilityQueue.map((cardId) => (
          <motion.div
            key={`opponent ${cardId}`}
            layout
            whileHover={{ scale: 1.75, zIndex: 1000 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#8c3720] text-white shadow-md"
          >
            <CardFrameComponent card={DeckMap.get(cardId) as Card} />
          </motion.div>
        ))
      )}
    </div>
  );
};
