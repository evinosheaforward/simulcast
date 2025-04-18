import React, { useState } from "react";

/** ---------- core algorithm (TypeScript port of your Python) ---------- */

type Rewards = Record<number, number>;

/**
 * Stair‑step prize distribution.
 *
 * @param n        number of players who enter
 * @param unit     multiply each “$1” tick by this amount (default 5)
 * @returns        { place → prize }  — e.g. {1: 9, 2: 8, …}
 */
function distributePrizes(n: number, unit = 5): Rewards {
  let pool = 2 * n; // 2 × entry count
  const rewards: Rewards = {};

  while (pool > 0) {
    const winners = Math.ceil(n / 2); // paid places
    for (let i = 1; i <= winners && pool > 0; i++) {
      for (let j = 1; j <= i && pool > 0; j++) {
        rewards[j] = (rewards[j] ?? 0) + 1;
        pool -= 1;
      }
    }
  }

  // convert “tick” counts to dollar amounts
  for (const k in rewards) rewards[+k] *= unit;
  return rewards;
}

/** ---------- React component ---------- */

const PrizeCalculator: React.FC = () => {
  const [players, setPlayers] = useState("");
  const [result, setResult] = useState<Rewards | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(players, 10);
    if (Number.isNaN(n) || n < 1) {
      setResult(null); // bad input
      return;
    }
    setResult(distributePrizes(n)); // run algorithm
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* input -------------------------------------------------------- */}
        <label className="block">
          <span className="text-gray-700">Number of players</span>
          <input
            type="number"
            min="1"
            required
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            className="mt-1 w-full rounded-md border-gray-300 shadow-sm
                       focus:border-indigo-500 focus:ring focus:ring-indigo-200
                       focus:ring-opacity-50"
            placeholder="e.g. 17"
          />
        </label>

        {/* button ------------------------------------------------------- */}
        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 py-2 font-semibold
                     text-white transition hover:bg-indigo-700"
        >
          Calculate
        </button>

        {/* output ------------------------------------------------------- */}
        {result && (
          <textarea
            readOnly
            className="h-48 w-full resize-none rounded-md border border-gray-300
                       p-3 shadow-sm"
            value={JSON.stringify(result, null, 2)}
          />
        )}
      </form>
    </div>
  );
};

export default PrizeCalculator;
