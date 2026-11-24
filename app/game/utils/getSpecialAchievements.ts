import { BoardSpace } from "../data";

export const getSpecialAchievements = (
  ownedProperties: BoardSpace[],
  money: number
) => {
  const achievements: { title: string; description: string }[] = [];
  const propertyNames = ownedProperties.map(p => p.name);

  if (propertyNames.includes("Cultural Imperialism Station")) {
    achievements.push({
      title: "🏴‍☠️ Cultural Colonizer Supreme",
      description:
        "Successfully forced American consumer anxiety onto unsuspecting global markets",
    });
  }

  if (propertyNames.includes("Petroleum Pumpkin Works")) {
    achievements.push({
      title: "🌸 Plastic Planet Destroyer",
      description:
        "Replaced Earth's biodegradable abundance with eternal petroleum nightmares",
    });
  }

  if (propertyNames.includes("Sugar Cartel Headquarters")) {
    achievements.push({
      title: "🍬 Industrial Diabetes Architect",
      description:
        "Weaponized ancient harvest celebrations into modern health epidemics",
    });
  }

  if (propertyNames.includes("Tradition Extinction Center")) {
    achievements.push({
      title: "⚱️ Cultural Genocide Specialist",
      description:
        "Systematically buried authentic traditions under mass-produced corporate substitutes",
    });
  }

  if (propertyNames.includes("Seasonal Parasite Plaza")) {
    achievements.push({
      title: "🧟 Retail Necromancer Master",
      description:
        "Reanimated deceased shopping centers with temporary capitalist horror shows",
    });
  }

  if (propertyNames.includes("Fast Fashion Frightmare")) {
    achievements.push({
      title: "👗 Sweatshop Warlock",
      description:
        "Conjured cultural appropriation costumes from exploited global labor",
    });
  }

  if (propertyNames.includes("Artificial Scarcity Industries")) {
    achievements.push({
      title: "⏰ FOMO Fabrication Expert",
      description:
        "Manufactured existential panic over limited-edition seasonal garbage",
    });
  }

  if (ownedProperties.length >= 10) {
    achievements.push({
      title: "👑 Elizabeth Magie's Nightmare",
      description:
        "Achieved the exact monopolistic horror her game was designed to prevent",
    });
  }

  if (money > 3000) {
    achievements.push({
      title: "💰 Capitalist Dragon Lord",
      description:
        "Hoarded more cursed Halloween currency than Scrooge McDuck's fever dreams",
    });
  }

  if (
    propertyNames.includes("Authenticity Graveyard") &&
    propertyNames.includes("Influencer Graveyard")
  ) {
    achievements.push({
      title: "⚰️ Dual Graveyard Overlord",
      description:
        "Monopolized both the death of tradition and the burial of authenticity in one capitalist empire",
    });
  }

  const propertiesUnder200 = [
    "Pumpkin Exploitation Plaza",
    "Nostalgia Factory Outlet",
    "Fast Fashion Frightmare",
    "Seasonal Parasite Plaza",
    "Authenticity Graveyard",
    "Corporate Terror Complex",
    "Hallmark Necropolis",
  ];

  if (propertiesUnder200.every(name => propertyNames.includes(name))) {
    achievements.push({
      title: "💸 Entry-Level Exploitation Master",
      description:
        "Cornered the market on affordable cultural destruction—democratizing commodification for the masses",
    });
  }

  const propertiesOver250 = [
    "Tradition Extinction Center",
    "Artificial Scarcity Industries",
    "Influencer Graveyard",
  ];

  if (propertiesOver250.every(name => propertyNames.includes(name))) {
    achievements.push({
      title: "💎 Premium Commodification Elite",
      description:
        "Mastered the high-end art of systematic cultural annihilation and artificial desire manipulation",
    });
  }

  if (
    propertyNames.includes("Pumpkin Exploitation Plaza") &&
    propertyNames.includes("Petroleum Pumpkin Works")
  ) {
    achievements.push({
      title: "🎃 Pumpkin Monopoly Mogul",
      description:
        "Controlled the complete lifecycle from organic exploitation to plastic immortalization—true gourd domination",
    });
  }

  if (
    propertyNames.includes("Fast Fashion Frightmare") &&
    propertyNames.includes("Influencer Graveyard") &&
    propertyNames.includes("Cultural Imperialism Station")
  ) {
    achievements.push({
      title: "📱 Social Media Colonization Baron",
      description:
        "Weaponized fashion, influencers, and cultural imperialism into a triple-threat exploitation machine",
    });
  }

  if (
    propertyNames.includes("Seasonal Parasite Plaza") &&
    propertyNames.includes("Nostalgia Factory Outlet") &&
    propertyNames.includes("Artificial Scarcity Industries")
  ) {
    achievements.push({
      title: "🛒 Retail Manipulation Wizard",
      description:
        "Perfected the unholy trinity of seasonal exploitation, false nostalgia, and manufactured urgency",
    });
  }

  return achievements;
};
