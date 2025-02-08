import React from "react";
import { CardType } from "./Game";

interface DropZoneProps {
  onDropCard: (card: CardType) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onDropCard }) => {
  // Prevent default drag over behavior
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Handle drop event: retrieve the card type and notify parent
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const card = e.dataTransfer.getData("cardType") as CardType;
    onDropCard(card);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="w-full h-[150px] items-center text-center border-2 border-dashed border-gray-300 p-6 rounded-lg text-gray-500 bg-gray-50 hover:bg-gray-100"
    >
      Drop Here
    </div>
  );
};

export default DropZone;
