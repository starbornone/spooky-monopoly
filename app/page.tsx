import type { Metadata } from "next";
import GameBoard from "./game/GameBoard";

export const metadata: Metadata = {
  title: "Spooky Monopoly",
  description: "Spooky page made for Weird Web October 2025",
};

export default function Page() {
  return (
    <main>
      <GameBoard />
    </main>
  );
}
