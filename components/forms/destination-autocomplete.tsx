"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, X, Wifi, WifiOff, AlertTriangle, Clock } from "lucide-react"
import { googlePlaces, PlaceResult } from "@/lib/google-places"
import { cn } from "@/lib/utils"

interface DestinationAutocompleteProps {
  value: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showStatus?: boolean // Show API status indicators
}

export function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Where do you want to go?",
  className,
  disabled,
  showStatus = true,
}: DestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  const [quotaWarning, setQuotaWarning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle search with debouncing and enhanced error handling
  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsUsingFallback(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check quota status before search
      const quotaStatus = googlePlaces.getQuotaStatus()
      setQuotaWarning(quotaStatus.warningThreshold)

      const results = await googlePlaces.searchDestinations(query, {
        useCache: true,
        timeoutMs: 5000 // Increased timeout for better reliability
      })
      
      // Check if any results are from fallback
      const hasFallbackResults = results.some(r => r.fallback)
      setIsUsingFallback(hasFallbackResults)
      
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setError(null) // Clear any previous errors
      
    } catch (err) {
      console.error("🔍 Destination search error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to search destinations"
      
      // Try fallback search on any error
      try {
        console.log('🔄 API failed, trying fallback search...')
        // Force fallback by setting a very short timeout
        const fallbackResults = await googlePlaces.searchDestinations(query, {
          useCache: false,
          timeoutMs: 50 // Force immediate fallback
        })
        
        if (fallbackResults.length > 0) {
          setSuggestions(fallbackResults)
          setIsOpen(true)
          setIsUsingFallback(true)
          
          // Provide user-friendly error messages
          if (errorMessage.includes('QUOTA_EXCEEDED')) {
            setError("Search limit reached. Showing popular destinations.")
          } else if (errorMessage.includes('AUTH_ERROR') || errorMessage.includes('API key')) {
            setError("Search temporarily unavailable. Showing popular destinations.")
          } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            setError("Search timed out. Showing popular destinations.")
          } else {
            setError("Using offline search. Popular destinations shown.")
          }
        } else {
          // No fallback results either
          setError("Search temporarily unavailable. You can still type any destination.")
          setSuggestions([])
          setIsOpen(false)
          setIsUsingFallback(false)
        }
      } catch (fallbackErr) {
        console.error("🔍 Fallback search also failed:", fallbackErr)
        setError("Search temporarily unavailable. You can still type any destination.")
        setSuggestions([])
        setIsOpen(false)
        setIsUsingFallback(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search - FR-005.2: Optimize API calls with debouncing
  const debouncedSearch = (query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Shorter debounce for better UX while still minimizing API calls
    timeoutRef.current = setTimeout(() => handleSearch(query), 250)
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

  // Get status icon and color
  const getStatusInfo = () => {
    if (isLoading) {
      return { icon: Search, color: "text-blue-500", spinning: true }
    }
    if (isUsingFallback) {
      return { icon: WifiOff, color: "text-orange-500", spinning: false }
    }
    if (quotaWarning) {
      return { icon: AlertTriangle, color: "text-yellow-500", spinning: false }
    }
    return { icon: Search, color: "text-gray-400", spinning: false }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          ) : (
            <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
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
            // Add border color based on status
            isUsingFallback && "border-orange-300 focus:border-orange-500 focus:ring-orange-500",
            quotaWarning && "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500",
            className
          )}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {/* Status indicators */}
          {showStatus && (isUsingFallback || quotaWarning) && (
            <div className="flex items-center">
              {quotaWarning && (
                <Clock className="h-3 w-3 text-yellow-500" title="API quota warning" />
              )}
              {isUsingFallback && (
                <WifiOff className="h-3 w-3 text-orange-500" title="Using offline search" />
              )}
            </div>
          )}
          
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="hover:text-gray-600"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {showStatus && (quotaWarning || isUsingFallback) && !error && (
        <div className="mt-1 text-xs">
          {quotaWarning && !isUsingFallback && (
            <p className="text-yellow-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Search quota running low. Results may be limited.
            </p>
          )}
          {isUsingFallback && (
            <p className="text-orange-600 flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Showing popular destinations. You can still type any destination.
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {/* Fallback indicator in dropdown header */}
          {isUsingFallback && (
            <div className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-700 flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Popular destinations (offline search)
            </div>
          )}
          
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50",
                "focus:outline-none border-b border-gray-100 last:border-b-0",
                suggestion.fallback && "bg-orange-25" // Subtle highlight for fallback results
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="flex items-center mt-1">
                  <MapPin className={cn(
                    "h-4 w-4 flex-shrink-0",
                    suggestion.fallback ? "text-orange-500" : "text-gray-400"
                  )} />
                  {suggestion.fallback && (
                    <WifiOff className="h-2 w-2 text-orange-400 ml-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.mainText}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.secondaryText}
                  </p>
                  {suggestion.fallback && suggestion.popularity && (
                    <div className="flex items-center mt-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1 h-1 rounded-full mr-0.5",
                              i < (suggestion.popularity || 0) / 2 
                                ? "bg-orange-400" 
                                : "bg-gray-200"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 ml-1">Popular</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {/* Manual entry suggestion */}
          {isUsingFallback && value.length >= 3 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  onChange(value)
                  setIsOpen(false)
                }}
                className="w-full text-left text-xs text-gray-600 hover:text-gray-800"
              >
                💡 Can't find "{value}"? Click here to use it anyway
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}