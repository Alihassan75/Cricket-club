import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-anton" });
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Backyard Cricket Club",
  description: "Book grounds, join tournaments and see photos and videos from our cricket club.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body className="bg-[#F2F2F2] text-[#0A0A0A]">{children}</body>
    </html>
  );
}
