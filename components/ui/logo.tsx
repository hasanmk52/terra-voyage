import Link from "next/link";
import { MapPin } from "lucide-react";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 transition-all duration-200 hover:scale-105 group"
    >
      <div className="relative p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg group-hover:shadow-xl transition-all duration-200">
        <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
          Terra Voyage
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium -mt-1">
          AI Travel Planner
        </span>
      </div>
      <div className="hidden sm:flex items-center ml-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800">
        <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Beta</span>
      </div>
    </Link>
  );
}
