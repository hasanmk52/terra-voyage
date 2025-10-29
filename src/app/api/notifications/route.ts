import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    // Parameters are currently unused now that collaboration notifications are disabled,
    // but we parse them to maintain backward compatibility with callers.
    const { searchParams } = new URL(request.url)
    searchParams.get('limit')
    searchParams.get('unreadOnly')

    return NextResponse.json({
      notifications: [],
      unreadCount: 0,
      total: 0
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

    await request.json().catch(() => null)
    // Collaboration notifications have been removed; acknowledge the request.
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}
