import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  icons: [{ url: "/artwork/pumpkin.webp", type: "image/webp", sizes: "96x96" }]
};

export const viewport: Viewport = { themeColor: "#211613", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          as="fetch"
          crossOrigin="anonymous"
          href="https://octothorp.es/?uri=https://weird.sha.codes/spooky"
        />
        <link rel="octo:octothorpes" href="weirdweboctober" />
        <link rel="octo:octothorpes" href="Spooky" />
      </head>
      <body>{children}</body>
    </html>
  );
}
