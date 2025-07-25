import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { calendarGenerator } from '@/lib/calendar-generator'
import { z } from 'zod'

const calendarExportSchema = z.object({
  tripId: z.string(),
  format: z.enum(['ical', 'google', 'outlook']).default('ical'),
  activityId: z.string().optional(),
  options: z.object({
    timezone: z.string().optional().default('UTC'),
    includeDescription: z.boolean().optional().default(true),
    includeLocation: z.boolean().optional().default(true),
    reminderMinutes: z.array(z.number()).optional().default([15, 60])
  }).optional().default({})
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tripId, format, activityId, options } = calendarExportSchema.parse(body)

    // Fetch trip with activities and user data
    const trip = await db.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId: session.user.id },
          {
            collaborations: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        activities: {
          where: activityId ? { id: activityId } : undefined,
          orderBy: [
            { startTime: 'asc' },
            { createdAt: 'asc' }
          ]
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 })
    }

    // Handle single activity URL generation
    if (activityId && trip.activities.length === 1) {
      const activity = trip.activities[0]
      
      switch (format) {
        case 'google':
          const googleUrl = calendarGenerator.generateGoogleCalendarUrl(activity, options.timezone)
          return NextResponse.json({ url: googleUrl })
          
        case 'outlook':
          const outlookUrl = calendarGenerator.generateOutlookCalendarUrl(activity, options.timezone)
          return NextResponse.json({ url: outlookUrl })
          
        case 'ical':
          const icsContent = calendarGenerator.generateAppleCalendarEvent(activity, options.timezone)
          return new NextResponse(icsContent, {
            headers: {
              'Content-Type': 'text/calendar',
              'Content-Disposition': `attachment; filename="${activity.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`
            }
          })
      }
    }

    // Handle full trip calendar export
    if (format === 'ical') {
      const icalContent = await calendarGenerator.generateiCal(trip, options)
      
      return new NextResponse(icalContent, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.ics"`
        }
      })
    }

    // For Google and Outlook, we can't generate a single URL for multiple events
    // Return URLs for each activity
    const urls = trip.activities
      .filter(activity => activity.startTime)
      .map(activity => {
        const url = format === 'google' 
          ? calendarGenerator.generateGoogleCalendarUrl(activity, options.timezone)
          : calendarGenerator.generateOutlookCalendarUrl(activity, options.timezone)
        
        return {
          activityId: activity.id,
          activityName: activity.name,
          url
        }
      })

    return NextResponse.json({ 
      message: `Generated ${urls.length} calendar URLs`,
      urls 
    })

  } catch (error) {
    console.error('Calendar export error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate calendar export' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Calendar Export API',
    endpoints: {
      'POST /api/export/calendar': 'Generate calendar export for trip or individual activity'
    },
    formats: ['ical', 'google', 'outlook'],
    examples: {
      'Full trip iCal': {
        tripId: 'trip-id',
        format: 'ical'
      },
      'Single activity Google Calendar': {
        tripId: 'trip-id',
        activityId: 'activity-id',
        format: 'google'
      }
    }
  })
}