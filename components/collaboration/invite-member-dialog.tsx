'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteUserSchema, getRoleDisplayName } from '@/lib/collaboration-types'
import { CollaborationRole } from '@prisma/client'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'

type InviteFormData = z.infer<typeof inviteUserSchema>

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  onInviteSent?: () => void
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  tripId,
  onInviteSent
}: InviteMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      role: CollaborationRole.VIEWER,
      message: ''
    }
  })

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      const response = await fetch('/api/collaboration/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          tripId
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setSubmitResult({
          type: 'success',
          message: `Invitation sent to ${data.email} successfully!`
        })
        form.reset()
        onInviteSent?.()
        
        // Close dialog after a short delay
        setTimeout(() => {
          onOpenChange(false)
          setSubmitResult(null)
        }, 2000)
      } else {
        setSubmitResult({
          type: 'error',
          message: result.error || 'Failed to send invitation'
        })
      }
    } catch (error) {
      setSubmitResult({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen)
      if (!newOpen) {
        form.reset()
        setSubmitResult(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Invite Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on this trip. They'll receive an email with a link to join.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isSubmitting}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CollaborationRole.VIEWER}>
                        <div>
                          <div className="font-medium">{getRoleDisplayName(CollaborationRole.VIEWER)}</div>
                          <div className="text-xs text-gray-500">Can view and comment</div>
                        </div>
                      </SelectItem>
                      <SelectItem value={CollaborationRole.EDITOR}>
                        <div>
                          <div className="font-medium">{getRoleDisplayName(CollaborationRole.EDITOR)}</div>
                          <div className="text-xs text-gray-500">Can edit activities and vote</div>
                        </div>
                      </SelectItem>
                      <SelectItem value={CollaborationRole.ADMIN}>
                        <div>
                          <div className="font-medium">{getRoleDisplayName(CollaborationRole.ADMIN)}</div>
                          <div className="text-xs text-gray-500">Can manage members and settings</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the level of access this person will have
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Personal Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to your invitation..."
                      rows={3}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    This message will be included in the invitation email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Result */}
            <AnimatePresence>
              {submitResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    submitResult.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {submitResult.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <p className="text-sm">{submitResult.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Invite
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default InviteMemberDialog