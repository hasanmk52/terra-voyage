import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pdfGenerator } from '@/lib/pdf-generator'
import { z } from 'zod'

const exportRequestSchema = z.object({
  tripId: z.string(),
  options: z.object({
    includeWeather: z.boolean().optional().default(false),
    includeMap: z.boolean().optional().default(false),
    includeEmergencyInfo: z.boolean().optional().default(true),
    format: z.enum(['A4', 'Letter']).optional().default('A4'),
    orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
    theme: z.enum(['modern', 'classic', 'minimal']).optional().default('modern')
  }).optional().default({})
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tripId, options } = exportRequestSchema.parse(body)

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

    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateItineraryPDF(trip, undefined, options)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('PDF export error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate PDF export' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'PDF Export API',
    endpoints: {
      'POST /api/export/pdf': 'Generate PDF export of trip itinerary'
    }
  })
}