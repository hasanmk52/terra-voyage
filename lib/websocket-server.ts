import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { CollaborationEvent, UserPresence } from './collaboration-types'
import { collaborationService } from './collaboration-service'
import jwt from 'jsonwebtoken'

export class WebSocketServer {
  private io: SocketIOServer
  private userPresence: Map<string, UserPresence> = new Map()
  private tripRooms: Map<string, Set<string>> = new Map()

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      path: '/api/socket'
    })

    this.setupAuthentication()
    this.setupEventHandlers()
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          throw new Error('No token provided')
        }

        // Verify JWT token (assuming you're using JWT for session management)
        // In a real app, you'd verify the NextAuth session token
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
        socket.data.userId = decoded.sub || decoded.userId
        socket.data.userName = decoded.name
        socket.data.userImage = decoded.picture || decoded.image

        next()
      } catch (err) {
        console.error('WebSocket authentication error:', err)
        next(new Error('Authentication failed'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.data.userId} connected`)

      // Handle joining trip room
      socket.on('join-trip', async (tripId: string) => {
        try {
          // Verify user has access to trip
          const collaboration = await collaborationService.getTripCollaboration(
            tripId, 
            socket.data.userId
          )

          if (!collaboration) {
            socket.emit('error', { message: 'Access denied to trip' })
            return
          }

          // Join room
          socket.join(`trip-${tripId}`)
          
          // Add to trip rooms tracking
          if (!this.tripRooms.has(tripId)) {
            this.tripRooms.set(tripId, new Set())
          }
          this.tripRooms.get(tripId)!.add(socket.data.userId)

          // Update user presence
          const presence: UserPresence = {
            userId: socket.data.userId,
            userName: socket.data.userName,
            userImage: socket.data.userImage,
            isOnline: true,
            lastSeen: new Date(),
            currentPage: `trip-${tripId}`
          }
          
          this.userPresence.set(socket.data.userId, presence)

          // Notify other users in trip
          socket.to(`trip-${tripId}`).emit('user-presence-updated', presence)

          // Send current online users to the new user
          const onlineUsers = Array.from(this.tripRooms.get(tripId)!)
            .map(userId => this.userPresence.get(userId))
            .filter(Boolean)

          socket.emit('online-users', onlineUsers)

          console.log(`User ${socket.data.userId} joined trip ${tripId}`)

        } catch (error) {
          console.error('Error joining trip:', error)
          socket.emit('error', { message: 'Failed to join trip' })
        }
      })

      // Handle leaving trip room
      socket.on('leave-trip', (tripId: string) => {
        socket.leave(`trip-${tripId}`)
        
        // Remove from trip rooms tracking
        this.tripRooms.get(tripId)?.delete(socket.data.userId)
        
        // Update presence
        const presence = this.userPresence.get(socket.data.userId)
        if (presence) {
          presence.isOnline = false
          presence.lastSeen = new Date()
          presence.currentPage = undefined
        }

        // Notify other users
        socket.to(`trip-${tripId}`).emit('user-presence-updated', presence)

        console.log(`User ${socket.data.userId} left trip ${tripId}`)
      })

      // Handle real-time activity updates
      socket.on('activity-updated', (data: {
        tripId: string
        activityId: string
        changes: any
      }) => {
        const event: CollaborationEvent = {
          type: 'activity_updated',
          userId: socket.data.userId,
          userName: socket.data.userName,
          tripId: data.tripId,
          data: {
            activityId: data.activityId,
            changes: data.changes
          },
          timestamp: new Date()
        }

        // Broadcast to other users in the trip (excluding sender)
        socket.to(`trip-${data.tripId}`).emit('collaboration-event', event)
      })

      // Handle trip updates
      socket.on('trip-updated', (data: {
        tripId: string
        changes: any
      }) => {
        const event: CollaborationEvent = {
          type: 'trip_updated',
          userId: socket.data.userId,
          userName: socket.data.userName,
          tripId: data.tripId,
          data: {
            changes: data.changes
          },
          timestamp: new Date()
        }

        socket.to(`trip-${data.tripId}`).emit('collaboration-event', event)
      })

      // Handle new comments
      socket.on('comment-added', (data: {
        tripId: string
        commentId: string
        comment: any
      }) => {
        const event: CollaborationEvent = {
          type: 'comment_added',
          userId: socket.data.userId,
          userName: socket.data.userName,
          tripId: data.tripId,
          data: {
            commentId: data.commentId,
            comment: data.comment
          },
          timestamp: new Date()
        }

        socket.to(`trip-${data.tripId}`).emit('collaboration-event', event)
      })

      // Handle votes
      socket.on('vote-added', (data: {
        tripId: string
        activityId: string
        vote: any
      }) => {
        const event: CollaborationEvent = {
          type: 'vote_added',
          userId: socket.data.userId,
          userName: socket.data.userName,
          tripId: data.tripId,
          data: {
            activityId: data.activityId,
            vote: data.vote
          },
          timestamp: new Date()
        }

        socket.to(`trip-${data.tripId}`).emit('collaboration-event', event)
      })

      // Handle user typing indicators
      socket.on('typing-start', (data: { tripId: string; location?: string }) => {
        socket.to(`trip-${data.tripId}`).emit('user-typing', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          location: data.location,
          isTyping: true
        })
      })

      socket.on('typing-stop', (data: { tripId: string }) => {
        socket.to(`trip-${data.tripId}`).emit('user-typing', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          isTyping: false
        })
      })

      // Handle cursor position sharing (for real-time collaboration)
      socket.on('cursor-move', (data: {
        tripId: string
        position: { x: number; y: number }
        element?: string
      }) => {
        socket.to(`trip-${data.tripId}`).emit('user-cursor', {
          userId: socket.data.userId,
          userName: socket.data.userName,
          position: data.position,
          element: data.element
        })
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.data.userId} disconnected`)

        // Update presence
        const presence = this.userPresence.get(socket.data.userId)
        if (presence) {
          presence.isOnline = false
          presence.lastSeen = new Date()
          presence.currentPage = undefined

          // Notify all rooms this user was in
          for (const [tripId, users] of this.tripRooms.entries()) {
            if (users.has(socket.data.userId)) {
              users.delete(socket.data.userId)
              this.io.to(`trip-${tripId}`).emit('user-presence-updated', presence)
            }
          }
        }

        // Clean up empty rooms
        for (const [tripId, users] of this.tripRooms.entries()) {
          if (users.size === 0) {
            this.tripRooms.delete(tripId)
          }
        }
      })
    })
  }

  // Method to send events from server-side
  public emitToTrip(tripId: string, event: string, data: any) {
    this.io.to(`trip-${tripId}`).emit(event, data)
  }

  // Method to get online users for a trip
  public getOnlineUsers(tripId: string): UserPresence[] {
    const users = this.tripRooms.get(tripId) || new Set()
    return Array.from(users)
      .map(userId => this.userPresence.get(userId))
      .filter((presence): presence is UserPresence => !!presence && presence.isOnline)
  }

  // Method to check if user is online
  public isUserOnline(userId: string): boolean {
    const presence = this.userPresence.get(userId)
    return !!presence && presence.isOnline
  }

  // Method to get user presence
  public getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId)
  }

  // Cleanup method
  public cleanup() {
    this.userPresence.clear()
    this.tripRooms.clear()
  }
}

// Singleton instance
let webSocketServer: WebSocketServer | null = null

export function initializeWebSocketServer(server: HTTPServer): WebSocketServer {
  if (!webSocketServer) {
    webSocketServer = new WebSocketServer(server)
  }
  return webSocketServer
}

export function getWebSocketServer(): WebSocketServer | null {
  return webSocketServer
}