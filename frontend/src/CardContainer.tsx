import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";
import gameStore, { Card } from "./models/GameStore";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";

import CardComponent, {
  EmptyCard,
  OpponentCardFrameComponent,
  PlayerCardFrameComponent,
} from "./Card";
import deckStore from "./models/DeckModel";

interface CardContainerProps {
  id: string;
}

const CardContainerComponent: React.FC<CardContainerProps> = ({ id }) => {
  const gameData = useObservable(gameStore);
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="mb-1 mt-1">
      <section>
        <motion.div
          key={id + gameData.tick}
          ref={setNodeRef}
          id={id}
          layout
          className="h-min-[140px] w-full flex flex-shrink-0 flex-wrap gap-y-1 justify-center touch-pan-x items-center p-2 border border-gray-700 rounded bg-gray-800 shadow-sm"
        >
          <SortableContext
            key={id + gameData.tick}
            items={gameData.getZone(id).map((card) => card.id) && [id]}
            strategy={rectSortingStrategy}
            id={id}
          >
            {gameData.getZone(id).length ? (
              <AnimatePresence>
                {gameData.getZone(id).map((card) => (
                  <CardComponent
                    key={card + id + gameData.tick}
                    card={card}
                    containerId={id}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <EmptyCard
                key={"emptyCard" + gameData.tick}
                container={id}
                text={id === "dropzone" ? "Your Board" : "Your hand"}
              />
            )}
          </SortableContext>
        </motion.div>
      </section>
    </div>
  );
};

export const DeckBuilderCardContainerComponent: React.FC<
  CardContainerProps
> = ({ id }) => {
  const deckData = useObservable(deckStore);
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="mb-1 mt-1">
      <section>
        <motion.div
          key={id}
          ref={setNodeRef}
          id={id}
          layout
          className="h-min-[140px] w-full flex flex-shrink-0 flex-wrap gap-y-1 justify-center touch-pan-x items-center p-2 border border-gray-700 rounded bg-gray-800 shadow-sm"
        >
          <SortableContext
            items={deckData.getZone(id).map((card) => card.id) && [id]}
            strategy={rectSortingStrategy}
            id={id}
          >
            {deckData.getZone(id).length ? (
              <AnimatePresence>
                {deckData.getZone(id).map((card) => (
                  <CardComponent key={card + id} card={card} containerId={id} />
                ))}
              </AnimatePresence>
            ) : (
              <EmptyCard
                key={"emptyCard" + id}
                container={id}
                text={
                  id === "dropzone"
                    ? "No Cards In Your Deck."
                    : "No Cards Left To Put Into Deck."
                }
              />
            )}
          </SortableContext>
        </motion.div>
      </section>
    </div>
  );
};

export default CardContainerComponent;

export const OpponentDropZone: React.FC = () => {
  const gameData = useObservable(gameStore);
  return (
    <div className="mb-1 mt-1 w-full">
      <section>
        <div className="flex-shrink-0 flex flex-wrap gap-y-1 h-min-[140px] w-full justify-center items-center flex-wrap p-2 border border-gray-700 rounded bg-gray-800 shadow-sm">
          {gameData.opponentDropzone.length === 0 ? (
            <EmptyCard container="opponentDropzone" text="Opponent Board" />
          ) : (
            gameData.opponentDropzone.map((card) => (
              <OpponentCardFrameComponent
                key={`opponent ${card.id}`}
                card={card}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export const AbilityQueue: React.FC = () => {
  const gameData = useObservable(gameStore);
  return (
    <div className="-mb-2 -mt-2 w-full scale-75">
      <section>
        <div className="flex-shrink-0 flex flex-wrap gap-y-1 h-min-[140px] w-full justify-center items-center p-2 border border-gray-700 rounded bg-gray-800 shadow-sm">
          {!gameData.abilityQueue.length ? (
            <EmptyCard container="AbilityQueue" text="AbilityQueue" />
          ) : (
            gameData.abilityQueue.map((abilityQueueItem, index) =>
              gameData.playerId == abilityQueueItem.playerId ? (
                <PlayerCardFrameComponent
                  key={`abilityqueue-${abilityQueueItem.card.id}-${abilityQueueItem.playerId}-${index}`}
                  card={abilityQueueItem.card as Card}
                />
              ) : (
                <OpponentCardFrameComponent
                  key={`abilityqueue-${abilityQueueItem.card.id}-${abilityQueueItem.playerId}-${index}`}
                  card={abilityQueueItem.card as Card}
                />
              ),
            )
          )}
        </div>
      </section>
    </div>
  );
};
