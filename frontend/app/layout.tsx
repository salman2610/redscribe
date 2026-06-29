import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RedScribe — AI Pentest Reporting",
  description: "Turn raw pentest chaos into client-ready reports",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
