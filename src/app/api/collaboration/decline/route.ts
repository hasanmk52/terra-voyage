import { NextRequest, NextResponse } from 'next/server'
import { collaborationService } from '@/lib/collaboration-service'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    // Decline invitation
    await collaborationService.declineInvitation(token)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Invitation decline error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decline invitation' },
      { status: 400 }
    )
  }
}