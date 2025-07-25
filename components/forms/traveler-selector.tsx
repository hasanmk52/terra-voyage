"use client"

import { useState, useRef, useEffect } from "react"
import { Users, Plus, Minus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TravelerData {
  adults: number
  children: number
  infants: number
}

interface TravelerSelectorProps {
  value: TravelerData
  onChange: (travelers: TravelerData) => void
  maxTravelers?: number
  className?: string
  disabled?: boolean
}

interface TravelerCategory {
  key: keyof TravelerData
  label: string
  description: string
  min: number
  max: number
}

const travelerCategories: TravelerCategory[] = [
  {
    key: "adults",
    label: "Adults",
    description: "Ages 18+",
    min: 1,
    max: 20,
  },
  {
    key: "children",
    label: "Children",
    description: "Ages 2-17",
    min: 0,
    max: 10,
  },
  {
    key: "infants",
    label: "Infants",
    description: "Under 2",
    min: 0,
    max: 5,
  },
]

export function TravelerSelector({
  value,
  onChange,
  maxTravelers = 25,
  className,
  disabled,
}: TravelerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Calculate total travelers
  const totalTravelers = value.adults + value.children + value.infants

  // Generate display text
  const getDisplayText = () => {
    if (totalTravelers === 1) return "1 traveler"
    if (totalTravelers === 0) return "Select travelers"
    
    const parts: string[] = []
    if (value.adults > 0) parts.push(`${value.adults} adult${value.adults !== 1 ? "s" : ""}`)
    if (value.children > 0) parts.push(`${value.children} child${value.children !== 1 ? "ren" : ""}`)
    if (value.infants > 0) parts.push(`${value.infants} infant${value.infants !== 1 ? "s" : ""}`)
    
    if (parts.length <= 2) {
      return parts.join(", ")
    }
    
    return `${totalTravelers} travelers`
  }

  // Handle increment/decrement
  const updateCount = (key: keyof TravelerData, increment: boolean) => {
    const category = travelerCategories.find(cat => cat.key === key)
    if (!category) return

    const currentValue = value[key]
    const newValue = increment ? currentValue + 1 : currentValue - 1

    // Check bounds
    if (newValue < category.min || newValue > category.max) return

    // Check total traveler limit
    const newTotal = totalTravelers + (increment ? 1 : -1)
    if (newTotal > maxTravelers || newTotal < 1) return

    // Special rule: adults must be at least 1
    if (key === "adults" && newValue < 1) return

    onChange({
      ...value,
      [key]: newValue,
    })
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left border border-gray-300 rounded-lg",
          "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
          totalTravelers > 0 ? "text-gray-900" : "text-gray-500",
          className
        )}
      >
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5 text-gray-400" />
          <span>{getDisplayText()}</span>
        </div>
        
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4"
        >
          <div className="space-y-4">
            {travelerCategories.map((category) => {
              const currentValue = value[category.key]
              const canDecrement = currentValue > category.min && 
                (category.key !== "adults" || currentValue > 1)
              const canIncrement = currentValue < category.max && 
                totalTravelers < maxTravelers

              return (
                <div key={category.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {category.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.description}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => updateCount(category.key, false)}
                      disabled={!canDecrement}
                      className={cn(
                        "w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center",
                        "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                        "disabled:opacity-30 disabled:cursor-not-allowed"
                      )}
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    <span className="w-8 text-center text-sm font-medium text-gray-900">
                      {currentValue}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => updateCount(category.key, true)}
                      disabled={!canIncrement}
                      className={cn(
                        "w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center",
                        "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                        "disabled:opacity-30 disabled:cursor-not-allowed"
                      )}
                    >
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalTravelers >= maxTravelers && (
            <div className="mt-4 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Maximum of {maxTravelers} travelers allowed
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Total: {totalTravelers} traveler{totalTravelers !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}