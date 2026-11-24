import { BoardSpace } from "../data";

export const getReflectionText = (ownedProperties: BoardSpace[]) => {
  if (ownedProperties.length === 0) {
    return "By refusing to play the rigged game, you've made the most revolutionary choice possible. Elizabeth Magie designed this as a warning, and you heeded it. In reality, opting out isn't always feasible when the entire economy runs on commodifying everything from holidays to human connection—but in this space, your resistance matters.";
  } else if (ownedProperties.length >= 8) {
    return "You've embodied Elizabeth Magie's deepest fears: a monopolist who treats living culture like dead capital. Each 'property' you acquired was once a breathing tradition, now suffocated under plastic wrap and price tags. The real terror isn't ghosts or goblins—it's the systematic transformation of sacred meaning into merchandise for mass consumption.";
  } else {
    return "You played the game without completely selling your soul. Perhaps there's still time to remember what Halloween meant before it became a $10 billion industry: honoring ancestors, celebrating community, marking seasonal transitions. Not optimizing conversion rates for multinational candy conglomerates.";
  }
};
