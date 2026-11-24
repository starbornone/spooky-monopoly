import type { BoardSpace, PlayerToken } from "../data";

interface SoloPosition {
  position: number;
  money: number;
  ownedProperties: readonly number[];
}

type Faction = PlayerToken["group"];

export function chooseSoloRoll(
  board: readonly BoardSpace[],
  position: number,
  ownedProperties: readonly number[],
  faction: Faction,
  random: () => number
): number {
  const roll = Math.floor(random() * 6) + 1;
  if (faction !== "vampires") return roll;

  const targets = board.flatMap((space, index) =>
    index !== position && space.type === "property" && !ownedProperties.includes(space.id)
      ? [index]
      : []
  );
  if (!targets.length || random() >= 0.8) return roll;
  const target = targets[Math.floor(random() * targets.length)];
  const distance = (target - position + board.length) % board.length;
  return distance >= 1 && distance <= 6 ? distance : roll;
}

export function resolveSoloLanding(
  board: readonly BoardSpace[],
  state: SoloPosition,
  faction: Faction,
  roll: number
) {
  const position = (state.position + roll) % board.length;
  const space = board[position];
  const logs: string[] = [];
  const goBonus = { vampires: 200, humans: 100, elves: 50 }[faction];
  let money = state.money;
  let rent = 0;

  for (let step = 1; step <= roll; step++) {
    const visited = board[(state.position + step) % board.length];
    if (visited.type === "property" && state.ownedProperties.includes(visited.id)) {
      rent += Math.floor((visited.rent ?? 0) * (faction === "vampires" ? 1 : 0.75));
    }
  }

  if (rent > 0) {
    money += rent;
    logs.push(faction === "vampires"
      ? `🩸 Drained blood money from owned properties: $${rent}`
      : `💰 Collected rent from owned properties: $${rent}`);
  }
  if (position < state.position) {
    money += goBonus;
    logs.push({
      vampires: `🧛 Vampiric GO bonus: $${goBonus} (exploitation efficiency!)`,
      humans: `💰 Standard GO bonus: $${goBonus}`,
      elves: `🧝 Minimal GO stipend: $${goBonus} (refusing excessive wealth)`
    }[faction]);
  }

  const unowned = space.type === "property" && !state.ownedProperties.includes(space.id);
  if (space.type === "special") {
    if (space.id === 0 || space.id === 8) money += goBonus;
    if (space.id === 8 && faction === "vampires") {
      logs.push(`🧛 Cultural imperialism bonus: $${goBonus} (spreading the plague!)`);
    }
    if (space.id === 8 && faction === "elves") {
      logs.push(`🧝 Reluctant imperialism payment: $${goBonus} (this hurts my soul)`);
    }
    if (space.id === 12 || space.id === 15) {
      if (faction === "vampires") {
        money += 100;
        logs.push("🧛 Capitalism bonus: $100 (feeding off the system!)");
      } else if (faction === "elves") {
        money = Math.max(0, money - 50);
        logs.push("🧝 Capitalism penalty: $50 (refusing to profit from suffering)");
      }
    }
  } else if (unowned && faction === "elves") {
    const tax = Math.floor((space.rent ?? 0) * 0.75);
    money = Math.max(0, money - tax);
    if (tax > 0) logs.push(`🧝 Ethical burden: -$${tax} (guilt tax for existing in this system)`);
  } else if (unowned && faction === "vampires") {
    money += 25;
    logs.push("🧛 Opportunity assessment: +$25 (smelling fresh blood!)");
  } else if (faction === "vampires") {
    const bonus = Math.floor((space.rent ?? 0) * 0.25);
    money += bonus;
    if (bonus > 0) logs.push(`🧛 Self-exploitation bonus: $${bonus} (even bleeding yourself pays!)`);
  }

  return { position, money, logs, unowned, affordable: unowned && !!space.price && money >= space.price };
}

export function buySoloProperty(space: BoardSpace, state: SoloPosition, token: PlayerToken) {
  if (!token.canBuyProperties || space.type !== "property" || space.price === undefined ||
    state.ownedProperties.includes(space.id) || state.money < space.price) return null;

  const bonus = token.group === "vampires" ? Math.floor(space.price * 0.2) : 0;
  return {
    money: state.money - space.price + bonus,
    ownedProperties: [...state.ownedProperties, space.id],
    logs: [
      ...(token.group === "vampires" ? [`🧛 Exploitation efficiency bonus: +$${bonus}`] : []),
      `🏠 Purchased ${space.name} for $${space.price}`
    ]
  };
}
