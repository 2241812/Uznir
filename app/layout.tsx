import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Uznir — Who's near?",
    template: "%s | Uznir",
  },
  description:
    "Find trusted local workers near you. Drivers, carpenters, plumbers, electricians, cleaners — available now.",
  keywords: [
    "Uznir",
    "local workers",
    "freelance",
    "handyman",
    "carpenter",
    "plumber",
    "electrician",
    "driver",
    "cleaner",
    "Philippines",
    "jobs",
    "odd jobs",
    "errands",
    "near me",
  ],
  authors: [{ name: "Uznir" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Uznir",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
