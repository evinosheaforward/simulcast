import React from "react";
import { CARD_SYMBOLS, PlayerCardFrameComponent } from "../Card";
import {
  CARDS_PER_TURN,
  MANA_PER_TURN,
  TargetSubTypes,
  TargetTypes,
} from "simulcast-common";
import { CardSnapshot } from "../models/GameStore";
import { ROUND_DURATION } from "./PlayerBoard";
import { sortedDeck } from "../Utilities";

export default function Root() {
  return (
    <>
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

      {/* Welcome Section */}
      <section className="grid grid-cols-1 place-items-center py-8 text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">Welcome!</h2>
        <div className="w-full border border-gray-700 rounded bg-gray-800 grid grid-cols-1 place-items-center ">
          <div className="w-full max-w-xl p-4">
            SimulCast is a card game where both players play their cards at the
            same time. Cards (aka spells) get "cast" in order from
            left-to-right. All the cards in the game are shown below in the{" "}
            <b>Card Inventory</b>. At the bottom of the page is the full{" "}
            <b>Game Rules</b>.
            <br />
            The default deck is an "aggro" deck. If you make an account, you can
            build your own decks.
          </div>
        </div>
      </section>

      {/* Card Inventory Section */}
      <section className="items-center grid place-items-center w-full">
        <h2 className="text-2xl font-bold mb-2 mt-2 text-white text-center">
          Card Inventory
        </h2>
        {/* for overflow, just add "overflow-y-auto overflow-visible h-[218px]" */}
        <div className="place-items-center w-full p-6 border border-gray-700 rounded bg-gray-800 shadow-xl">
          <div className="w-full place-items-center gap-2 grid grid-cols-[repeat(auto-fit,80px)] justify-center">
            {sortedDeck.map((card) => (
              <PlayerCardFrameComponent
                key={card.id}
                card={card as CardSnapshot}
              />
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
                Cards are revealed all at once. Cards are "Cast" from{" "}
                <b>Left to Right</b>. When the round is Resolving, the Left-Most
                card for each player "Ticks down" (⏳ attribute counts down),
                alternating between players.
              </li>
              <li>
                Whoever goes first will have their Left-Most card "Tick down"
                (⏳ attribute goes down by one).
              </li>
              <li>
                While it's your turn (or "Tick"), if your Left-Most card has a
                ⏳ of 0, that card is "Cast" (its ability activates).
              </li>
              <li>
                If you have multiple cards with ⏳ of 0 in a row, they will cast
                one after another (for example this can happen if you use Steed
                because it reduces the time of your next spell).
              </li>
              <li>
                Whoever <b>did not</b> have the last card Cast in the round will
                go <b>First</b> in the next round.
              </li>
              <li>
                After each round, you will draw up to a hand-size of{" "}
                {CARDS_PER_TURN} cards or you will draw 1 card if you have{" "}
                {CARDS_PER_TURN} or more cards in hand - plus or minus any
                modifiers - examples:
                <ul className="text-left list-disc list-inside space-y-2 mt-1 ml-2">
                  <li>
                    If you have {CARDS_PER_TURN} or more cards in hand and you
                    will draw 1 cards.
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
                  <li>
                    If you have {CARDS_PER_TURN - 2} cards in hand and have +1
                    draw you will draw 3 cards.
                  </li>
                </ul>
              </li>
              <li>
                Card abilities and values:
                <ul className="text-left list-disc list-inside space-y-2 mt-1 ml-2">
                  <li>
                    The number in the bottom right of card is its "value". For
                    example for a card that says "Deal 3 damage" the value is.
                  </li>
                  <li>
                    Cards have the following types:{" "}
                    {(Object.values(TargetTypes) as string[])
                      .concat(Object.values(TargetSubTypes) as string[])
                      .filter((t) => t != TargetTypes.EXPIRATION)
                      .filter((t) => t != TargetSubTypes.SPELL_MANA)
                      .map((t) => (t == TargetTypes.SPELL ? "SPELL_VALUE" : t))
                      .map(
                        (t: string) =>
                          t
                            .toLowerCase()
                            .split("_")
                            .map(
                              (s: string) =>
                                s.charAt(0).toUpperCase() + s.slice(1),
                            )
                            .join(" ") +
                          `: ${CARD_SYMBOLS.get(t == "SPELL_VALUE" ? "SPELL" : t)}`,
                      )
                      .join(", ")}
                    . The type of the card is denoted by its symbol in the
                    bottom left corner of the card.
                    <ul className="text-left list-disc list-inside space-y-2 mt-1 ml-4">
                      <li>
                        Spell Value (✨) cards increase or decrease the value of
                        another spell.
                      </li>
                      <li>
                        Spell Time (⏳) cards change the Time of another spell.{" "}
                      </li>
                      <li>
                        Spell Counter (❌) cards prevent a spell from being
                        Cast.
                      </li>
                      <li>
                        Spell Change (🌀) cards change the value, type, and/or
                        target of spells.
                      </li>
                    </ul>
                  </li>
                  <li>
                    Cards can affect the value of other cards. For example Cloud
                    sets the value of the next damage spell your opponent Casts
                    to 0.
                  </li>
                  <li>
                    Some cards have effects that do not happen immediately.
                    Those cards have "triggers" and "expirations".
                    <ul className="text-left list-disc list-inside space-y-2 mt-1 ml-4">
                      <li>
                        Cards with triggers have conditions on when they
                        activate. For example, Sword will activate on your next
                        card that deals damage (this includes, e.g. Bow).
                      </li>
                      <li>
                        Cards with triggers "expire". This means that their
                        effect lasts until a certain time. For example, Cloud
                        triggers on a damage card the opponent Casts. It expires
                        when triggered, or at the end of the round if it doesn't
                        trigger.
                      </li>
                      <li>
                        Cards with triggers/expirations go into the "Ability
                        Queue". Cards are placed in the Ability Queue
                        left-to-right and they activate left-to-right as well.
                        For example, if you play Blood, Sword, and Goblet in
                        that order, Blood and Sword will be in the Ability
                        Queue. When Goblet is cast, first, Blood will change it
                        from healing to damage, then sword will increase the
                        damage by two. However, if you ordered it Sword, Blood,
                        Goblet then when Goblet is cast, Sword will not activate
                        because Goblet will still be a healing spell at that
                        point.
                      </li>
                      <li>
                        Abilities in the ability queue are not modified once
                        they are in the queue. If you play Crypt one turn and
                        you opponent plays Cloud the next, the Cloud will not
                        affect the Crypt trigger that happens at the end of the
                        round.
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-4 text-center">
        <p>SimulCast</p>
      </footer>
    </>
  );
}
