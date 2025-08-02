import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const timeDifference = endDate.getTime() - startDate.getTime()
  return Math.ceil(timeDifference / (1000 * 3600 * 24))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitFor: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), waitFor)
  }
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function formatBudgetDisplay(amount: number, currency: string = "USD", travelers: number = 1): {
  total: string
  perPerson?: string
  showPerPerson: boolean
} {
  // Amount is always the total trip budget
  const total = `${formatCurrency(amount, currency)} total`
  const showPerPerson = travelers > 1
  const perPerson = showPerPerson 
    ? `~${formatCurrency(Math.round(amount / travelers), currency)}/person`
    : undefined

  return {
    total,
    perPerson,
    showPerPerson
  }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}