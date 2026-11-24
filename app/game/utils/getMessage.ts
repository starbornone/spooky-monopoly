import { BoardSpace } from "../data";

export const getMessage = (money: number, ownedProperties: BoardSpace[]) => {
  const propertyNames = ownedProperties.map(p => p.name);
  const hasSeasonal = propertyNames.some(name =>
    name.includes("Seasonal Parasite")
  );
  const hasSugar = propertyNames.some(name => name.includes("Sugar Cartel"));
  const hasFashion = propertyNames.some(name => name.includes("Fast Fashion"));
  const hasInfluencer = propertyNames.some(name => name.includes("Influencer"));

  if (ownedProperties.length === 0) {
    return "You resisted the siren song of commodification! Like Elizabeth Magie's original vision, you rejected the landlord's game entirely. You may not be rolling in passive income, but your soul remains unbranded. In a system designed to reward greed, choosing authenticity is the most radical act of all.";
  } else if (money < 500 && ownedProperties.length > 5) {
    return "The perfect capitalist tragedy: you've strip-mined culture so aggressively that you've bankrupted yourself in the process. Even your exploitation is being exploited. You've achieved peak late-stage capitalism—congratulations, you beautiful disaster.";
  } else if (hasSeasonal && hasSugar && hasFashion) {
    return "The unholy corporate trinity is complete! You control the parasitic pop-ups, the sugar-industrial complex, and the fast-fashion nightmare machine. Halloween doesn't just belong to you—it IS you. Every jack-o'-lantern now bears your corporate logo.";
  } else if (hasInfluencer && money > 1500) {
    return "You've achieved the ultimate modern horror: monetizing authenticity itself. Every 'genuine' Halloween moment is now a calculated revenue stream. You've turned nostalgia into an algorithm and childhood memories into shareholder dividends. How delightfully dystopian.";
  } else if (ownedProperties.length <= 3) {
    return "A cautious dip into the commodification pool. You've tested the waters of cultural exploitation but haven't fully drowned your conscience yet. There's still hope for redemption... or room for expansion, depending on which way your moral compass spins.";
  } else if (ownedProperties.length <= 6) {
    return "A competent merchant of manufactured misery. You've grasped that tradition is just an untapped market waiting to be disrupted. Elizabeth Magie's ghost is doing somersaults in her grave at your efficient dismantling of authentic culture.";
  } else if (ownedProperties.length <= 9) {
    return "You've become a true architect of cultural alienation. Halloween barely recognizes itself in your funhouse mirror of commerce. What was once about honoring ancestors is now about quarterly earnings. The dead are spinning in their graves—probably from the centrifugal force of your profit margins.";
  } else {
    return "Magnificent and monstrous! You've achieved every MBA's fever dream: the complete liquidation of cultural meaning for maximum shareholder value. Halloween is dead, but Halloween™ lives forever. You've turned a sacred tradition into a registered trademark. Even Midas would be jealous.";
  }
};
