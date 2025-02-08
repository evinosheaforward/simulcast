import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

export enum CardType {
  ROCK = "rock",
  PAPER = "paper",
  SCISSORS = "scissors",
}

export type Card = {
  id: number;
  content: CardType;
};

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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="text-center w-20 h-[120px] border-2 border-[#333] rounded-lg bg-[#ff5f6d] cursor-move"
    >
      {card.content}
    </motion.div>
  );
};

export default CardComponent;
