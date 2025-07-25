import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { collaborationService } from '@/lib/collaboration-service'
import { updateCollaboratorRoleSchema } from '@/lib/collaboration-types'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tripId, userId, role } = updateCollaboratorRoleSchema.parse({
      ...body,
      tripId: body.tripId
    })

    // Update collaborator role
    await collaborationService.updateCollaboratorRole(
      tripId,
      session.user.id,
      userId,
      role
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Role update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update role' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    const userId = searchParams.get('userId')

    if (!tripId || !userId) {
      return NextResponse.json(
        { error: 'Trip ID and User ID are required' },
        { status: 400 }
      )
    }

    // Remove collaborator
    await collaborationService.removeCollaborator(tripId, session.user.id, userId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Member removal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove member' },
      { status: 400 }
    )
  }
}