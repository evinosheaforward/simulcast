import React from "react";
import { CardType } from "./Game";

// Extend your CardProps to include x and y coordinates.
interface CardProps {
  cardType: CardType;
}

const Card: React.FC<CardProps> = ({ cardType }) => {
  // onDragStart: set the card type in the dataTransfer object so the drop zone can know what was dropped.
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("cardType", cardType);
  };

  return (
    <div
      className="text-center w-20 h-[120px] border-2 border-[#333] rounded-lg bg-[#ff5f6d] cursor-grab"
      draggable
      onDragStart={onDragStart}
    >
      {cardType.toUpperCase()}
    </div>
  );
};

export default Card;
