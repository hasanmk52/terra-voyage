import { useMocks, simulateDelay } from './mock-data'

// Mock WebSocket server implementation
class MockWebSocketServer {
  private connections: Map<string, MockWebSocketConnection> = new Map()
  private rooms: Map<string, Set<string>> = new Map()
  
  constructor() {
    // Start mock event simulation
    if (useMocks) {
      this.startMockEventSimulation()
    }
  }

  // Simulate WebSocket connection
  createConnection(userId: string): MockWebSocketConnection {
    const connection = new MockWebSocketConnection(userId, this)
    this.connections.set(userId, connection)
    return connection
  }

  // Join a room (trip collaboration)
  joinRoom(userId: string, roomId: string) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }
    this.rooms.get(roomId)!.add(userId)
    
    // Notify others in the room
    this.broadcastToRoom(roomId, 'user_joined', {
      userId,
      timestamp: new Date().toISOString()
    }, userId)
  }

  // Leave a room
  leaveRoom(userId: string, roomId: string) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.delete(userId)
      if (room.size === 0) {
        this.rooms.delete(roomId)
      } else {
        this.broadcastToRoom(roomId, 'user_left', {
          userId,
          timestamp: new Date().toISOString()
        }, userId)
      }
    }
  }

  // Broadcast to all users in a room
  broadcastToRoom(roomId: string, event: string, data: any, excludeUserId?: string) {
    const room = this.rooms.get(roomId)
    if (!room) return

    for (const userId of room) {
      if (userId !== excludeUserId) {
        const connection = this.connections.get(userId)
        if (connection) {
          connection.emit(event, data)
        }
      }
    }
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    const connection = this.connections.get(userId)
    if (connection) {
      connection.emit(event, data)
    }
  }

  // Disconnect a user
  disconnect(userId: string) {
    // Leave all rooms
    for (const [roomId, room] of this.rooms) {
      if (room.has(userId)) {
        this.leaveRoom(userId, roomId)
      }
    }
    
    // Remove connection
    this.connections.delete(userId)
  }

  // Get online users for a room
  getOnlineUsers(roomId: string): string[] {
    const room = this.rooms.get(roomId)
    return room ? Array.from(room) : []
  }

  // Start mock event simulation (for demo purposes)
  private startMockEventSimulation() {
    if (!useMocks) return

    // Simulate periodic activity updates
    setInterval(() => {
      // Simulate a user editing an activity
      for (const [roomId, users] of this.rooms) {
        if (users.size > 0) {
          const randomUser = Array.from(users)[Math.floor(Math.random() * users.size)]
          this.broadcastToRoom(roomId, 'activity_updated', {
            activityId: 'activity-' + Math.floor(Math.random() * 10),
            changes: {
              title: 'Updated Activity Title',
              description: 'Updated via real-time collaboration'
            },
            updatedBy: randomUser,
            timestamp: new Date().toISOString()
          }, randomUser)
        }
      }
    }, 30000) // Every 30 seconds

    // Simulate typing indicators
    setInterval(() => {
      for (const [roomId, users] of this.rooms) {
        if (users.size > 1) {
          const usersArray = Array.from(users)
          const typingUser = usersArray[Math.floor(Math.random() * usersArray.length)]
          this.broadcastToRoom(roomId, 'user_typing', {
            userId: typingUser,
            timestamp: new Date().toISOString()
          }, typingUser)
        }
      }
    }, 45000) // Every 45 seconds
  }
}

// Mock WebSocket connection class
class MockWebSocketConnection {
  private userId: string
  private server: MockWebSocketServer
  private eventHandlers: Map<string, Function[]> = new Map()
  private isConnected: boolean = true

  constructor(userId: string, server: MockWebSocketServer) {
    this.userId = userId
    this.server = server
  }

  // Emit event to this connection
  emit(event: string, data: any) {
    if (!this.isConnected) return

    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in WebSocket event handler for ${event}:`, error)
      }
    })
  }

  // Listen for events
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  // Send event to server/room
  send(event: string, data: any) {
    if (!this.isConnected) return

    switch (event) {
      case 'join_trip':
        this.server.joinRoom(this.userId, data.tripId)
        break
      case 'leave_trip':
        this.server.leaveRoom(this.userId, data.tripId)
        break
      case 'activity_update':
        this.server.broadcastToRoom(data.tripId, 'activity_updated', {
          ...data,
          updatedBy: this.userId,
          timestamp: new Date().toISOString()
        }, this.userId)
        break
      case 'trip_update':
        this.server.broadcastToRoom(data.tripId, 'trip_updated', {
          ...data,
          updatedBy: this.userId,
          timestamp: new Date().toISOString()
        }, this.userId)
        break
      case 'comment_added':
        this.server.broadcastToRoom(data.tripId, 'comment_added', {
          ...data,
          authorId: this.userId,
          timestamp: new Date().toISOString()
        }, this.userId)
        break
      case 'cursor_position':
        this.server.broadcastToRoom(data.tripId, 'cursor_updated', {
          userId: this.userId,
          position: data.position,
          timestamp: new Date().toISOString()
        }, this.userId)
        break
      default:
        // Generic broadcast
        if (data.tripId) {
          this.server.broadcastToRoom(data.tripId, event, {
            ...data,
            userId: this.userId,
            timestamp: new Date().toISOString()
          }, this.userId)
        }
    }
  }

  // Disconnect
  disconnect() {
    this.isConnected = false
    this.server.disconnect(this.userId)
  }

  // Get connection status
  get connected() {
    return this.isConnected
  }
}

// Client-side mock WebSocket implementation
export class MockWebSocketClient {
  private connection: MockWebSocketConnection | null = null
  private server: MockWebSocketServer
  private userId: string

  constructor(userId: string = 'guest-user') {
    this.userId = userId
    this.server = mockWebSocketServer
  }

  async connect(): Promise<boolean> {
    await simulateDelay('websocket')
    
    if (useMocks) {
      this.connection = this.server.createConnection(this.userId)
      return true
    }
    
    return false
  }

  on(event: string, handler: Function) {
    if (this.connection) {
      this.connection.on(event, handler)
    }
  }

  emit(event: string, data: any) {
    if (this.connection) {
      this.connection.send(event, data)
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.disconnect()
      this.connection = null
    }
  }

  get connected() {
    return this.connection?.connected || false
  }

  // Helper methods for common operations
  joinTrip(tripId: string) {
    this.emit('join_trip', { tripId })
  }

  leaveTrip(tripId: string) {
    this.emit('leave_trip', { tripId })
  }

  updateActivity(tripId: string, activityId: string, changes: any) {
    this.emit('activity_update', {
      tripId,
      activityId,
      changes
    })
  }

  updateTrip(tripId: string, changes: any) {
    this.emit('trip_update', {
      tripId,
      changes
    })
  }

  addComment(tripId: string, comment: any) {
    this.emit('comment_added', {
      tripId,
      comment
    })
  }

  updateCursor(tripId: string, position: any) {
    this.emit('cursor_position', {
      tripId,
      position
    })
  }

  getOnlineUsers(tripId: string): string[] {
    return this.server.getOnlineUsers(tripId)
  }
}

// Export singleton server instance
export const mockWebSocketServer = new MockWebSocketServer()

// Export factory function for creating client connections
export const createMockWebSocketClient = (userId?: string) => {
  return new MockWebSocketClient(userId)
}

// Export types for mock WebSocket events
export interface WebSocketEvent {
  type: string
  data: any
  timestamp: string
  userId?: string
}

export interface CollaborationEvent extends WebSocketEvent {
  tripId: string
  activityId?: string
  changes?: any
}

export interface PresenceEvent extends WebSocketEvent {
  tripId: string
  action: 'join' | 'leave' | 'typing' | 'cursor'
}