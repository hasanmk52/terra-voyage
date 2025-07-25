import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { collaborationService } from '@/lib/collaboration-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Get user notifications
    const notifications = await collaborationService.getUserNotifications(
      session.user.id,
      limit
    )

    // Filter unread if requested
    const filteredNotifications = unreadOnly 
      ? notifications.filter(n => !n.read)
      : notifications

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({
      notifications: filteredNotifications,
      unreadCount,
      total: notifications.length
    })

  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      await collaborationService.markAllNotificationsRead(session.user.id)
    } else if (notificationId) {
      // Mark specific notification as read
      await collaborationService.markNotificationRead(notificationId, session.user.id)
    } else {
      return NextResponse.json(
        { error: 'Either notificationId or markAllAsRead is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}