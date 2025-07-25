"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, X } from "lucide-react"
import { googlePlaces, PlaceResult } from "@/lib/google-places"
import { cn } from "@/lib/utils"

interface DestinationAutocompleteProps {
  value: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Where do you want to go?",
  className,
  disabled,
}: DestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Handle search with debouncing
  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = await googlePlaces.searchDestinations(query)
      setSuggestions(results)
      setIsOpen(results.length > 0)
    } catch (err) {
      console.error("Destination search error:", err)
      setError("Failed to search destinations")
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  const debouncedSearch = (query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => handleSearch(query), 300)
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    debouncedSearch(newValue)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: PlaceResult) => {
    onChange(suggestion.description, suggestion.placeId)
    setIsOpen(false)
    setSuggestions([])
    inputRef.current?.blur()
  }

  // Handle clear
  const handleClear = () => {
    onChange("")
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg",
            "placeholder-gray-500 text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            className
          )}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
        />
        
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50",
                "focus:outline-none border-b border-gray-100 last:border-b-0"
              )}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.mainText}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.secondaryText}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}