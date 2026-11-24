export type PlayerToken = {
  id: string;
  canBuyProperties: boolean;
  canResistBuyingProperties: boolean;
  group: "vampires" | "humans" | "elves";
  icon: string;
  startingMoney: number;
};

export const PLAYER_TOKENS: PlayerToken[] = [
  {
    id: "vampire-woman",
    icon: "🧛‍♀️",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    id: "vampire-man",
    icon: "🧛‍♂️",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    id: "vampire",
    icon: "🧛",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    id: "human-woman",
    icon: "👩‍💼",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    id: "human-man",
    icon: "👨‍💼",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    id: "human",
    icon: "🧑‍💼",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    id: "elf-woman",
    icon: "🧝‍♀️",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
  {
    id: "elf-man",
    icon: "🧝‍♂️",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
  {
    id: "elf",
    icon: "🧝",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
];

export const MAX_TURNS = 20;
