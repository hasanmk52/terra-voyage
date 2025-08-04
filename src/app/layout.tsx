import { Inter } from "next/font/google";
import "./globals.css";
import { metadata, viewport } from "./metadata";
import { Navbar } from "../../components/ui/navbar";
import { ApiStatusDebug } from "../../components/debug/api-status";

const inter = Inter({ subsets: ["latin"] });

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-[hsl(var(--background))] font-sans antialiased`}
      >
        <Navbar />
        {children}
        <ApiStatusDebug />
      </body>
    </html>
  );
}
