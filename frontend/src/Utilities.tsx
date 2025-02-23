import { useObservable } from "mst-use-observable";
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import gameStore from "./GameStore";

interface NotificationProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  message,
  duration = 1000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return ReactDOM.createPortal(
    <span className="text-[#C10007]">
      {"    "}
      {message}
    </span>,
    document.getElementById("notEnoughMana")!,
  );
};

export const UpdateLog: React.FC = () => {
  const gameData = useObservable(gameStore);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameData]); // Scroll to bottom when children change

  return (
    <div className="grid justify-items-center items-center mt-2 mb-2">
      <div
        ref={scrollRef}
        className="w-full max-w-md justify-center text-center text-white border-gray-700 rounded align-bottom h-[98px] overflow-y-auto bg-gray-800"
      >
        <p key={gameData.updateLog.join()}>Game Log</p>
        {gameData.updateLog.map((log, index) => (
          <p key={index.toString()}>
            {log}
            <br />
          </p>
        ))}
      </div>
    </div>
  );
};
