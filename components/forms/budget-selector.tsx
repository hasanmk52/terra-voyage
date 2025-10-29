"use client"

import { useState, useRef, useEffect } from "react"
import { DollarSign, ChevronDown, Info } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"

export interface BudgetData {
  amount: number
  currency: string
  range: "per-person" | "total"
}

interface BudgetSelectorProps {
  value: BudgetData
  onChange: (budget: BudgetData) => void
  className?: string
  disabled?: boolean
  minAmount?: number
  maxAmount?: number
}

// Hardcoded to USD only
const defaultCurrency = { code: "USD", symbol: "$", name: "US Dollar" }

const budgetRanges = [
  { value: 500, label: "Budget", description: "Basic accommodations, local food" },
  { value: 1500, label: "Mid-range", description: "Comfortable hotels, mixed dining" },
  { value: 3000, label: "Luxury", description: "Premium hotels, fine dining" },
  { value: 5000, label: "Ultra-luxury", description: "5-star everything, exclusive experiences" },
]

export function BudgetSelector({
  value,
  onChange,
  className,
  disabled,
  minAmount = 100,
  maxAmount = 50000,
}: BudgetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customAmount, setCustomAmount] = useState(value.amount.toString())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedCurrency = defaultCurrency

  // Update custom amount when value changes
  useEffect(() => {
    setCustomAmount(value.amount.toString())
  }, [value.amount])

  // Generate display text
  const getDisplayText = () => {
    const amount = formatCurrency(value.amount, "USD")
    const rangeText = value.range === "per-person" ? "per person" : "total"
    return `${amount} ${rangeText}`
  }

  // Handle preset budget selection
  const handlePresetSelect = (amount: number) => {
    onChange({
      ...value,
      amount,
      currency: "USD", // Always set to USD
    })
    setShowCustomInput(false)
    setIsOpen(false)
  }

  // Handle range type change
  const handleRangeChange = (range: "per-person" | "total") => {
    onChange({
      ...value,
      range,
      currency: "USD", // Always set to USD
    })
  }

  // Handle custom amount change
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^0-9]/g, "")
    setCustomAmount(newValue)
    
    const amount = parseInt(newValue) || 0
    if (amount >= minAmount && amount <= maxAmount) {
      onChange({
        ...value,
        amount,
        currency: "USD", // Always set to USD
      })
    }
  }

  // Handle custom amount blur
  const handleCustomAmountBlur = () => {
    const amount = parseInt(customAmount) || minAmount
    const clampedAmount = Math.max(minAmount, Math.min(maxAmount, amount))
    
    setCustomAmount(clampedAmount.toString())
    onChange({
      ...value,
      amount: clampedAmount,
      currency: "USD", // Always set to USD
    })
  }

  // Handle click outside - simplified approach
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Don't close if clicking on dropdown content or main button
      if (
        dropdownRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      
      // Close dropdown for outside clicks
      setIsOpen(false)
      setShowCustomInput(false)
    }

    // Add listener after a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

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
          "text-gray-900",
          className
        )}
      >
        <div className="flex items-center space-x-3">
          <DollarSign className="h-5 w-5 text-gray-400" />
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
          className="absolute z-[100] mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-xl p-4"
          style={{ zIndex: 1000 }}
        >
          {/* Budget Range Type Selector */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Budget Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "per-person" as const, label: "Per Person" },
                { value: "total" as const, label: "Total Trip" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRangeChange(option.value)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-md border transition-colors",
                    value.range === option.value
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Information Note */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Budget covers destination expenses only (accommodations, activities, meals).
                Flight costs not included.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Close
            </button>
          </div>

          {/* Budget Amount */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">
              Budget Amount
            </label>

            {/* Preset Ranges */}
            {!showCustomInput && (
              <div className="space-y-2">
                {budgetRanges.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => handlePresetSelect(range.value)}
                    className={cn(
                      "w-full p-3 text-left border rounded-lg transition-colors",
                      value.amount === range.value
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(range.value, "USD")} {range.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {range.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Custom Amount</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Set your own budget
                  </div>
                </button>
              </div>
            )}

            {/* Custom Input */}
            {showCustomInput && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-gray-900">
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    onBlur={handleCustomAmountBlur}
                    placeholder="Enter amount"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  Range: {formatCurrency(minAmount, "USD")} - {formatCurrency(maxAmount, "USD")}
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Back to presets
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}