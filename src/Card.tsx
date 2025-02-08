import React from "react";
import { CardType } from "./Game";

// Extend your CardProps to include x and y coordinates.
interface CardProps {
  cardType: CardType;
  onDropped: () => void;
}

const Card: React.FC<CardProps> = ({ cardType, onDropped }) => {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("cardType", cardType);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    console.log(`Card ${cardType} drag ended.`);
    if (e.dataTransfer.dropEffect === "move") {
      onDropped();
    }
  };

  return (
    <div
      className="text-center w-20 h-[120px] border-2 border-[#333] rounded-lg bg-[#ff5f6d] cursor-grab"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {cardType.toUpperCase()}
    </div>
  );
};

export default Card;
