import { useEffect, useRef } from "react";
import { BoardSpace, PlayerToken } from "./data";

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
  const canAfford = space.price ? money >= space.price : false;
  const purchaseButtonRef = useRef<HTMLButtonElement>(null);
  const resistButtonRef = useRef<HTMLButtonElement>(null);
  const ownedButtonRef = useRef<HTMLButtonElement>(null);
  const specialButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (space.type === "property" && isOwned && ownedButtonRef.current) {
      ownedButtonRef.current.focus();
      return;
    }

    if (space.type === "special" && specialButtonRef.current) {
      specialButtonRef.current.focus();
      return;
    }

    if (space.type === "property" && !isOwned) {
      const isElf = playerToken?.group === "elves";
      const purchaseEnabled = canBuyProperties && canAfford;
      const resistEnabled = canResistBuyingProperties;

      if (isElf) {
        if (resistEnabled && resistButtonRef.current) {
          resistButtonRef.current.focus();
        } else if (purchaseEnabled && purchaseButtonRef.current) {
          purchaseButtonRef.current.focus();
        }
      } else {
        if (purchaseEnabled && purchaseButtonRef.current) {
          purchaseButtonRef.current.focus();
        } else if (resistEnabled && resistButtonRef.current) {
          resistButtonRef.current.focus();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      space.type !== "property" ||
      isOwned ||
      !purchaseButtonRef.current ||
      !resistButtonRef.current
    ) {
      return;
    }

    const purchaseEnabled = canBuyProperties && canAfford;
    const resistEnabled = canResistBuyingProperties;

    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      e.preventDefault();
      const isPurchaseButton = e.currentTarget === purchaseButtonRef.current;
      const isResistButton = e.currentTarget === resistButtonRef.current;

      if (isPurchaseButton && resistEnabled && resistButtonRef.current) {
        resistButtonRef.current.focus();
      } else if (
        isResistButton &&
        purchaseEnabled &&
        purchaseButtonRef.current
      ) {
        purchaseButtonRef.current.focus();
      }
    }
  };

  const handlePurchase = () => {
    if (space.price && canAfford) {
      onPurchase(space.id, space.price);
    }
  };

  const getFlavorText = () => {
    if (!playerToken || !space.flavorText) return null;
    return space.flavorText[playerToken.group] || null;
  };

  const getButtonText = () => {
    const flavorText = getFlavorText();
    if (flavorText) return flavorText;

    if (!playerToken) return `Buy for $${space.price}. Exploit for profit!`;

    const group = playerToken.group;

    if (canAfford && canBuyProperties) {
      switch (group) {
        case "vampires":
          return `PURCHASE FOR $${space.price}! FEED THE MACHINE!`;
        case "humans":
          return `Buy for $${space.price} - seems profitable enough`;
        case "elves":
          return `Buy for $${space.price} (against my better judgment)`;
        default:
          return `Buy for $${space.price}. Exploit for profit!`;
      }
    }

    if (!canAfford && canBuyProperties) {
      switch (group) {
        case "vampires":
          return `INSUFFICIENT BLOOD MONEY! Need $${space.price}!`;
        case "humans":
          return `Can't afford it. Need $${space.price} total`;
        case "elves":
          return `Too poor to participate in this evil (need $${space.price})`;
        default:
          return `Too poor to exploit. Need $${space.price}`;
      }
    }

    if (!canBuyProperties) {
      switch (group) {
        case "vampires":
          return "ERROR: CAPITALIST OVERRIDE ENGAGED";
        case "humans":
          return "Hmm, maybe I shouldn't do this...";
        case "elves":
          return "I refuse to participate in this exploitation!";
        default:
          return "You cannot bring yourself to do this...";
      }
    }

    return "";
  };

  const getResistText = () => {
    if (!canResistBuyingProperties) {
      if (!playerToken) return "You cannot resist...";

      switch (playerToken.group) {
        case "vampires":
          return "RESISTANCE IS FUTILE! MUST CONSUME!";
        case "humans":
          return "I can't help myself...";
        case "elves":
          return "My conscience won't let me resist!";
        default:
          return "You cannot resist...";
      }
    }

    if (!playerToken) return "Pass on this horror";

    switch (playerToken.group) {
      case "vampires":
        return "Spare this morsel... for now";
      case "humans":
        return "Maybe skip this one";
      case "elves":
        return "Resist this capitalist poison!";
      default:
        return "Pass on this horror";
    }
  };

  const getSpecialButtonText = () => {
    const flavorText = getFlavorText();
    if (flavorText) return flavorText;

    if (!playerToken) {
      return canBuyProperties
        ? "Continue exploitation"
        : "Shake your head and move on";
    }

    switch (playerToken.group) {
      case "vampires":
        return "ONWARD TO GREATER PROFITS!";
      case "humans":
        return "Keep moving, I guess";
      case "elves":
        return "This system must be dismantled...";
      default:
        return canBuyProperties
          ? "Continue exploitation"
          : "Shake your head and move on";
    }
  };

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
    <div className="property-popup" onClick={onClose}>
      <div
        className="property-popup__content"
        onClick={e => e.stopPropagation()}
      >
        <button className="property-popup__close" onClick={onClose}>
          ✕
        </button>
        <h2 className="property-popup__title">{space.name}</h2>

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

        {space.type === "property" && !isOwned && (
          <>
            <button
              ref={purchaseButtonRef}
              className={`property-popup__button property-popup__button--purchase ${
                playerToken
                  ? `property-popup__button--${playerToken.group}`
                  : ""
              }`}
              disabled={!canBuyProperties || !canAfford}
              onClick={handlePurchase}
              onKeyDown={handleKeyDown}
            >
              {getButtonText()}
            </button>
            <button
              ref={resistButtonRef}
              className={`property-popup__button ${
                playerToken
                  ? `property-popup__button--resist-${playerToken.group}`
                  : ""
              }`}
              disabled={!canResistBuyingProperties}
              onClick={onClose}
              onKeyDown={handleKeyDown}
            >
              {getResistText()}
            </button>
          </>
        )}

        {space.type === "property" && isOwned && (
          <button
            ref={ownedButtonRef}
            className={`property-popup__button ${
              playerToken
                ? `property-popup__button--owned-${playerToken.group}`
                : ""
            }`}
            onClick={onClose}
          >
            {getOwnedPropertyText()}
          </button>
        )}

        {space.type === "special" && (
          <button
            ref={specialButtonRef}
            className={`property-popup__button ${
              playerToken
                ? `property-popup__button--special-${playerToken.group}`
                : ""
            }`}
            onClick={onClose}
          >
            {getSpecialButtonText()}
          </button>
        )}
      </div>
    </div>
  );
};
