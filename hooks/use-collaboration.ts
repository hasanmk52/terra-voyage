'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'
import { CollaborationEvent, UserPresence } from '@/lib/collaboration-types'

interface UseCollaborationOptions {
  tripId: string
  enabled?: boolean
  onCollaborationEvent?: (event: CollaborationEvent) => void
  onUserPresenceUpdate?: (presence: UserPresence) => void
  onUserTyping?: (data: { userId: string; userName: string; isTyping: boolean; location?: string }) => void
}

export function useCollaboration({
  tripId,
  enabled = true,
  onCollaborationEvent,
  onUserPresenceUpdate,
  onUserTyping
}: UseCollaborationOptions) {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const maxReconnectAttempts = 5
  const reconnectAttemptsRef = useRef(0)

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !session?.user?.id || !tripId) {
      return
    }

    const connectSocket = () => {
      try {
        const newSocket = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          auth: {
            token: session.accessToken || 'temp-token' // You'd use the actual session token
          }
        })

        // Connection events
        newSocket.on('connect', () => {
          console.log('WebSocket connected')
          setIsConnected(true)
          setConnectionError(null)
          reconnectAttemptsRef.current = 0
          
          // Join the trip room
          newSocket.emit('join-trip', tripId)
        })

        newSocket.on('disconnect', () => {
          console.log('WebSocket disconnected')
          setIsConnected(false)
          setOnlineUsers([])
        })

        newSocket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error)
          setConnectionError(error.message)
          setIsConnected(false)
          
          // Implement exponential backoff for reconnection
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++
              newSocket.connect()
            }, delay)
          }
        })

        // Collaboration events
        newSocket.on('collaboration-event', (event: CollaborationEvent) => {
          console.log('Collaboration event:', event)
          onCollaborationEvent?.(event)
        })

        newSocket.on('user-presence-updated', (presence: UserPresence) => {
          console.log('User presence updated:', presence)
          setOnlineUsers(prev => {
            const filtered = prev.filter(u => u.userId !== presence.userId)
            return presence.isOnline ? [...filtered, presence] : filtered
          })
          onUserPresenceUpdate?.(presence)
        })

        newSocket.on('online-users', (users: UserPresence[]) => {
          console.log('Online users:', users)
          setOnlineUsers(users.filter(u => u.isOnline))
        })

        newSocket.on('user-typing', (data) => {
          onUserTyping?.(data)
        })

        newSocket.on('user-cursor', (data) => {
          // Handle cursor position updates
          console.log('User cursor:', data)
        })

        newSocket.on('error', (error) => {
          console.error('WebSocket error:', error)
          setConnectionError(error.message)
        })

        setSocket(newSocket)

        return newSocket
      } catch (error) {
        console.error('Failed to create socket:', error)
        setConnectionError('Failed to establish connection')
        return null
      }
    }

    const socketInstance = connectSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketInstance) {
        socketInstance.emit('leave-trip', tripId)
        socketInstance.disconnect()
      }
      setSocket(null)
      setIsConnected(false)
      setOnlineUsers([])
    }
  }, [enabled, session?.user?.id, tripId])

  // Emit activity update
  const emitActivityUpdate = useCallback((activityId: string, changes: any) => {
    if (socket && isConnected) {
      socket.emit('activity-updated', {
        tripId,
        activityId,
        changes
      })
    }
  }, [socket, isConnected, tripId])

  // Emit trip update
  const emitTripUpdate = useCallback((changes: any) => {
    if (socket && isConnected) {
      socket.emit('trip-updated', {
        tripId,
        changes
      })
    }
  }, [socket, isConnected, tripId])

  // Emit comment added
  const emitCommentAdded = useCallback((commentId: string, comment: any) => {
    if (socket && isConnected) {
      socket.emit('comment-added', {
        tripId,
        commentId,
        comment
      })
    }
  }, [socket, isConnected, tripId])

  // Emit vote added
  const emitVoteAdded = useCallback((activityId: string, vote: any) => {
    if (socket && isConnected) {
      socket.emit('vote-added', {
        tripId,
        activityId,
        vote
      })
    }
  }, [socket, isConnected, tripId])

  // Typing indicators
  const emitTypingStart = useCallback((location?: string) => {
    if (socket && isConnected) {
      socket.emit('typing-start', { tripId, location })
    }
  }, [socket, isConnected, tripId])

  const emitTypingStop = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { tripId })
    }
  }, [socket, isConnected, tripId])

  // Cursor sharing
  const emitCursorMove = useCallback((position: { x: number; y: number }, element?: string) => {
    if (socket && isConnected) {
      socket.emit('cursor-move', {
        tripId,
        position,
        element
      })
    }
  }, [socket, isConnected, tripId])

  // Retry connection
  const retryConnection = useCallback(() => {
    if (socket && !isConnected) {
      reconnectAttemptsRef.current = 0
      socket.connect()
    }
  }, [socket, isConnected])

  return {
    socket,
    isConnected,
    onlineUsers,
    connectionError,
    emitActivityUpdate,
    emitTripUpdate,
    emitCommentAdded,
    emitVoteAdded,
    emitTypingStart,
    emitTypingStop,
    emitCursorMove,
    retryConnection
  }
}

// Hook for managing typing indicators
export function useTypingIndicator(
  emitTypingStart: (location?: string) => void,
  emitTypingStop: () => void,
  debounceMs: number = 1000
) {
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const isTypingRef = useRef(false)

  const startTyping = useCallback((location?: string) => {
    if (!isTypingRef.current) {
      emitTypingStart(location)
      isTypingRef.current = true
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        emitTypingStop()
        isTypingRef.current = false
      }
    }, debounceMs)
  }, [emitTypingStart, emitTypingStop, debounceMs])

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (isTypingRef.current) {
      emitTypingStop()
      isTypingRef.current = false
    }
  }, [emitTypingStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return { startTyping, stopTyping }
}