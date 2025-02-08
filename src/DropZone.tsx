import React from 'react';
import { CardType } from './Game';

interface DropZoneProps {
  onDropCard: (card: CardType) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onDropCard }) => {
  // Allow dropping by preventing the default behavior.
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // When a card is dropped, read the card type from dataTransfer and notify the parent.
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const card = e.dataTransfer.getData('cardType') as CardType;
    onDropCard(card);
  };

  const zoneStyle: React.CSSProperties = {
    width: '150px',
    height: '150px',
    border: '3px dashed #555',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    position: 'absolute', // Position is set by the entity (via x and y)
    left: 0,
    top: 0,
  };

  return (
    <div onDragOver={onDragOver} onDrop={onDrop} style={zoneStyle}>
      Drop Here
    </div>
  );
};

export default DropZone;
