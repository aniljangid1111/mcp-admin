import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cleanergy Admin Portal",
  description: "Administrative portal for Cleanergy Battery product catalog and order management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
