import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

interface CardComponentProps {
  cardId: string;
  cardContent: string;
  containerId: string;
}

const CardComponent: React.FC<CardComponentProps> = ({
  cardId,
  cardContent,
  containerId,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: cardId,
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
      {cardContent}
    </motion.div>
  );
};

export default CardComponent;
