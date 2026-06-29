import type { Metadata } from "next";

import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oli Professional Studio",
  description: "The studio for creating living health systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
