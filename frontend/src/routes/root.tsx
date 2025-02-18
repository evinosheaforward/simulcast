import React from "react";
import { CardFrameComponent } from "../Card";
import { DeckMap, CARDS_PER_TURN, MANA_PER_TURN } from "simulcast-common";
import { motion } from "framer-motion";
import { CardSnapshot } from "../GameStore";
import { ROUND_DURATION } from "../PlayerBoard";
import PageFrame from "../PageFrame";

export default function Root() {
  // Sort cards alphabetically by ID
  const sortedDeck = [...DeckMap.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  return (
    <PageFrame>
      <div className="items-center justify-center p-2 grid gap-1">
        <div className="place-items-center text-center">
          <a
            href="/game"
            className="inline-block flex-none w-50 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-1 rounded shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-105"
          >
            Play The Game!
          </a>
        </div>
      </div>

      {/* Card Inventory Section */}
      <section className="items-center grid place-items-center w-full">
        <h2 className="text-2xl font-bold mb-2 mt-2 text-white text-center">
          Card Inventory
        </h2>
        {/* for overflow, just add "overflow-y-auto overflow-visible h-[218px]" */}
        <div className="place-items-center w-full p-6 border border-gray-700 rounded bg-gray-800 shadow-xl">
          <div className="w-full place-items-center gap-2 grid grid-cols-[repeat(auto-fit,80px)] justify-center">
            {sortedDeck.map((card) => (
              <motion.div
                key={card.id}
                layout
                whileHover={{ scale: 1.75, zIndex: 1000 }}
                whileTap={{ scale: 1.75, zIndex: 1000 }}
                className="flex items-center justify-center text-center w-20 h-[120px] border-2 border-gray-700 rounded-lg bg-[#7c644d] text-white shadow-md"
              >
                <CardFrameComponent card={card as CardSnapshot} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section className="grid grid-cols-1 place-items-center py-8 text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">Game Rules</h2>
        <div className="w-full border border-gray-700 rounded bg-gray-800 grid grid-cols-1 place-items-center ">
          <div className="w-full max-w-xl p-4">
            <ul className="mx-auto text-left list-disc list-inside p-2 space-y-2 text-white">
              <li>Each player selects their Play of cards simultaneously.</li>
              <li>
                Cards have the following attributes:
                <ul className="text-left list-disc list-inside space-y-2 mt-1 ml-2">
                  <li>⏳: The "Time" the spell takes to activate</li>
                  <li>🔮: The "Mana Cost" of the spell</li>
                </ul>
              </li>
              <li>You gain {MANA_PER_TURN} mana at the start of each round.</li>
              <li>
                You can play any number of cards so long as you have enough
                Mana.
              </li>
              <li>
                Players have {ROUND_DURATION} seconds to player their cards.
              </li>
              <li>
                After both Player have submitted, the "resolving the round"
                begins.
              </li>
              <li>
                Cards are revealed all at once and will activate in a
                deterministic way.
              </li>
              <li>
                During the round resolution cards Activate from{" "}
                <b>Left to Right</b>.
              </li>
              <li>
                Whoever goes first will have their Left-Most card "Tick-down"
                (⏳ counts down).
              </li>
              <li>
                While it's your "Tick", if your Left-Most card has a ⏳ of 0, it
                Activates.
              </li>
              <li>
                If you have multiple cards with ⏳ of 0 in a row, they will
                activate 1 after another.
              </li>
              <li>
                Whoever <b>did not</b> have the last card activation in the
                round will go <b>First</b> in the next round.
              </li>
              <li>
                After each round, you will draw up to a hand-size of{" "}
                {CARDS_PER_TURN} cards plus or minus any modifiers
                <ul className="text-left list-disc list-inside space-y-2 mt-1 ml-2">
                  <li>
                    If you have {CARDS_PER_TURN} or more cards in hand and you
                    will draw 0 cards.
                  </li>
                  <li>
                    If you have {CARDS_PER_TURN - 1} cards in hand and have +1
                    draw you will draw 2 cards.
                  </li>
                  <li>
                    If you have {CARDS_PER_TURN} cards in hand and have -1 draw
                    you will draw 0 cards.
                  </li>
                  <li>
                    If you have {CARDS_PER_TURN - 1} cards in hand and have -1
                    draw you will draw 0 cards.
                  </li>
                </ul>
              </li>
              <li>Strategize based on your opponent's patterns to win!</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-4 text-center">
        <p>SimulCast</p>
      </footer>
    </PageFrame>
  );
}
