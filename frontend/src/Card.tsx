import React from "react";
import { useSortable } from "@dnd-kit/sortable";

import { getSnapshot } from "mobx-state-tree";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { DragOverlay } from "@dnd-kit/core";
import { Card, CardSnapshot } from "./GameStore";

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
      className="flex items-center justify-center text-center w-20 h-[120px] border-1 border-gray-700 rounded-lg text-white cursor-move shadow-md"
    >
      <PlayerCardFrameComponent card={getSnapshot(card)} />
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
      className="flex items-center justify-center w-full h-[120px] touch-none pointer-events-none bg-transparent shadow-md text-center text-lg text-gray-400 font-bold"
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
          className="flex items-center justify-center w-20 h-[120px] border-2 border-gray-700 rounded-lg text-white shadow-lg"
          initial={{ scale: 1.0, opacity: 0.8 }}
          animate={{ scale: 1.0, opacity: 1 }}
          exit={{ scale: 1.0, opacity: 0.8 }}
        >
          <PlayerCardFrameComponent card={card} />
        </motion.div>
      )}
    </DragOverlay>
  );
};

export const CardFrameComponent: React.FC<{ card: CardSnapshot }> = ({
  card,
}) => {
  return (
    <div className="select-none relative flex w-20 h-[120px] overflow-hidden shadow-md items-center justify-center">
      {/* Time - Top-left */}
      <div className="absolute top-0 left-0 text-[7px] font-bold bg-transparent px-1 py-0.5 rounded">
        ⏳{card.timer == null ? card.time : card.timer}
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
      <div className="absolute top-4 w-11/12 h-6/12 flex items-center justify-center bg-[#000000]">
        <img
          src={`/images/${card.id}.png`}
          alt={card.content}
          className="w-full h-full object-cover justify-center select-none "
        />
      </div>

      {/* Card Content - Bottom Center */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-11/12 text-center text-[6px] font-medium px-0.3 py-0 rounded">
        {card.content}
      </div>
    </div>
  );
};

export const PlayerCardFrameComponent: React.FC<{ card: CardSnapshot }> = ({
  card,
}) => {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.75, zIndex: 500 }}
      whileTap={{ scale: 1.75, zIndex: 500 }}
      className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#564434] text-white shadow-md"
    >
      <CardFrameComponent card={card as Card} />
    </motion.div>
  );
};

export const OpponentCardFrameComponent: React.FC<{ card: CardSnapshot }> = ({
  card,
}) => {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.75, zIndex: 1000 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#8c3720] text-white shadow-md"
    >
      <CardFrameComponent card={card as Card} />
    </motion.div>
  );
};
