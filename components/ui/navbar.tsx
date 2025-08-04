"use client";

import { Logo } from "./logo";

export function Navbar() {
  return (
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
          <a
            href="/about"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
          >
            About
          </a>
        </nav>
        <div className="flex items-center gap-4">
          {/* Start Planning button removed - using hero section button instead */}
        </div>
      </div>
    </header>
  );
}
