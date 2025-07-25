import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { collaborationService } from '@/lib/collaboration-service'
import { inviteUserSchema } from '@/lib/collaboration-types'
import { sendInvitationEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tripId, email, role, message } = inviteUserSchema.parse(body)

    // Create invitation
    const invitation = await collaborationService.createInvitation(
      tripId,
      session.user.id,
      email,
      role,
      message
    )

    // Send invitation email
    try {
      await sendInvitationEmail(invitation)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the invitation if email fails
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }
    })

  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invitation' },
      { status: 400 }
    )
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
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 })
    }

    // Get trip collaboration data
    const collaboration = await collaborationService.getTripCollaboration(tripId, session.user.id)

    if (!collaboration) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ collaboration })

  } catch (error) {
    console.error('Collaboration fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collaboration data' },
      { status: 500 }
    )
  }
}