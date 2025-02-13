export type Card = {
  id: string;
  content: string;
  cost: number;
  speed: number;
};

export const Deck: Card[] = [
  {
    id: "Crown",
    content: "Gain 3 mana next turn.",
    cost: 2,
    speed: 2,
  },
  {
    id: "Ring",
    content: "Gain 1 mana next turn.",
    cost: 1,
    speed: 1,
  },
  {
    id: "Cloud",
    content: "Prevent the next damage you would take this turn.",
    cost: 1,
    speed: 1,
  },
  {
    id: "Diamond",
    content: "Gain 2 mana next turn.",
    cost: 0,
    speed: 3,
  },
  {
    id: "Goblet",
    content: "Gain 3 health.",
    cost: 2,
    speed: 1,
  },
  {
    id: "Helm",
    content: "Gain prevent all damage next turn.",
    cost: 2,
    speed: 4,
  },
  {
    id: "Spark",
    content: "Deal 2 damage.",
    cost: 1,
    speed: 1,
  },
  {
    id: "Flame",
    content: "Deal 5 damage.",
    cost: 3,
    speed: 3,
  },
];

export default Deck;
