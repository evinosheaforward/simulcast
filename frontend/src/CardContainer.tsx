import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";
import gameStore, { Card } from "./GameStore";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";

import CardComponent, {
  EmptyCard,
  OpponentCardFrameComponent,
  PlayerCardFrameComponent,
} from "./Card";
import { DeckMap } from "simulcast-common";

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
          className="h-[140px] w-full flex flex-shrink-0 flex-wrap justify-center touch-pan-x items-center p-4 md:p-2 sm:p-1 border border-gray-700 rounded bg-gray-800 shadow-sm"
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

export default CardContainerComponent;

export const OpponentDropZone: React.FC = () => {
  const gameData = useObservable(gameStore);
  return (
    <div className="mb-1 mt-1 w-full">
      <section>
        <div className="flex-shrink-0 flex h-[140px] w-full justify-center items-center flex-wrap p-4 md:p-2 sm:p-1 border border-gray-700 rounded bg-gray-800 shadow-sm">
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
        <div className="flex-shrink-0 flex h-[140px] w-full justify-center items-center flex-wrap p-4 md:p-2 sm:p-1 border border-gray-700 rounded bg-gray-800 shadow-sm">
          {!gameData.abilityQueue.length ? (
            <EmptyCard container="AbilityQueue" text="AbilityQueue" />
          ) : (
            gameData.abilityQueue.map((abilityQueueItem, index) =>
              gameData.playerId == abilityQueueItem.playerId ? (
                <PlayerCardFrameComponent
                  key={`abilityqueue-${abilityQueueItem.cardId}-${abilityQueueItem.playerId}-${index}`}
                  card={DeckMap.get(abilityQueueItem.cardId) as Card}
                />
              ) : (
                <OpponentCardFrameComponent
                  key={`abilityqueue-${abilityQueueItem.cardId}-${abilityQueueItem.playerId}-${index}`}
                  card={DeckMap.get(abilityQueueItem.cardId) as Card}
                />
              ),
            )
          )}
        </div>
      </section>
    </div>
  );
};
