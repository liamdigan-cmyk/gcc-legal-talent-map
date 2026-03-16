import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCC Legal Talent Map",
  description: "Cross-sector legal intelligence dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#f5f0e8] text-[#1a3a5c] min-h-screen" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
