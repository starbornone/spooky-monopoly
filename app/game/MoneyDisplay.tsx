import { BoardSpace } from "./data";
import { useEffect, useState } from "react";
import { Artwork } from "./Artwork";

import "./MoneyDisplay.css";

interface MoneyDisplayProps {
  money: number;
  ownedProperties: BoardSpace[];
}

export const MoneyDisplay = ({ money, ownedProperties }: MoneyDisplayProps) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 750);
    return () => clearTimeout(t);
  }, [money]);

  return (
    <div className="money-display">
      <div className="money-display__balance">
        <span className="money-display__label"><Artwork name="banknotes" /> Cash</span>
        <span
          className={`money-display__amount ${pulse ? "money-display__amount--pulse" : ""}`}
        >
          ${money}
        </span>
      </div>

      <div className="money-display__properties">
        <div className="money-display__properties-header"><Artwork name="manor" /> Properties</div>
        <ul className="money-display__properties-list">
          {ownedProperties.length > 0 &&
            ownedProperties.map(property => (
              <li key={property.id} className="money-display__property">
                {property.name}{" "}
                <span className="money-display__property-rent">
                  (${property.rent}/visit)
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};
