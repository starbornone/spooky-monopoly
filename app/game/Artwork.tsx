const artworkBySymbol = {
  "🎃": "pumpkin",
  "💰": "coin-purse",
  "💀": "skull",
  "🌱": "seedling",
  "👻": "ghost",
  "🎲": "dice",
  "💵": "banknotes",
  "🏚️": "manor",
  "🏠": "manor",
  "🩸": "blood-drop",
  "🏴‍☠️": "pirate-flag",
  "🌸": "blossom",
  "🍬": "candy",
  "⚰️": "coffin",
  "🧟": "zombie",
  "👗": "dress",
  "⏰": "alarm-clock",
  "👑": "crown",
  "🪦": "tombstone",
  "💸": "flying-banknote",
  "💎": "gem",
  "📱": "phone",
  "🛒": "trolley",
  "🧛": "vampire",
  "👩‍💼": "human",
  "🧝": "elf"
} as const;

export type ArtworkName = typeof artworkBySymbol[keyof typeof artworkBySymbol];

export const factionArtwork = { vampires: "vampire", humans: "human", elves: "elf" } as const;

export const artworkPath = (name: ArtworkName) => `/artwork/${name}.webp`;

export function illustratedLabel(value: string): { text: string; artwork?: ArtworkName } {
  for (const [symbol, artwork] of Object.entries(artworkBySymbol)) {
    if (value.startsWith(`${symbol} `)) {
      const label = value.slice(symbol.length + 1);
      const suffix = ` ${symbol}`;
      return { artwork, text: label.endsWith(suffix) ? label.slice(0, -suffix.length) : label };
    }
  }
  return { text: value };
}

export function Artwork({ name, className }: { name: ArtworkName; className?: string }) {
  return <img className={className ? `game-artwork ${className}` : "game-artwork"} src={artworkPath(name)} alt="" width={24} height={24} />;
}

export function IllustratedLabel({ value }: { value: string }) {
  const { text, artwork } = illustratedLabel(value);
  return <>{artwork && <><Artwork name={artwork} />{" "}</>}{text}</>;
}
