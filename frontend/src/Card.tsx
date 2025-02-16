import React from "react";
import { useSortable } from "@dnd-kit/sortable";

import { getSnapshot } from "mobx-state-tree";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { DragOverlay } from "@dnd-kit/core";
import gameStore, { Card, CardSnapshot } from "./GameStore";
import { useObservable } from "mst-use-observable";

interface CardComponentProps {
  card: Card;
  containerId: string;
}

const CardComponent: React.FC<CardComponentProps> = ({ card, containerId }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: card.id,
      data: { containerId },
    });
  const gameData = useObservable(gameStore);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ scale: 1.75, zIndex: 1000 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center text-center w-20 h-[120px] border-1 border-gray-700 rounded-lg bg-[#27AE60] text-white cursor-move shadow-md"
    >
      <CardFrameComponent key={gameData.updateKey} card={getSnapshot(card)} />
    </motion.div>
  );
};

export default CardComponent;

export const EmptyCard: React.FC<{ container: string; text: string }> = ({
  container,
  text,
}) => {
  const {
    attributes,
    setNodeRef, // transform, transition,
    listeners,
  } = useSortable({
    id: container,
    data: { containerId: container },
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      {...listeners}
      {...attributes}
      className="flex items-center justify-center w-full h-[120px] touch-none pointer-events-none bg-transparent shadow-md text-center text-lg text-gray-400 italic"
    >
      {text}
    </motion.div>
  );
};

export const CardDragOverlayComponent: React.FC<{ card: CardSnapshot }> = ({
  card,
}) => {
  return (
    <DragOverlay>
      {card.id && card.content && (
        <motion.div
          layout
          className="flex items-center justify-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#27AE60] text-white shadow-lg"
          // Animate overlay appearance with a slight scale effect
          initial={{ scale: 0.95, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0.8 }}
        >
          <CardFrameComponent card={card} />
        </motion.div>
      )}
    </DragOverlay>
  );
};

export const CardFrameComponent: React.FC<{ card: CardSnapshot }> = ({
  card,
}) => {
  return (
    <>
      <div className="relative flex w-20 h-[120px] overflow-hidden shadow-md items-center justify-center">
        {/* Speed - Top-left */}
        <div className="absolute top-0 left-0 text-[7px] font-bold bg-transparent px-1 py-0.5 rounded">
          ⏳{card.timer == null ? card.speed : card.timer}
        </div>

        {/* Name - Top-center */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-[7px] text-center font-bold bg-transparent px-1 py-0.5 rounded">
          {card.id}
        </div>

        {/* Cost - Top-right */}
        <div className="absolute top-0 right-0.5 text-[7px] font-bold bg-transparent px-1 py-0.5 rounded">
          🔮{card.cost}
        </div>

        {/* Card Image - Center Top */}
        <div className="absolute top-4 w-11/12 h-5/12 flex items-center justify-center overflow-hidden">
          <img
            src={`/images/${card.id}.png`}
            alt={card.content}
            className="w-full h-full object-cover justify-center"
          />
        </div>

        {/* Card Content - Bottom Center */}
        <div className="absolute top-18 left-1/2 transform -translate-x-1/2 w-full text-center text-[6px] font-medium px-0.3 py-0 rounded">
          {card.content}
        </div>
      </div>
    </>
  );
};
