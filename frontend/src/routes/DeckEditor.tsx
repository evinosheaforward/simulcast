// DeckBuilderPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import { DeckBuilderCardContainerComponent } from "../CardContainer";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useObservable } from "mst-use-observable";
import { CardArrayModel, CardSnapshot } from "../models/GameStore";
import deckStore, { IDeckStore } from "../models/DeckModel";
import { getSnapshot } from "mobx-state-tree";
import { useLocation, useSearchParams } from "react-router-dom";
import { Deck, DECK_LENGTH, DeckMap } from "simulcast-common";
import { CardDragOverlayComponent } from "../Card";
import { auth, requestWithAuth } from "../Firebase";

type ActiveCard = CardSnapshot | null;

interface DeckResponse {
  deck: string[];
  deckName: string;
  deckId: string;
}

const DeckBuilderPageInterface: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId");
  const deckData = useObservable(deckStore);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);

  useEffect(() => {
    async function fetchDeck() {
      try {
        // Make a GET request to your API endpoint using the deckId.
        const response = await requestWithAuth(
          "GET",
          `/api/deck/get?deckId=${deckId}`,
        );
        if (response.ok) {
          const data = (await response.json()) as DeckResponse;

          console.log("data.deck is:", JSON.stringify(data.deck));
          deckData.setDropzone(
            structuredClone(
              data.deck.map((c: string) => DeckMap.get(c)!),
            ) as any,
          );
          deckData.setHand(
            structuredClone([
              ...Deck.filter(
                (c) => !data.deck.some((dc: string) => c.id == dc),
              ),
            ]) as any,
          );
          deckData.setName(data.deckName);
          deckData.setDeckId(data.deckId);
        } else {
          deckData.setHand(CardArrayModel.create(structuredClone([...Deck])));
        }
      } catch (error) {
        console.error("Error fetching deck:", error);
        deckData.setHand(CardArrayModel.create(structuredClone([...Deck])));
      }
      setLoadingDeck(false);
    }

    if (deckId) {
      setLoadingDeck(true);
      const unsubscribe = auth.onAuthStateChanged(fetchDeck);
      return () => unsubscribe();
    }
  }, []);

  const getContainer = useCallback(
    (cardId: string): string | undefined => {
      if (deckData.dropzone.some((card) => card.id === cardId)) {
        return "dropzone";
      }
      if (deckData.hand.some((card) => card.id === cardId)) {
        return "hand";
      }
      return undefined;
    },
    [deckData],
  );

  const moveOrReorderCard = (
    activeContainer: string,
    overContainer: string,
    activeCardId: string,
    overId: string,
    deckData: IDeckStore,
    cardCost: number,
  ) => {
    console.log(`Move or Re-order card: 
      ${activeContainer} 
      ${overContainer}
      ${activeCardId}
      ${overId}
      ${deckData}
    `);
    if (activeContainer === overContainer) {
      deckData.reorderCardWithinZone(activeContainer, activeCardId, overId);
    } else {
      deckData.moveCardBetweenZones(
        activeContainer,
        overContainer,
        activeCardId,
        overId,
        cardCost,
      );
    }
  };

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      console.log(`Drag Start event: ${active.id}`);
      const containerId = getContainer(active.id as string);
      if (!containerId) {
        return;
      }
      const card = deckData
        .getZone(containerId)
        .find((c) => c.id === active.id);
      setActiveCard(!card ? null : getSnapshot(card));
    },
    [deckData, activeCard, getContainer],
  );

  // When a drag ends, either reorder within a container or move between containers.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      console.log(`DragEndEvent: ${active.id}, ${over?.id}`);
      if (over === null) {
        console.log(`drag end over nothing`);
        setActiveCard(null);
        return;
      }

      const activeContainer = getContainer(active.id as string);
      let overContainer: string | undefined;
      if (over.id === "hand" || over.id === "dropzone") {
        // over the zone
        overContainer = over.id;
      } else {
        // over a card
        overContainer = getContainer(over.id as string);
      }
      if (!activeContainer || !overContainer) {
        console.log(
          `drag event short-circuit containers - ${activeContainer}, ${overContainer}`,
        );
        setActiveCard(null);
        return;
      }
      moveOrReorderCard(
        activeContainer,
        overContainer,
        activeCard!.id,
        over!.id as string,
        deckData,
        activeCard!.cost,
      );
      setActiveCard(null);
    },
    [deckData, setActiveCard, getContainer, moveOrReorderCard],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
  }, [activeCard]);

  const handleSubmit = async () => {
    setSubmitting(true);
    if (!deckData.name) {
      setError("Deck must have a name");
      setSubmitting(false);
      return;
    }
    if (deckData.dropzone.length != DECK_LENGTH) {
      setError(`Deck must have ${DECK_LENGTH} cards`);
      setSubmitting(false);
      return;
    }
    try {
      await deckData.submit();
      setError("");
    } catch (_: any) {
      setError("Error submitting deck");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async () => {
    setSettingActive(true);
    try {
      await deckData.setActive();
      alert("Deck set as active!");
    } catch (_: any) {
      alert("Error setting deck as active");
    } finally {
      setSettingActive(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">
        Deck Builder
        {loadingDeck ? " (Loading...)" : ""}
      </h2>
      <body className="max-w-lg mb-4">
        Create a deck of <b>{DECK_LENGTH}</b> cards. Press "Submit" to save your
        deck and press "set as active" to make it the deck you use when you play
        a game!
      </body>
      <div className="mb-4">
        <label className="block mb-1 font-bold">Deck Name</label>
        <input
          type="text"
          value={deckData.name}
          onChange={(e) => deckData.setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
          placeholder="Enter deck name"
        />
      </div>
      <div className="flex space-x-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        <button
          onClick={handleSetActive}
          disabled={settingActive}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          {settingActive ? "Setting Active..." : "Set as Active Deck"}
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </div>

      <div className="mb-4">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          autoScroll={false}
        >
          <DeckBuilderCardContainerComponent id="dropzone" />
          <DeckBuilderCardContainerComponent id="hand" />
          {activeCard && <CardDragOverlayComponent card={activeCard} />}
        </DndContext>
      </div>
    </div>
  );
};

const DeckBuilderPage = () => {
  const location = useLocation();
  return <DeckBuilderPageInterface key={location.pathname} />;
};

export default DeckBuilderPage;
