"use client"

import { useState } from "react"
import { 
  Heart, 
  Camera, 
  Utensils, 
  Mountain, 
  Music, 
  ShoppingBag, 
  Waves, 
  Building2,
  Palette,
  TreePine,
  Coffee,
  Star,
  Users,
  Plane,
  MapPin,
  Sun
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface InterestCategory {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const interestCategories: InterestCategory[] = [
  {
    id: "culture",
    label: "Culture & History",
    description: "Museums, monuments, local traditions",
    icon: <Building2 className="h-5 w-5" />,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    id: "food",
    label: "Food & Drink",
    description: "Local cuisine, restaurants, food tours",
    icon: <Utensils className="h-5 w-5" />,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    id: "adventure",
    label: "Adventure",
    description: "Hiking, extreme sports, outdoor activities",
    icon: <Mountain className="h-5 w-5" />,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  {
    id: "relaxation",
    label: "Relaxation",
    description: "Spas, beaches, wellness activities",
    icon: <Waves className="h-5 w-5" />,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "nightlife",
    label: "Nightlife",
    description: "Bars, clubs, entertainment venues",
    icon: <Music className="h-5 w-5" />,
    color: "bg-pink-100 text-pink-700 border-pink-200",
  },
  {
    id: "shopping",
    label: "Shopping",
    description: "Markets, boutiques, local crafts",
    icon: <ShoppingBag className="h-5 w-5" />,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    id: "nature",
    label: "Nature",
    description: "Parks, wildlife, scenic views",
    icon: <TreePine className="h-5 w-5" />,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    id: "art",
    label: "Art & Design",
    description: "Galleries, street art, creative spaces",
    icon: <Palette className="h-5 w-5" />,
    color: "bg-rose-100 text-rose-700 border-rose-200",
  },
  {
    id: "photography",
    label: "Photography",
    description: "Scenic spots, Instagram-worthy locations",
    icon: <Camera className="h-5 w-5" />,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    id: "local-life",
    label: "Local Life",
    description: "Authentic experiences, meet locals",
    icon: <Coffee className="h-5 w-5" />,
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "High-end experiences, premium services",
    icon: <Star className="h-5 w-5" />,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    id: "family",
    label: "Family-Friendly",
    description: "Kid-friendly activities, family attractions",
    icon: <Users className="h-5 w-5" />,
    color: "bg-teal-100 text-teal-700 border-teal-200",
  },
  {
    id: "romance",
    label: "Romance",
    description: "Romantic dinners, couple activities",
    icon: <Heart className="h-5 w-5" />,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    id: "business",
    label: "Business",
    description: "Networking, conferences, work-friendly",
    icon: <Plane className="h-5 w-5" />,
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
  {
    id: "spiritual",
    label: "Spiritual",
    description: "Religious sites, meditation, retreats",
    icon: <MapPin className="h-5 w-5" />,
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    id: "beach",
    label: "Beach & Water",
    description: "Water sports, coastal activities",
    icon: <Sun className="h-5 w-5" />,
    color: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
]

interface InterestSelectorProps {
  selectedInterests: string[]
  onChange: (interests: string[]) => void
  maxSelections?: number
  className?: string
  disabled?: boolean
}

export function InterestSelector({
  selectedInterests,
  onChange,
  maxSelections = 8,
  className,
  disabled,
}: InterestSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter categories based on search term
  const filteredCategories = interestCategories.filter(category =>
    category.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle category toggle
  const toggleCategory = (categoryId: string) => {
    if (disabled) return

    const isSelected = selectedInterests.includes(categoryId)
    
    if (isSelected) {
      // Remove from selection
      onChange(selectedInterests.filter(id => id !== categoryId))
    } else {
      // Add to selection if under limit
      if (selectedInterests.length < maxSelections) {
        onChange([...selectedInterests, categoryId])
      }
    }
  }

  // Clear all selections
  const clearAll = () => {
    if (!disabled) {
      onChange([])
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            What interests you?
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select up to {maxSelections} categories that match your travel style
          </p>
        </div>
        
        {selectedInterests.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search interests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {selectedInterests.length} of {maxSelections} selected
        </span>
        
        {selectedInterests.length >= maxSelections && (
          <span className="text-amber-600 font-medium">
            Maximum reached
          </span>
        )}
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCategories.map((category) => {
          const isSelected = selectedInterests.includes(category.id)
          const canSelect = selectedInterests.length < maxSelections || isSelected

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.id)}
              disabled={disabled || !canSelect}
              className={cn(
                "p-4 border rounded-lg text-left transition-all duration-200",
                "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-blue-300 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300",
                !canSelect && !isSelected && "opacity-40 cursor-not-allowed"
              )}
            >
              <div className="flex items-start space-x-3">
                <div className={cn(
                  "flex-shrink-0 p-2 rounded-md border",
                  isSelected ? "bg-blue-100 border-blue-200" : category.color
                )}>
                  {category.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {category.label}
                    </h4>
                    {isSelected && (
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {category.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* No results */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No interests found matching &quot;{searchTerm}&quot;</p>
        </div>
      )}

      {/* Selected interests summary */}
      {selectedInterests.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Selected Interests:
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedInterests.map((interestId) => {
              const category = interestCategories.find(c => c.id === interestId)
              if (!category) return null

              return (
                <span
                  key={interestId}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {category.label}
                  <button
                    type="button"
                    onClick={() => toggleCategory(interestId)}
                    disabled={disabled}
                    className="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white disabled:opacity-50"
                  >
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}