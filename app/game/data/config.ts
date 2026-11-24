export type PlayerToken = {
  canBuyProperties: boolean;
  canResistBuyingProperties: boolean;
  group: "vampires" | "humans" | "elves";
  icon: string;
  startingMoney: number;
};

export const PLAYER_TOKENS: PlayerToken[] = [
  {
    icon: "🧛‍♀️",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    icon: "🧛‍♂️",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    icon: "🧛",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    icon: "👩‍💼",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    icon: "👨‍💼",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    icon: "🧑‍💼",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    icon: "🧝‍♀️",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
  {
    icon: "🧝‍♂️",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
  {
    icon: "🧝",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
];

export const MAX_TURNS = 20;
