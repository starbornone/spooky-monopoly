import type { ReactNode } from "react";

import "./globals.css";

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
