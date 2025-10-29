"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      // Size and contrast optimized for light backgrounds
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Track colors: light gray when off, accent when on
      "data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600",
      "data-[state=checked]:bg-blue-400 dark:data-[state=checked]:bg-blue-500",
      // Subtle border for visibility in cards
      "border-gray-300 data-[state=checked]:border-blue-400 dark:border-gray-500 dark:data-[state=checked]:border-blue-500",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        // High-contrast thumb
        "pointer-events-none block h-5 w-5 rounded-full bg-white dark:bg-gray-800 shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 border border-gray-300 dark:border-gray-700"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
