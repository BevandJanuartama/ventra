import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ventra — Life OS",
  description: "Personal OS for students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-[#FBFBFA] text-[#1C1C1A] antialiased">
        {children}
      </body>
    </html>
  );
}
