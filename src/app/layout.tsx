import { Inter } from "next/font/google";
import "./globals.css";
import { metadata, viewport } from "./metadata";
import { Logo } from "../../components/ui/logo";
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
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95 dark:border-gray-800/50 dark:bg-gray-950/95">
          <div className="container flex h-16 items-center px-4">
            <div className="mr-8">
              <Logo />
            </div>
            <nav className="hidden md:flex flex-1 items-center gap-8 text-sm font-medium">
              <a
                href="/trips"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
              >
                My Trips
              </a>
              <a
                href="/features"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
              >
                Features
              </a>
              <a
                href="/pricing"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
              >
                Pricing
              </a>
              <a href="/about" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200">
                About
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <a
                href="/plan"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105"
              >
                Start Planning
              </a>
            </div>
          </div>
        </header>
        {children}
        <ApiStatusDebug />
      </body>
    </html>
  );
}
