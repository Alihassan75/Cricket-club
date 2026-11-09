import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backyard Cricket Club",
  description: "Book grounds, join tournaments and see photos and videos from our cricket club.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F4F6F5] text-[#101828]">{children}</body>
    </html>
  );
}
