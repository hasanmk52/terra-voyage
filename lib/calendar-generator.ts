import ical from 'ical-generator'
import { Trip, Activity } from '@prisma/client'
import { format, addMinutes, parseISO } from 'date-fns'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'

export interface TripWithActivities extends Trip {
  activities: Activity[]
  user: {
    name: string | null
    email: string
  }
}

export interface CalendarOptions {
  timezone?: string
  includeDescription?: boolean
  includeLocation?: boolean
  reminderMinutes?: number[]
}

export class CalendarGenerator {
  /**
   * Generate iCal format for all calendar applications
   */
  async generateiCal(
    trip: TripWithActivities,
    options: CalendarOptions = {}
  ): Promise<string> {
    const {
      timezone = 'UTC',
      includeDescription = true,
      includeLocation = true,
      reminderMinutes = [15, 60]
    } = options

    const calendar = ical({
      domain: 'terravoyage.com',
      name: `${trip.title} - Travel Itinerary`,
      description: `Complete travel itinerary for ${trip.destination}`,
      timezone: timezone,
      method: 'PUBLISH',
      prodId: {
        company: 'Terra Voyage',
        product: 'AI Travel Planner',
        language: 'EN'
      }
    })

    // Add trip overview event
    const tripStart = zonedTimeToUtc(parseISO(trip.startDate.toISOString()), timezone)
    const tripEnd = zonedTimeToUtc(parseISO(trip.endDate.toISOString()), timezone)

    calendar.createEvent({
      id: `trip-${trip.id}`,
      start: tripStart,
      end: tripEnd,
      summary: `Trip: ${trip.title}`,
      description: includeDescription ? this.generateTripDescription(trip) : undefined,
      location: trip.destination,
      allDay: true,
      categories: [{ name: 'Travel' }],
      status: 'CONFIRMED',
      organizer: {
        name: trip.user.name || 'Terra Voyage User',
        email: trip.user.email
      }
    })

    // Add individual activities
    for (const activity of trip.activities) {
      if (!activity.startTime) continue

      const startTime = zonedTimeToUtc(parseISO(activity.startTime.toISOString()), timezone)
      const endTime = activity.endTime 
        ? zonedTimeToUtc(parseISO(activity.endTime.toISOString()), timezone)
        : addMinutes(startTime, 60) // Default 1 hour duration

      calendar.createEvent({
        id: `activity-${activity.id}`,
        start: startTime,
        end: endTime,
        summary: activity.name,
        description: includeDescription ? this.generateActivityDescription(activity) : undefined,
        location: includeLocation && activity.location ? activity.location : undefined,
        categories: [{ name: this.getActivityCategory(activity.type) }],
        status: 'CONFIRMED',
        alarms: reminderMinutes.map(minutes => ({
          type: 'display',
          trigger: minutes * 60 // Convert to seconds
        })),
        organizer: {
          name: trip.user.name || 'Terra Voyage User',
          email: trip.user.email
        }
      })
    }

    return calendar.toString()
  }

  /**
   * Generate Google Calendar URL
   */
  generateGoogleCalendarUrl(activity: Activity, timezone: string = 'UTC'): string {
    if (!activity.startTime) return ''

    const startTime = formatInTimeZone(
      parseISO(activity.startTime.toISOString()),
      timezone,
      "yyyyMMdd'T'HHmmss'Z'"
    )
    
    const endTime = activity.endTime
      ? formatInTimeZone(
          parseISO(activity.endTime.toISOString()),
          timezone,
          "yyyyMMdd'T'HHmmss'Z'"
        )
      : formatInTimeZone(
          addMinutes(parseISO(activity.startTime.toISOString()), 60),
          timezone,
          "yyyyMMdd'T'HHmmss'Z'"
        )

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: activity.name,
      dates: `${startTime}/${endTime}`,
      details: this.generateActivityDescription(activity),
      location: activity.location || '',
      sf: 'true',
      output: 'xml'
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  /**
   * Generate Outlook Calendar URL
   */
  generateOutlookCalendarUrl(activity: Activity, timezone: string = 'UTC'): string {
    if (!activity.startTime) return ''

    const startTime = formatInTimeZone(
      parseISO(activity.startTime.toISOString()),
      timezone,
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    )
    
    const endTime = activity.endTime
      ? formatInTimeZone(
          parseISO(activity.endTime.toISOString()),
          timezone,
          "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        )
      : formatInTimeZone(
          addMinutes(parseISO(activity.startTime.toISOString()), 60),
          timezone,
          "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        )

    const params = new URLSearchParams({
      subject: activity.name,
      startdt: startTime,
      enddt: endTime,
      body: this.generateActivityDescription(activity),
      location: activity.location || '',
      path: '/calendar/action/compose',
      rru: 'addevent'
    })

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
  }

  /**
   * Generate Apple Calendar (.ics) file content for a single activity
   */
  generateAppleCalendarEvent(activity: Activity, timezone: string = 'UTC'): string {
    if (!activity.startTime) return ''

    const startTime = formatInTimeZone(
      parseISO(activity.startTime.toISOString()),
      timezone,
      "yyyyMMdd'T'HHmmss'Z'"
    )
    
    const endTime = activity.endTime
      ? formatInTimeZone(
          parseISO(activity.endTime.toISOString()),
          timezone,
          "yyyyMMdd'T'HHmmss'Z'"
        )
      : formatInTimeZone(
          addMinutes(parseISO(activity.startTime.toISOString()), 60),
          timezone,
          "yyyyMMdd'T'HHmmss'Z'"
        )

    const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'")

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Terra Voyage//AI Travel Planner//EN
BEGIN:VEVENT
UID:activity-${activity.id}@terravoyage.com
DTSTAMP:${now}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${activity.name}
DESCRIPTION:${this.generateActivityDescription(activity).replace(/\n/g, '\\n')}
LOCATION:${activity.location || ''}
STATUS:CONFIRMED
CATEGORIES:${this.getActivityCategory(activity.type)}
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${activity.name}
END:VALARM
END:VEVENT
END:VCALENDAR`
  }

  private generateTripDescription(trip: TripWithActivities): string {
    const duration = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    let description = `🌍 ${trip.destination} Adventure\n\n`
    description += `📅 Duration: ${duration} days\n`
    description += `👥 Travelers: ${trip.travelers}\n`
    
    if (trip.budget) {
      description += `💰 Budget: $${trip.budget.toLocaleString()}\n`
    }
    
    if (trip.description) {
      description += `\n📝 Overview:\n${trip.description}\n`
    }

    description += `\n🎯 Activities Planned: ${trip.activities.length}\n`
    description += `\n✈️ Generated by Terra Voyage - AI Travel Planner\n`
    description += `📱 Visit terravoyage.com for more details`

    return description
  }

  private generateActivityDescription(activity: Activity): string {
    let description = ''

    if (activity.description) {
      description += `${activity.description}\n\n`
    }

    if (activity.price) {
      description += `💰 Cost: $${activity.price.toLocaleString()} ${activity.currency || 'USD'}\n`
    }

    if (activity.notes) {
      description += `📝 Notes: ${activity.notes}\n`
    }

    description += `\n🏷️ Type: ${this.getActivityCategory(activity.type)}\n`
    description += `✈️ Planned with Terra Voyage`

    return description
  }

  private getActivityCategory(type: string): string {
    const categories: Record<string, string> = {
      ACCOMMODATION: 'Lodging',
      TRANSPORTATION: 'Transportation',
      RESTAURANT: 'Dining',
      ATTRACTION: 'Sightseeing',
      EXPERIENCE: 'Entertainment',
      SHOPPING: 'Shopping',
      OTHER: 'Travel'
    }
    return categories[type] || 'Travel'
  }
}

// Singleton instance
export const calendarGenerator = new CalendarGenerator()