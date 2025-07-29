"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { DayPicker, DateRange } from "react-day-picker"
import { format, isAfter, isBefore, startOfDay, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import "react-day-picker/style.css"

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onChange: (startDate: Date | undefined, endDate: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  minDays?: number
  maxDays?: number
  error?: boolean
  errorMessage?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Select your travel dates",
  className,
  disabled,
  minDate,
  maxDate,
  minDays = 1,
  maxDays = 365,
  error = false,
  errorMessage,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Update selected range when props change
  useEffect(() => {
    setSelectedRange({
      from: startDate,
      to: endDate,
    })
  }, [startDate, endDate])

  // Handle date selection
  const handleSelect = (range: DateRange | undefined) => {
    if (!range) return

    let { from, to } = range

    // If only start date is selected and we click on a date before it, swap them
    if (from && to && isBefore(to, from)) {
      [from, to] = [to, from]
    }

    // Validate minimum days
    if (from && to && minDays > 1) {
      const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff < minDays - 1) {
        to = addDays(from, minDays - 1)
      }
    }

    // Validate maximum days
    if (from && to && maxDays) {
      const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > maxDays - 1) {
        to = addDays(from, maxDays - 1)
      }
    }

    setSelectedRange({ from, to })

    // Update parent immediately for reactivity
    onChange(from, to)
    
    // Only close dropdown when BOTH dates are selected AND user confirms
    // Keep dropdown open for partial selections
    if (from && !to) {
      // Keep dropdown open when only start date is selected
      // This allows user to see their selection and pick end date
    }
    // Note: Dropdown will only close via "Confirm dates" button or click outside
  }

  // Format display text
  const getDisplayText = () => {
    if (!selectedRange?.from) return placeholder

    if (selectedRange.from && selectedRange.to) {
      const nights = Math.ceil(
        (selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)
      )
      return `${format(selectedRange.from, "MMM d")} - ${format(
        selectedRange.to,
        "MMM d, yyyy"
      )} (${nights} night${nights !== 1 ? "s" : ""})`
    }

    return `${format(selectedRange.from, "MMM d, yyyy")} - Select check-out date`
  }

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRange(undefined)
    onChange(undefined, undefined)
  }

  // Handle click outside and keyboard shortcuts
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return
      
      // Close with Escape
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
      
      // Confirm selection with Enter when both dates are selected
      if (event.key === 'Enter' && selectedRange?.from && selectedRange?.to) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, selectedRange])

  // Set up date constraints
  const today = startOfDay(new Date())
  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : [{ before: today }]),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left border rounded-lg",
          error 
            ? "border-red-300 hover:border-red-400 focus:ring-red-500 focus:border-red-500" 
            : "border-gray-300 hover:border-gray-400 focus:ring-blue-500 focus:border-blue-500",
          "focus:outline-none focus:ring-2",
          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
          selectedRange?.from ? "text-gray-900" : "text-gray-500",
          className
        )}
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedRange?.from && !disabled && (
            <div
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClear(e as React.MouseEvent<HTMLDivElement>)
                }
              }}
            >
              <X className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </div>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4"
          style={{ minWidth: "320px" }}
        >
          {/* Helper text with better visual feedback */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              {!selectedRange?.from && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-700 font-medium">Step 1: Select your check-in date</span>
                </>
              )}
              {selectedRange?.from && !selectedRange?.to && (
                <>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-700 font-medium">Step 2: Select your check-out date</span>
                </>
              )}
              {selectedRange?.from && selectedRange?.to && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium">✓ Both dates selected - Ready to confirm</span>
                </>
              )}
            </div>
          </div>
          
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            disabled={disabledDays}
            numberOfMonths={2}
            className="rdp-custom"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
              day_range_start: "day-range-start bg-blue-600 text-white hover:bg-blue-600",
              day_range_end: "day-range-end bg-blue-600 text-white hover:bg-blue-600",
              day_selected: "bg-blue-600 text-white hover:bg-blue-600 focus:bg-blue-600",
              day_today: "bg-gray-100 text-gray-900 font-semibold",
              day_outside: "text-gray-400 opacity-50",
              day_disabled: "text-gray-400 opacity-50 cursor-not-allowed",
              day_range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-900",
              day_hidden: "invisible",
            }}
          />

          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-500">
              {minDays > 1 && (
                <span>Minimum stay: {minDays} night{minDays !== 1 ? "s" : ""}</span>
              )}
              <div className="flex gap-4">
                <span>Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to close</span>
                {selectedRange?.from && selectedRange?.to && (
                  <span>Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to confirm</span>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedRange(undefined)
                  onChange(undefined, undefined)
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear dates
              </button>
              
              <div className="flex gap-2">
                {selectedRange?.from && selectedRange?.to ? (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Selection
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 bg-gray-300 text-gray-500 text-sm rounded-md cursor-not-allowed"
                  >
                    Select both dates first
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && errorMessage && (
        <div className="mt-2 text-sm text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  )
}