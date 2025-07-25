import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { voteSchema } from '@/lib/collaboration-types'
import { votingService } from '@/lib/voting-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { activityId, value } = voteSchema.parse(body)

    // Cast or update vote
    const vote = await votingService.castVote(session.user.id, activityId, value)

    return NextResponse.json({ success: true, vote })

  } catch (error) {
    console.error('Vote casting error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cast vote' },
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
    const activityId = searchParams.get('activityId')
    const tripId = searchParams.get('tripId')

    if (activityId) {
      // Get votes for specific activity
      const votes = await votingService.getActivityVotes(activityId, session.user.id)
      return NextResponse.json({ votes })
    } else if (tripId) {
      // Get votes for entire trip
      const tripVotes = await votingService.getTripVotes(tripId, session.user.id)
      return NextResponse.json({ tripVotes })
    } else {
      return NextResponse.json(
        { error: 'Activity ID or Trip ID is required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Vote fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}