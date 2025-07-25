import { parseISO } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

// Common timezone mappings for travel destinations
export const DESTINATION_TIMEZONES: Record<string, string> = {
  // North America
  'New York': 'America/New_York',
  'Los Angeles': 'America/Los_Angeles',
  'Chicago': 'America/Chicago',
  'Denver': 'America/Denver',
  'Toronto': 'America/Toronto',
  'Vancouver': 'America/Vancouver',
  'Mexico City': 'America/Mexico_City',

  // Europe
  'London': 'Europe/London',
  'Paris': 'Europe/Paris',
  'Berlin': 'Europe/Berlin',
  'Rome': 'Europe/Rome',
  'Madrid': 'Europe/Madrid',
  'Amsterdam': 'Europe/Amsterdam',
  'Stockholm': 'Europe/Stockholm',
  'Moscow': 'Europe/Moscow',
  'Athens': 'Europe/Athens',
  'Prague': 'Europe/Prague',

  // Asia
  'Tokyo': 'Asia/Tokyo',
  'Singapore': 'Asia/Singapore',
  'Hong Kong': 'Asia/Hong_Kong',
  'Shanghai': 'Asia/Shanghai',
  'Delhi': 'Asia/Kolkata',
  'Mumbai': 'Asia/Kolkata',
  'Bangkok': 'Asia/Bangkok',
  'Seoul': 'Asia/Seoul',
  'Manila': 'Asia/Manila',
  'Kuala Lumpur': 'Asia/Kuala_Lumpur',

  // Oceania
  'Sydney': 'Australia/Sydney',
  'Melbourne': 'Australia/Melbourne',
  'Auckland': 'Pacific/Auckland',

  // Middle East & Africa
  'Dubai': 'Asia/Dubai',
  'Cairo': 'Africa/Cairo',
  'Cape Town': 'Africa/Johannesburg',
  'Istanbul': 'Europe/Istanbul',

  // South America
  'Buenos Aires': 'America/Argentina/Buenos_Aires',
  'São Paulo': 'America/Sao_Paulo',
  'Lima': 'America/Lima',
  'Santiago': 'America/Santiago'
}

export interface TimezoneInfo {
  timezone: string
  offset: string
  offsetMinutes: number
  isDST: boolean
  abbreviation: string
}

export class TimezoneUtils {
  /**
   * Get timezone for a destination
   */
  static getDestinationTimezone(destination: string): string {
    // Try exact match first
    if (DESTINATION_TIMEZONES[destination]) {
      return DESTINATION_TIMEZONES[destination]
    }

    // Try partial matches
    const normalizedDestination = destination.toLowerCase()
    for (const [city, timezone] of Object.entries(DESTINATION_TIMEZONES)) {
      if (normalizedDestination.includes(city.toLowerCase()) || 
          city.toLowerCase().includes(normalizedDestination)) {
        return timezone
      }
    }

    // Default to UTC if no match found
    return 'UTC'
  }

  /**
   * Convert UTC time to destination timezone
   */
  static convertToDestinationTime(
    utcTime: Date | string,
    destinationTimezone: string,
    formatString: string = 'yyyy-MM-dd HH:mm:ss'
  ): string {
    const date = typeof utcTime === 'string' ? parseISO(utcTime) : utcTime
    return formatInTimeZone(date, destinationTimezone, formatString)
  }

  /**
   * Convert destination time to UTC
   */
  static convertToUTC(
    localTime: Date | string,
    sourceTimezone: string
  ): Date {
    const date = typeof localTime === 'string' ? parseISO(localTime) : localTime
    return fromZonedTime(date, sourceTimezone)
  }

  /**
   * Get timezone information for a specific timezone
   */
  static getTimezoneInfo(timezone: string, date: Date = new Date()): TimezoneInfo {
    const zonedDate = toZonedTime(date, timezone)
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short'
    })
    
    const parts = formatter.formatToParts(date)
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || ''
    
    // Calculate offset (correct calculation)
    const utcDate = new Date(date.getTime())
    const offsetMinutes = (utcDate.getTime() - zonedDate.getTime()) / (1000 * 60)
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
    const offsetMins = Math.abs(offsetMinutes) % 60
    const offsetSign = offsetMinutes >= 0 ? '+' : '-'
    const offset = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`

    // Detect DST (simplified check)
    const winterDate = new Date(date.getFullYear(), 0, 1)
    const summerDate = new Date(date.getFullYear(), 6, 1)
    const winterOffset = this.getTimezoneOffset(timezone, winterDate)
    const summerOffset = this.getTimezoneOffset(timezone, summerDate)
    const currentOffset = this.getTimezoneOffset(timezone, date)
    const isDST = currentOffset !== winterOffset && winterOffset !== summerOffset

    return {
      timezone,
      offset,
      offsetMinutes,
      isDST,
      abbreviation: timeZoneName
    }
  }

  private static getTimezoneOffset(timezone: string, date: Date): number {
    const utcDate = new Date(date.getTime())
    const zonedDate = toZonedTime(date, timezone)
    return (utcDate.getTime() - zonedDate.getTime()) / (1000 * 60)
  }

  /**
   * Format time with timezone information
   */
  static formatWithTimezone(
    date: Date | string,
    timezone: string,
    options: {
      includeTimezone?: boolean
      includeDate?: boolean
      format12Hour?: boolean
    } = {}
  ): string {
    const {
      includeTimezone = true,
      includeDate = true,
      format12Hour = true
    } = options

    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    let formatString = ''
    if (includeDate) {
      formatString += 'MMM d, yyyy '
    }
    
    if (format12Hour) {
      formatString += 'h:mm a'
    } else {
      formatString += 'HH:mm'
    }

    let formatted = formatInTimeZone(dateObj, timezone, formatString)

    if (includeTimezone) {
      const tzInfo = this.getTimezoneInfo(timezone, dateObj)
      formatted += ` (${tzInfo.abbreviation})`
    }

    return formatted
  }

  /**
   * Get time difference between two timezones
   */
  static getTimeDifference(
    timezone1: string,
    timezone2: string,
    date: Date = new Date()
  ): {
    hoursDifference: number
    minutesDifference: number
    description: string
  } {
    const tz1Info = this.getTimezoneInfo(timezone1, date)
    const tz2Info = this.getTimezoneInfo(timezone2, date)
    
    const minutesDifference = tz2Info.offsetMinutes - tz1Info.offsetMinutes
    const hoursDifference = minutesDifference / 60

    let description = ''
    if (minutesDifference === 0) {
      description = 'Same time'
    } else if (minutesDifference > 0) {
      const hours = Math.floor(Math.abs(minutesDifference) / 60)
      const minutes = Math.abs(minutesDifference) % 60
      description = `${timezone2} is ${hours}h ${minutes}m ahead of ${timezone1}`
    } else {
      const hours = Math.floor(Math.abs(minutesDifference) / 60)
      const minutes = Math.abs(minutesDifference) % 60
      description = `${timezone2} is ${hours}h ${minutes}m behind ${timezone1}`
    }

    return {
      hoursDifference,
      minutesDifference,
      description
    }
  }

  /**
   * Convert activity times for different timezones
   */
  static convertActivityTimes(
    activities: Array<{
      id: string
      startTime?: Date | null
      endTime?: Date | null
    }>,
    fromTimezone: string,
    toTimezone: string
  ) {
    return activities.map(activity => ({
      ...activity,
      startTime: activity.startTime 
        ? toZonedTime(
            fromZonedTime(activity.startTime, fromTimezone),
            toTimezone
          )
        : activity.startTime,
      endTime: activity.endTime
        ? toZonedTime(
            fromZonedTime(activity.endTime, fromTimezone),
            toTimezone
          )
        : activity.endTime
    }))
  }

  /**
   * Get business hours for a timezone
   */
  static getBusinessHours(timezone: string, date: Date = new Date()): {
    open: string
    close: string
    isBusinessHours: boolean
  } {
    // Default business hours 9 AM - 6 PM local time
    const open = formatInTimeZone(
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
      timezone,
      'HH:mm'
    )
    
    const close = formatInTimeZone(
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0),
      timezone,
      'HH:mm'
    )

    const currentTime = formatInTimeZone(date, timezone, 'HH:mm')
    const isBusinessHours = currentTime >= open && currentTime <= close

    return { open, close, isBusinessHours }
  }

  /**
   * Get available timezones list for dropdowns
   */
  static getAvailableTimezones(): Array<{
    value: string
    label: string
    region: string
    offset: string
  }> {
    const now = new Date()
    const timezones = Object.entries(DESTINATION_TIMEZONES).map(([city, timezone]) => {
      const info = this.getTimezoneInfo(timezone, now)
      const region = timezone.split('/')[0].replace('_', ' ')
      
      return {
        value: timezone,
        label: `${city} (${info.abbreviation})`,
        region,
        offset: info.offset
      }
    })

    // Sort by offset, then by label
    return timezones.sort((a, b) => {
      if (a.offset !== b.offset) {
        return a.offset.localeCompare(b.offset)
      }
      return a.label.localeCompare(b.label)
    })
  }
}

export default TimezoneUtils