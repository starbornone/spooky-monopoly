interface PropertyActionState {
  isUnownedProperty: boolean;
  price?: number;
  money: number;
  canBuyProperties: boolean;
  canResistBuyingProperties: boolean;
}

export function getPropertyActions({
  isUnownedProperty,
  price,
  money,
  canBuyProperties,
  canResistBuyingProperties
}: PropertyActionState) {
  const canBuy = isUnownedProperty && canBuyProperties && price !== undefined && money >= price;
  const canPass = isUnownedProperty && canResistBuyingProperties;
  return { canBuy, canPass, canContinue: !canBuy && !canPass };
}
