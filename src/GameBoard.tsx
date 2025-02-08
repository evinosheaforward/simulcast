import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

/* ===========================
   Types & Initial Data
=========================== */

type Card = {
  id: string;
  content: string;
};

type Containers = {
  [key: string]: Card[];
};

const initialHand: Card[] = [
  { id: "card-1", content: "Card 1" },
  { id: "card-2", content: "Card 2" },
  { id: "card-3", content: "Card 3" },
];

/* ===========================
   Sortable Card Component
=========================== */

interface SortableCardProps {
  card: Card;
  containerId: string;
}

const SortableCard: React.FC<SortableCardProps> = ({ card, containerId }) => {
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
      // The `layout` prop tells Framer Motion to animate positional changes.
      layout
      style={style}
      {...attributes}
      {...listeners}
      // Adding some hover and tap animations for extra polish.
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-4 bg-black border rounded shadow cursor-move"
    >
      {card.content}
    </motion.div>
  );
};

/* ===========================
   Container Component
=========================== */

interface CardContainerProps {
  id: string;
  cards: Card[];
  title: string;
  children: React.ReactNode;
}

const CardContainer: React.FC<CardContainerProps> = ({
  id,
  // cards,
  title,
  children,
}) => {
  // Register the container as a droppable target.
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <motion.div
        ref={setNodeRef}
        // Animate layout changes in the container as cards are added, removed, or moved.
        layout
        className="flex space-x-2 p-2 border rounded bg-gray-100 min-h-[100px]"
      >
        {children}
      </motion.div>
    </div>
  );
};

/* ===========================
   Main CardGame Component
=========================== */

const Game: React.FC = () => {
  // Manage cards in each container (“hand” and “dropzone”)
  const [containers, setContainers] = useState<Containers>({
    hand: initialHand,
    dropzone: [],
  });

  // Track the currently dragged card for the drag overlay.
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  // Given a card ID, determine which container it belongs to.
  const getContainer = useCallback(
    (cardId: string): string | undefined => {
      if (containers.hand.some((card) => card.id === cardId)) return "hand";
      if (containers.dropzone.some((card) => card.id === cardId))
        return "dropzone";
      return undefined;
    },
    [containers],
  );

  // When a drag starts, set the active card for the drag overlay.
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const containerId = getContainer(active.id as string);
      if (!containerId) return;
      const card = containers[containerId].find((c) => c.id === active.id);
      setActiveCard(card || null);
    },
    [containers, getContainer],
  );

  // When a drag ends, either reorder within a container or move between containers.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) {
        setActiveCard(null);
        return;
      }

      const activeContainer = getContainer(active.id as string);
      let overContainer: string | undefined;
      // When dropping on a container’s background, over.id equals the container’s id.
      if (over.id === "hand" || over.id === "dropzone") {
        overContainer = over.id;
      } else {
        overContainer = getContainer(over.id as string);
      }

      if (!activeContainer || !overContainer) {
        setActiveCard(null);
        return;
      }

      if (activeContainer === overContainer) {
        // Reordering within the same container.
        setContainers((prev) => {
          const items = prev[activeContainer];
          const oldIndex = items.findIndex((card) => card.id === active.id);
          let newIndex: number;
          if (over.id === activeContainer) {
            // Dropped on the container background.
            newIndex = items.length;
          } else {
            newIndex = items.findIndex((card) => card.id === over.id);
          }
          if (oldIndex === -1 || newIndex === -1) return prev;
          return {
            ...prev,
            [activeContainer]: arrayMove(items, oldIndex, newIndex),
          };
        });
      } else {
        // Moving a card from one container to another.
        setContainers((prev) => {
          const sourceItems = [...prev[activeContainer]];
          const targetItems = [...prev[overContainer!]];
          const sourceIndex = sourceItems.findIndex(
            (card) => card.id === active.id,
          );
          if (sourceIndex === -1) return prev;
          const [movedCard] = sourceItems.splice(sourceIndex, 1);

          // If dropped on the container background, append to the end.
          let targetIndex: number;
          if (over.id === overContainer) {
            targetIndex = targetItems.length;
          } else {
            targetIndex = targetItems.findIndex((card) => card.id === over.id);
            if (targetIndex === -1) {
              targetIndex = targetItems.length;
            }
          }
          targetItems.splice(targetIndex, 0, movedCard);
          return {
            ...prev,
            [activeContainer]: sourceItems,
            [overContainer!]: targetItems,
          };
        });
      }
      setActiveCard(null);
    },
    [getContainer],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
  }, []);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="max-w-3xl mx-auto p-4">
        {/* Your Hand */}
        <CardContainer id="hand" cards={containers.hand} title="Your Hand">
          <SortableContext
            items={containers.hand.map((card) => card.id)}
            strategy={rectSortingStrategy}
          >
            <AnimatePresence>
              {containers.hand.map((card) => (
                <SortableCard key={card.id} card={card} containerId="hand" />
              ))}
            </AnimatePresence>
          </SortableContext>
        </CardContainer>

        {/* Drop Zone */}
        <CardContainer
          id="dropzone"
          cards={containers.dropzone}
          title="Drop Zone"
        >
          <SortableContext
            items={containers.dropzone.map((card) => card.id)}
            strategy={rectSortingStrategy}
          >
            <AnimatePresence>
              {containers.dropzone.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  containerId="dropzone"
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </CardContainer>
      </div>

      {/* Drag overlay: Animate the overlay appearance */}
      <DragOverlay>
        {activeCard ? (
          <motion.div
            layout
            className="p-4 bg-white border rounded shadow"
            // Animate overlay appearance with a slight scale effect
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0.8 }}
          >
            {activeCard.content}
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Game;
