import { useEffect, useRef } from "react";
import type { BoardSpace, PlayerToken } from "./data";
import { getPropertyActions } from "./utils/getPropertyActions";

import "./PropertyPopup.css";

interface PropertyPopupProps {
  canBuyProperties: boolean;
  canResistBuyingProperties: boolean;
  isOwned: boolean;
  money: number;
  onClose: () => void;
  onPurchase: (spaceId: number, price: number) => void;
  playerToken?: PlayerToken | null;
  space: BoardSpace;
}

export const PropertyPopup = ({
  canBuyProperties,
  canResistBuyingProperties,
  isOwned,
  money,
  onClose,
  onPurchase,
  space,
  playerToken,
}: PropertyPopupProps) => {
  const dialog = useRef<HTMLDivElement>(null);
  const isUnownedProperty = space.type === "property" && !isOwned;
  const price = space.price;
  const { canBuy, canPass, canContinue } = getPropertyActions({
    isUnownedProperty, price: space.price, money, canBuyProperties, canResistBuyingProperties
  });

  useEffect(() => {
    dialog.current?.querySelector("button")?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && canContinue) onClose();
    if (event.key !== "Tab" && !event.key.startsWith("Arrow")) return;
    const actions = Array.from(dialog.current?.querySelectorAll("button") ?? []);
    if (!actions.length) return;
    event.preventDefault();
    const direction = event.shiftKey || event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
    const current = actions.findIndex(action => action === document.activeElement);
    actions[(current + direction + actions.length) % actions.length]?.focus();
  };

  const flavorText = playerToken ? space.flavorText?.[playerToken.group] : null;

  const getOwnedPropertyText = () => {
    if (!playerToken) return "You already own this misery";

    switch (playerToken.group) {
      case "vampires":
        return "Already drained this property dry!";
      case "humans":
        return "I already invested in this place";
      case "elves":
        return "I'm unfortunately already complicit here...";
      default:
        return "You already own this misery";
    }
  };

  const getRentLabel = () => {
    if (!playerToken) return "Exploitation Fee (Rent):";

    switch (playerToken.group) {
      case "vampires":
        return "Blood Money Extraction:";
      case "humans":
        return "Monthly Income:";
      case "elves":
        return "Extortion Fee (Rent):";
      default:
        return "Exploitation Fee (Rent):";
    }
  };

  const getPriceLabel = () => {
    if (!playerToken) return "Purchase Price:";

    switch (playerToken.group) {
      case "vampires":
        return "Acquisition Cost:";
      case "humans":
        return "Investment Amount:";
      case "elves":
        return "Cost of Complicity:";
      default:
        return "Purchase Price:";
    }
  };

  return (
    <div className="property-popup">
      <div
        className="property-popup__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-popup-title"
        ref={dialog}
        onKeyDown={handleKeyDown}
      >
        <h2 className="property-popup__title" id="property-popup-title">{space.name}</h2>

        {space.type === "property" && (
          <div className="property-popup__details">
            <div className="property-popup__price">
              <span className="property-popup__label">{getPriceLabel()}</span>
              <span className="property-popup__value">${space.price}</span>
            </div>
            <div className="property-popup__rent">
              <span className="property-popup__label">{getRentLabel()}</span>
              <span className="property-popup__value">${space.rent}</span>
            </div>
          </div>
        )}

        <p className="property-popup__description">{space.description}</p>

        {isOwned && <p className="property-popup__description">{getOwnedPropertyText()}</p>}
        {!isOwned && flavorText && <p className="property-popup__description">{flavorText}</p>}
        {isUnownedProperty && canBuyProperties && !canBuy && (
          <p className="property-popup__description">You need ${space.price} to buy this property.</p>
        )}

        {canBuy && price !== undefined && (
          <button className="property-popup__button" onClick={() => onPurchase(space.id, price)}>
            Buy for ${price}
          </button>
        )}
        {canPass && <button className="property-popup__button" onClick={onClose}>Pass</button>}
        {canContinue && <button className="property-popup__button" onClick={onClose}>Continue</button>}
      </div>
    </div>
  );
};
