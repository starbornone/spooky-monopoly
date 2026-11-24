import { BoardSpace, MAX_TURNS } from "./data";

import "./GameInfo.css";

interface GameInfoProps {
  currentSpace: BoardSpace;
  turnCount: number;
}

export const GameInfo = ({ turnCount, currentSpace }: GameInfoProps) => {
  return (
    <div className="game-info">
      <div className="game-info__position">
        Turn:{" "}
        <span className="game-info__value">
          {turnCount}/{MAX_TURNS}
        </span>
      </div>
      <div className="game-info__current">
        Current: <span className="game-info__value">{currentSpace.name}</span>
      </div>
    </div>
  );
};
