import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";
import gameStore from "./GameStore";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";

import CardComponent, { EmptyCard } from "./Card";

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
          {title}
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
                    key={card.id}
                    cardId={card.id}
                    cardContent={card.content}
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

interface OpponentDropZoneProps {
  cards: {
    id: string;
    content: string;
  }[];
}

export const OpponentDropZone: React.FC<OpponentDropZoneProps> = ({
  cards,
}) => {
  return (
    <div className="mb-1">
      <section>
        <h2 className="text-xl font-bold text-center text-white mb-1">
          Opponent Drop Zone
        </h2>
        <div className="flex-shrink-0 flex justify-center items-center flex-wrap p-2 md:p-1 sm:p-1 border border-gray-700 rounded bg-gray-800 h-[140px] w-full shadow-sm">
          {cards.map((card) => (
            <motion.div
              layout
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-red-500 text-white cursor-move shadow-md"
            >
              {card.content}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
