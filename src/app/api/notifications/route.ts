import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { collaborationService } from '@/lib/collaboration-service'
import { useMocks, simulateDelay } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    // Use mock notifications if enabled
    if (useMocks) {
      await simulateDelay('notifications')
      
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '20')
      const unreadOnly = searchParams.get('unreadOnly') === 'true'
      
      // Mock notifications data
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'trip_shared',
          title: 'Trip Shared',
          message: 'John Doe shared "Paris Adventure" with you',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          data: {
            tripId: 'trip-1',
            tripTitle: 'Paris Adventure',
            sharedBy: 'John Doe'
          }
        },
        {
          id: 'notif-2',
          type: 'activity_updated',
          title: 'Activity Updated',
          message: 'Activity "Visit Eiffel Tower" was updated',
          read: false,
          createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          data: {
            tripId: 'trip-1',
            activityId: 'activity-1',
            activityTitle: 'Visit Eiffel Tower'
          }
        },
        {
          id: 'notif-3',
          type: 'comment_added',
          title: 'New Comment',
          message: 'Jane Smith added a comment to your trip',
          read: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          data: {
            tripId: 'trip-1',
            commentId: 'comment-1',
            commentBy: 'Jane Smith'
          }
        }
      ]
      
      // Filter and limit notifications
      let filteredNotifications = unreadOnly 
        ? mockNotifications.filter(n => !n.read)
        : mockNotifications
      
      filteredNotifications = filteredNotifications.slice(0, limit)
      
      const unreadCount = mockNotifications.filter(n => !n.read).length
      
      return NextResponse.json({
        notifications: filteredNotifications,
        unreadCount,
        totalCount: mockNotifications.length
      })
    }
    
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