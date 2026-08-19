import type { Metadata, Viewport } from "next";
import { activeInventoryDataset } from "@/config/dataset-config";
import "./globals.css";

export const metadata: Metadata = {
  title: activeInventoryDataset.appName,
  description: activeInventoryDataset.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
