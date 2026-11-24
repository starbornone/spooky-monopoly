import { BoardSpace } from "../data";

// Note: Total properties is 12, so 12 is the maximum
export const getPlayerTitle = (ownedProperties: BoardSpace[]) => {
  if (ownedProperties.length === 0) {
    return "🌱 Radical Tradition Defender 🌱";
  } else if (ownedProperties.length <= 2) {
    return "👻 Amateur Culture Vulture 👻";
  } else if (ownedProperties.length <= 5) {
    return "🎃 Corporate Halloween Overlord 🎃";
  } else if (ownedProperties.length <= 8) {
    return "🧛 Master of Cultural Bloodsucking 🧛";
  } else if (ownedProperties.length <= 11) {
    return "💀 Capitalist Necromancer Supreme 💀";
  } else {
    return "💀 Ultimate Monopolistic Ghoul 💀";
  }
};
