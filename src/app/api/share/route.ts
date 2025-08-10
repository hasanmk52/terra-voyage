import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { shareGenerator } from '@/lib/share-generator'
import { z } from 'zod'

const createShareSchema = z.object({
  tripId: z.string(),
  options: z.object({
    expiresInDays: z.number().optional().default(30),
    allowComments: z.boolean().optional().default(false),
    showContactInfo: z.boolean().optional().default(false),
    showBudget: z.boolean().optional().default(false),
    password: z.string().optional()
  }).default({
    expiresInDays: 30,
    allowComments: false,
    showContactInfo: false,
    showBudget: false
  })
})

const revokeShareSchema = z.object({
  tripId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tripId, options } = createShareSchema.parse(body)

    const result = await shareGenerator.createShareableLink(
      tripId,
      session.user.id,
      options
    )

    return NextResponse.json({
      message: 'Shareable link created successfully',
      shareToken: result.shareToken,
      shareUrl: result.shareUrl
    })

  } catch (error) {
    console.error('Share creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.issues 
      }, { status: 400 })
    }

    if (error instanceof Error) {
      if (error.message === 'Trip not found or access denied') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to create shareable link' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tripId } = revokeShareSchema.parse(body)

    const success = await shareGenerator.revokeShareableLink(tripId, session.user.id)

    if (!success) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Shareable link revoked successfully'
    })

  } catch (error) {
    console.error('Share revocation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.issues 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to revoke shareable link' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    const stats = await shareGenerator.getShareStats(tripId, session.user.id)

    if (!stats) {
      return NextResponse.json({ 
        message: 'No shared link found for this trip',
        hasSharedLink: false 
      })
    }

    return NextResponse.json({
      message: 'Share statistics retrieved successfully',
      hasSharedLink: true,
      ...stats
    })

  } catch (error) {
    console.error('Share stats error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Trip not found or access denied') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to retrieve share statistics' 
    }, { status: 500 })
  }
}