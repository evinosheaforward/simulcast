import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";

interface CardContainerProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

const CardContainerComponent: React.FC<CardContainerProps> = ({
  id,
  title,
  children,
}) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="mb-2">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <motion.div
        ref={setNodeRef}
        layout
        className="flex space-x-2 p-2 border rounded bg-gray-100 min-h-[140px] w-full"
      >
        {children}
      </motion.div>
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
  console.log("Opponent drop zoen re-render");
  return (
    <div className="mb-2">
      <h2 className="text-xl font-bold mb-2">Opponent Drop Zone</h2>
      <div className="flex space-x-2 p-2 border rounded bg-gray-100 min-h-[140px] w-full">
        {cards.map((card) => (
          <motion.div
            layout
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-center w-20 h-[120px] border-2 border-[#333] rounded-lg bg-[#ff5f6d] cursor-move"
          >
            {card.content}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
