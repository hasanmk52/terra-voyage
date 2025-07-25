"use client"

import { useState, useRef, useEffect } from "react"
import { DollarSign, ChevronDown } from "lucide-react"
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

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
]

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

  const selectedCurrency = currencies.find(c => c.code === value.currency) || currencies[0]

  // Update custom amount when value changes
  useEffect(() => {
    setCustomAmount(value.amount.toString())
  }, [value.amount])

  // Generate display text
  const getDisplayText = () => {
    const amount = formatCurrency(value.amount, value.currency)
    const rangeText = value.range === "per-person" ? "per person" : "total"
    return `${amount} ${rangeText}`
  }

  // Handle preset budget selection
  const handlePresetSelect = (amount: number) => {
    onChange({
      ...value,
      amount,
    })
    setShowCustomInput(false)
    setIsOpen(false)
  }

  // Handle currency change
  const handleCurrencyChange = (currencyCode: string) => {
    onChange({
      ...value,
      currency: currencyCode,
    })
  }

  // Handle range type change
  const handleRangeChange = (range: "per-person" | "total") => {
    onChange({
      ...value,
      range,
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
        setShowCustomInput(false)
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
          className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4"
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

          {/* Currency Selector */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Currency
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => handleCurrencyChange(currency.code)}
                  className={cn(
                    "px-2 py-1 text-xs rounded border transition-colors text-left",
                    value.currency === currency.code
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="font-medium">{currency.symbol} {currency.code}</div>
                </button>
              ))}
            </div>
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
                          {formatCurrency(range.value, value.currency)} {range.label}
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
                  Range: {formatCurrency(minAmount, value.currency)} - {formatCurrency(maxAmount, value.currency)}
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