import React from 'react';
import { CardType } from './Game';

// Extend your CardProps to include x and y coordinates.
interface CardProps {
  cardType: CardType;
  x: number;
  y: number;
}

const Card: React.FC<CardProps> = ({ cardType, x, y }) => {
  // onDragStart: set the card type in the dataTransfer object so the drop zone can know what was dropped.
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('cardType', cardType);
  };

  const cardStyle: React.CSSProperties = {
    width: '80px',
    height: '120px',
    margin: '0.5rem',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: "#ff5f6d", // or any other colorful shade
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'grab',
    position: 'absolute',
    left: x,  // use the x coordinate from the entity
    top: y,   // use the y coordinate from the entity
  };

  return (
    <div draggable onDragStart={onDragStart} style={cardStyle}>
      {cardType.toUpperCase()}
    </div>
  );
};

export default Card;
