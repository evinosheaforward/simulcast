import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { DragOverlay } from "@dnd-kit/core";

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
      className="flex items-center justify-center text-center w-20 h-[120px] border-1 border-gray-700 rounded-lg bg-red-500 text-white cursor-move shadow-md"
    >
      {cardContent}
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

export const CardDragOverlayComponent: React.FC<{
  activeCardContent: string | undefined;
}> = ({ activeCardContent }) => {
  return (
    <DragOverlay>
      {activeCardContent && (
        <motion.div
          layout
          className="flex items-center justify-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-red-500 shadow-lg"
          // Animate overlay appearance with a slight scale effect
          initial={{ scale: 0.95, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0.8 }}
        >
          {activeCardContent}
        </motion.div>
      )}
    </DragOverlay>
  );
};
