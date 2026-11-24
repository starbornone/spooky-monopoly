import type { Metadata } from "next";
import { PilotLobby } from "./PilotLobby";

export const metadata: Metadata = {
  title: "Private multiplayer pilot | Spooky Monopoly",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default function MultiplayerPage() {
  return <PilotLobby />;
}
