export type PlayerToken = {
  id: string;
  canBuyProperties: boolean;
  canResistBuyingProperties: boolean;
  group: "vampires" | "humans" | "elves";
  startingMoney: number;
};

export const PLAYER_TOKENS: PlayerToken[] = [
  {
    id: "vampire-woman",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    id: "vampire-man",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    id: "vampire",
    canBuyProperties: true,
    canResistBuyingProperties: false,
    group: "vampires",
    startingMoney: 1500,
  },
  {
    id: "human-woman",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    id: "human-man",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    id: "human",
    canBuyProperties: true,
    canResistBuyingProperties: true,
    group: "humans",
    startingMoney: 1000,
  },
  {
    id: "elf-woman",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
  {
    id: "elf-man",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
  {
    id: "elf",
    canBuyProperties: false,
    canResistBuyingProperties: true,
    group: "elves",
    startingMoney: 750,
  },
];

export const MAX_TURNS = 20;
