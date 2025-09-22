'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CommentData, commentSchema } from '@/lib/collaboration-types'
import { useCollaboration, useTypingIndicator } from '@/hooks/use-collaboration'
import {
  MessageSquare,
  Send,
  Reply,
  Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'

type CommentFormData = z.infer<typeof commentSchema>

interface CommentsPanelProps {
  tripId: string
  activityId?: string
  canComment: boolean
  className?: string
}

export function CommentsPanel({
  tripId,
  activityId,
  canComment,
  className = ''
}: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const commentsEndRef = useRef<HTMLDivElement>(null)

  const { emitCommentAdded, emitTypingStart, emitTypingStop } = useCollaboration({
    tripId,
    enabled: true,
    onCollaborationEvent: (event) => {
      if (event.type === 'comment_added') {
        fetchComments()
      }
    },
    onUserTyping: (data) => {
      if (data.location === 'comments') {
        setTypingUsers(prev => 
          data.isTyping 
            ? [...prev.filter(u => u !== data.userName), data.userName].filter(Boolean)
            : prev.filter(u => u !== data.userName)
        )
      }
    }
  })

  const { startTyping, stopTyping } = useTypingIndicator(
    () => emitTypingStart('comments'),
    emitTypingStop,
    2000
  )

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
      tripId: activityId ? undefined : tripId,
      activityId,
      parentId: undefined
    }
  })

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (activityId) {
        params.append('activityId', activityId)
      } else {
        params.append('tripId', tripId)
      }

      const response = await fetch(`/api/comments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [tripId, activityId])

  useEffect(() => {
    fetchComments()
  }, [tripId, activityId, fetchComments])

  // Scroll to bottom when new comments are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const onSubmit = async (data: CommentFormData) => {
    if (!canComment) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        form.reset()
        setReplyingTo(null)
        fetchComments()
        
        // Emit real-time event
        emitCommentAdded(result.comment.id, result.comment)
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
      stopTyping()
    }
  }

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId)
    form.setValue('parentId', commentId)
    form.setValue('content', '')
  }

  // TODO: Implement edit and delete functionality
  // const handleEdit = (comment: CommentData) => {
  //   setEditingComment(comment.id)
  //   form.setValue('content', comment.content)
  // }

  // const handleDelete = async (commentId: string) => {
  //   try {
  //     const response = await fetch(`/api/comments?commentId=${commentId}`, {
  //       method: 'DELETE'
  //     })
      
  //     if (response.ok) {
  //       fetchComments()
  //     }
  //   } catch (error) {
  //     console.error('Failed to delete comment:', error)
  //   }
  // }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading comments...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comments List */}
      <div className="max-h-96 overflow-y-auto space-y-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-3"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={comment.userImage || undefined} />
                <AvatarFallback>
                  {(comment.userName || 'U')?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {comment.userName || 'Unknown User'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(new Date(comment.createdAt))}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>

                {/* Comment Actions */}
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {canComment && (
                    <button
                      onClick={() => handleReply(comment.id)}
                      className="text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <Reply className="h-3 w-3" />
                      Reply
                    </button>
                  )}
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={reply.userImage || undefined} />
                          <AvatarFallback className="text-xs">
                            {(reply.userName || 'U')?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-100 rounded-lg p-2 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-xs text-gray-800">
                              {reply.userName || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(new Date(reply.createdAt))}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        )}

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-xs text-gray-500 px-3"
            >
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-75" />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-150" />
              </div>
              <span>
                {typingUsers.slice(0, 2).join(' and ')}
                {typingUsers.length > 2 && ` and ${typingUsers.length - 2} others`}
                {typingUsers.length === 1 ? ' is' : ' are'} typing...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={commentsEndRef} />
      </div>

      {/* Comment Form */}
      {canComment && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {replyingTo && (
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
              <span className="text-blue-700">Replying to comment</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(null)
                  form.setValue('parentId', undefined)
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Textarea
              {...form.register('content')}
              placeholder="Write a comment..."
              rows={3}
              disabled={isSubmitting}
              onFocus={() => startTyping()}
              onChange={(e) => {
                form.setValue('content', e.target.value)
                if (e.target.value) {
                  startTyping()
                } else {
                  stopTyping()
                }
              }}
              onBlur={stopTyping}
              className="flex-1 resize-none"
            />
            <Button
              type="submit"
              disabled={isSubmitting || !form.watch('content')?.trim()}
              size="sm"
              className="self-end"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {form.formState.errors.content && (
            <p className="text-sm text-red-600">
              {form.formState.errors.content.message}
            </p>
          )}
        </form>
      )}

      {!canComment && (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            You don&apos;t have permission to comment on this trip
          </p>
        </div>
      )}
    </div>
  )
}

export default CommentsPanel