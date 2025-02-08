import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";

import { Card } from "./Card";

export type CardContainer = {
  [key: string]: Card[];
};

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
