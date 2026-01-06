import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "OURCAR Station | Approval Log",
  description: "OURCAR Station Approval Log Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={outfit.className}>
        <div className="app-container">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
