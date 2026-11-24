export interface BoardSpace {
  description?: string;
  id: number;
  name: string;
  price?: number;
  rent?: number;
  type: "property" | "special";
  flavorText?: {
    vampires?: string;
    humans?: string;
    elves?: string;
  };
}

export const boardSpaces: BoardSpace[] = [
  {
    id: 0,
    name: "GO (Harvest of Souls)",
    type: "special",
    description:
      "Collect $200 for successfully strip-mining another culture's sacred traditions into shareholder value.",
    flavorText: {
      vampires:
        "A fresh start to drain every last drop of profit from these cultural husks!",
      humans: "Nice, a bonus for just showing up. Let’s keep this game moving.",
      elves:
        "This blatant theft of sacred traditions is an outrage. We must resist from the start!",
    },
  },
  {
    id: 1,
    name: "Pumpkin Exploitation Plaza",
    type: "property",
    price: 60,
    rent: 12,
    description:
      "Former family farm turned $30-per-selfie backdrop. Real pumpkins rotting while plastic ones ship from China.",
    flavorText: {
      vampires:
        "Buy for $60! Turn this quaint farm into a goldmine of selfie revenue!",
      humans:
        "Buy for $60. Seems like a fun spot for photos; might make some cash.",
      elves:
        "I reject this exploitation of land and labor! No to agricultural commodification!",
    },
  },
  {
    id: 2,
    name: "Nostalgia Factory Outlet",
    type: "property",
    price: 80,
    rent: 16,
    description:
      "Mass-produced childhood memories nobody actually had. Candy corn: the high fructose embodiment of manufactured tradition.",
    flavorText: {
      vampires:
        "Buy for $80! Weaponize false nostalgia for maximum profit margins!",
      humans: "Buy for $80. People love this stuff, right? Easy money.",
      elves:
        "This false nostalgia is a capitalist lie. I refuse to profit from deception!",
    },
  },
  {
    id: 3,
    name: "Fast Fashion Frightmare",
    type: "property",
    price: 100,
    rent: 20,
    description:
      "Polyester nightmares stitched by exploited labor. Wear once, photograph, landfill. Cultural appropriation included at no extra charge.",
    flavorText: {
      vampires:
        "Buy for $100! Cheap labor, high returns—capitalism at its finest!",
      humans: "Buy for $100. It’s trendy, even if it’s a bit questionable.",
      elves:
        "I will not fund sweatshops or cultural theft! This is an abomination!",
    },
  },
  {
    id: 4,
    name: "Seasonal Parasite Plaza",
    type: "property",
    price: 120,
    rent: 24,
    description:
      "Pop-up stores that feast on dead retail spaces. Materialized 1st September, vanishes 2nd November with your wallet.",
    flavorText: {
      vampires:
        "Buy for $120! These fleeting shops are perfect for quick, ruthless gains!",
      humans: "Buy for $120. It’s just seasonal; no harm done to anyone.",
      elves:
        "These predatory pop-ups exploit desperation. I stand in solidarity with workers!",
    },
  },
  {
    id: 5,
    name: "Authenticity Graveyard",
    type: "property",
    price: 140,
    rent: 28,
    description:
      "Where genuine folk traditions come to die. Now selling mass-produced 'vintage' Halloween charm by the pound.",
    flavorText: {
      vampires:
        "Buy for $140! Bury authenticity deeper and sell its corpse for profit!",
      humans:
        "Buy for $140. It’s sad, but people like this ‘vintage’ stuff anyway.",
      elves:
        "This desecration of heritage is heartbreaking. I will not be complicit!",
    },
  },
  {
    id: 6,
    name: "Corporate Terror Complex",
    type: "property",
    price: 160,
    rent: 32,
    description:
      "$80 tickets for algorithmic jump scares. Fear focus-grouped for maximum profit; minimum actual terror.",
    flavorText: {
      vampires:
        "Buy for $160! Monetize fear itself—there’s no better business model!",
      humans: "Buy for $160. It’s overpriced, but people pay for the thrill.",
      elves:
        "Exploiting human emotion with algorithms is monstrous! I refuse to engage!",
    },
  },
  {
    id: 7,
    name: "Hallmark Necropolis",
    type: "property",
    price: 180,
    rent: 36,
    description:
      "Greeting card empire built on manufactured sentiment. 'Happy Halloween to my special nephew's dog-sitter's cousin!'",
    flavorText: {
      vampires:
        "Buy for $180! Turn hollow sentiments into overflowing coffers!",
      humans: "Buy for $180. It’s cheesy, but people enjoy them. Why not?",
      elves:
        "This commodification of connection is a travesty! I reject it outright!",
    },
  },
  {
    id: 8,
    name: "Cultural Imperialism Station",
    type: "special",
    description:
      "You've successfully exported Halloween to Australia in springtime! Collect $150 for confusing the Southern Hemisphere.",
    flavorText: {
      vampires:
        "Glorious! Force-feed Halloween everywhere and feast on the profits!",
      humans: "Cool. Extra cash. Sure, it’s spring here, but okay.",
      elves:
        "This cultural imposition is imperialist violence! We must fight back!",
    },
  },
  {
    id: 9,
    name: "Sugar Cartel Headquarters",
    type: "property",
    price: 220,
    rent: 44,
    description:
      "Nestle and Mars convert ancient harvest rituals into diabetes delivery systems. Dentists send thank-you cards.",
    flavorText: {
      vampires:
        "Buy for $220! Sweeten the deal with addictive poison—pure profit!",
      humans:
        "Buy for $220. Candy’s a big seller, and it’s up to the individual to eat in moderation.",
      elves:
        "These cartels harm our children for profit! I will never support this!",
    },
  },
  {
    id: 10,
    name: "Petroleum Pumpkin Works",
    type: "property",
    price: 240,
    rent: 48,
    description:
      "Why grow biodegradable gourds when you can mold plastic ones that'll outlive your grandchildren? Innovation!",
    flavorText: {
      vampires:
        "Buy for $240! Plastic forever—sustainability be damned for profit!",
      humans:
        "Buy for $240. Plastic’s cheaper, though it’s not great for the planet.",
      elves:
        "This environmental devastation is unforgivable! I refuse to invest in destruction!",
    },
  },
  {
    id: 11,
    name: "Tradition Extinction Center",
    type: "property",
    price: 260,
    rent: 52,
    description:
      "Where local customs die so corporate Halloween can live. Now featuring LED-lit plastic tombstones for irony.",
    flavorText: {
      vampires:
        "Buy for $260! Eradicate tradition and build a corporate empire on its grave!",
      humans: "Buy for $260. Tradition is quaint, but these are modern times.",
      elves:
        "This annihilation of culture is a crime! I stand against it with all my being!",
    },
  },
  {
    id: 12,
    name: "Capitalism's Final Boss",
    type: "special",
    description:
      "You've achieved peak commodification. Local businesses bankrupted, traditions monetized, souls purchased. Rest here.",
    flavorText: {
      vampires:
        "Victory! Total domination—capitalism’s ultimate triumph is mine!",
      humans:
        "Wow, I’ve made it. Guess this is winning, even if it feels empty.",
      elves:
        "This pinnacle of greed is our greatest enemy. We must dismantle it!",
    },
  },
  {
    id: 13,
    name: "Artificial Scarcity Industries",
    type: "property",
    price: 280,
    rent: 56,
    description:
      "'Limited edition' Halloween collections that return annually. Manufacturing urgency since consumer psychology became a science.",
    flavorText: {
      vampires:
        "Buy for $280! Manipulate desire with scarcity—genius profiteering!",
      humans: "Buy for $280. Limited editions sell fast.",
      elves:
        "This psychological exploitation is predatory! I will not be part of it!",
    },
  },
  {
    id: 14,
    name: "Influencer Graveyard",
    type: "property",
    price: 300,
    rent: 60,
    description:
      "Pay $50 to pose with algorithmic ‘autumn vibes.’ Your authentic moment, brought to you by targeted advertising.",
    flavorText: {
      vampires:
        "Buy for $300! Sell fake authenticity to the masses for top dollar!",
      humans: "Buy for $300. Social media hype pays off, even if it’s staged.",
      elves:
        "This fabrication of authenticity is a capitalist sham! I reject it!",
    },
  },
  {
    id: 15,
    name: "Commodification Complete",
    type: "special",
    description:
      "The circle of exploitation closes. Another culture successfully reduced to profit margins. Collect $200 in blood money.",
    flavorText: {
      vampires:
        "Perfection! Another culture crushed under the heel of profit—glorious!",
      humans: "Another payout. Feels a bit wrong, but money’s money.",
      elves:
        "This blood money is the fruit of oppression. We must tear down this system!",
    },
  },
];
