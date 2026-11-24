import type { Metadata } from "next";
import GameBoard from "./game/GameBoard";

import "./page.css";

export const metadata: Metadata = {
  title: "Spooky - Weird Web October 2025",
  description: "Spooky page made for Weird Web October 2025",
};

export default function Page() {
  return (
    <main className="spooky-page">
      <GameBoard />
    </main>
  );
}
