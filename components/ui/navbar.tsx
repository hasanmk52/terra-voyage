"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import "./navbar.css";

export function Navbar() {
  const { data: session, status } = useSession();

  // Debug logging for session state (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Navbar Session Status:", {
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      userName: session?.user?.name,
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95 dark:border-gray-800/50 dark:bg-gray-950/95">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-8">
          <Logo />
        </div>
        <nav className="hidden md:flex flex-1 items-center gap-8 text-sm font-medium">
          {session && (
            <Link
              href="/trips"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
            >
              My Trips
            </Link>
          )}
          <Link
            href="/features"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200"
          >
            About
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {status === "loading" && (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          )}

          {!session && status !== "loading" && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => signIn("google", { callbackUrl: "/trips" })}
              >
                Sign In
              </Button>
              <Button
                onClick={() => signIn("google", { callbackUrl: "/trips" })}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Planning
              </Button>
            </div>
          )}

          {session && (
            <div className="flex items-center gap-3">
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Link href="/plan">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Trip
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 user-dropdown-trigger"
                  >
                    <Avatar className="h-10 w-10 user-avatar">
                      <AvatarImage
                        src={session.user?.image || ""}
                        alt={
                          session.user?.name || session.user?.email || "User"
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-sm">
                        {session.user?.name?.charAt(0) ||
                          session.user?.email?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 p-0 user-dropdown-content"
                  align="end"
                  sideOffset={8}
                  alignOffset={-4}
                  forceMount
                >
                  {/* User Profile Header */}
                  <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50 profile-header">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm user-avatar">
                        <AvatarImage
                          src={session.user?.image || ""}
                          alt={
                            session.user?.name || session.user?.email || "User"
                          }
                        />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-base">
                          {session.user?.name?.charAt(0) ||
                            session.user?.email?.charAt(0) ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight text-gray-900 truncate">
                          {session.user?.name || "User"}
                        </p>
                        <p className="text-xs leading-tight text-gray-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 transition-all duration-200 rounded-none mx-0 px-4 py-3 dropdown-menu-item menu-item-hover"
                    >
                      <Link
                        href="/profile"
                        className="flex items-center w-full"
                      >
                        <User className="mr-3 h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          Profile
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 transition-all duration-200 rounded-none mx-0 px-4 py-3 dropdown-menu-item menu-item-hover"
                    >
                      <Link href="/trips" className="flex items-center w-full">
                        <MapPin className="mr-3 h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          My Trips
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 transition-all duration-200 rounded-none mx-0 px-4 py-3 dropdown-menu-item menu-item-hover"
                    >
                      <Link
                        href="/settings"
                        className="flex items-center w-full"
                      >
                        <Settings className="mr-3 h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          Settings
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="my-0" />

                  {/* Logout Section */}
                  <div className="py-2">
                    <DropdownMenuItem
                      onClick={async () => {
                        console.log("🚪 Starting sign out process...");
                        try {
                          await signOut({
                            callbackUrl: "/",
                            redirect: true,
                          });
                          console.log("✅ Sign out completed");
                        } catch (error) {
                          console.error("❌ Sign out error:", error);
                        }
                      }}
                      className="cursor-pointer px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 transition-all duration-200 rounded-none mx-0 dropdown-menu-item logout-button"
                    >
                      <LogOut className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">Log out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
