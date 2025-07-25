import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commentSchema } from '@/lib/collaboration-types'
import { commentService } from '@/lib/comment-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = commentSchema.parse(body)

    // Create comment
    const comment = await commentService.createComment({
      ...validatedData,
      userId: session.user.id
    })

    return NextResponse.json({ success: true, comment })

  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
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
    const activityId = searchParams.get('activityId')

    if (tripId) {
      // Get comments for trip
      const comments = await commentService.getTripComments(tripId, session.user.id)
      return NextResponse.json({ comments })
    } else if (activityId) {
      // Get comments for activity
      const comments = await commentService.getActivityComments(activityId, session.user.id)
      return NextResponse.json({ comments })
    } else {
      return NextResponse.json(
        { error: 'Trip ID or Activity ID is required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Comment fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { commentId, content } = body

    if (!commentId || !content) {
      return NextResponse.json(
        { error: 'Comment ID and content are required' },
        { status: 400 }
      )
    }

    // Update comment
    const comment = await commentService.updateComment(commentId, session.user.id, content)

    return NextResponse.json({ success: true, comment })

  } catch (error) {
    console.error('Comment update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update comment' },
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
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // Delete comment
    await commentService.deleteComment(commentId, session.user.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Comment deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete comment' },
      { status: 400 }
    )
  }
}