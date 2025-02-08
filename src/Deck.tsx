// Deck.tsx
import React, { useEffect, useState, useRef } from "react";
import { animated, useSprings } from "@react-spring/web";
import { CardType } from "./Game";
import Card from "./Card";

interface DeckProps {
  gameReset: number;
}

const types: CardType[] = ["rock", "paper", "scissors"];

const Deck: React.FC<DeckProps> = ({ gameReset }) => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [containerWidth, setContainerWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newCards = Array.from(
      { length: 3 },
      () => types[Math.floor(Math.random() * 3)],
    );
    setCards(newCards);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const [springs, api] = useSprings(cards.length, (index: number) => {
    const spacing = containerWidth / cards.length;
    const x = spacing * index + spacing / 2;

    return {
      opacity: 1,
      transform: `translate(${x}px, 0px)`,
      config: { tension: 170, friction: 26 },
    };
  });
  useEffect(() => {
    const animations = api.start({
      opacity: 0,
      transform: `translate(0px, 0px)`,
    }) as unknown as Promise<any>[];

    Promise.all(animations).then(() => {
      const newCards = Array.from(
        { length: 3 },
        () => types[Math.floor(Math.random() * 3)],
      );
      setCards(newCards);
      const spacing = containerWidth / newCards.length;
      api.start((index: number) => {
        const x = spacing * index + spacing / 2;
        return {
          opacity: 1,
          transform: `translate(${x}px, 0px)`,
        };
      });
    });
  }, [gameReset, api]);

  const handleCardDropped = (indexToRemove: number) => {
    setCards((prevCards) =>
      prevCards.filter((_, index) => index !== indexToRemove),
    );
  };

  const AnimatedDiv = animated.div as unknown as React.FC<{
    style: any;
    children?: React.ReactNode;
    key: number;
  }>;

  return (
    <div className="relative center">
        {springs.map((styles: any, index: number) => (
          <AnimatedDiv key={index} style={{ position: "absolute", ...styles }}>
            {cards[index] && (
              <Card
                cardType={cards[index]}
                onDropped={() => handleCardDropped(index)}
              />
            )}
          </AnimatedDiv>
        ))}
    </div>
  );
};

export default Deck;
