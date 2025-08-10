'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvitationData, getRoleDisplayName, isInvitationExpired } from '@/lib/collaboration-types'
import {
  Mail,
  MapPin,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Users
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const token = params?.token as string

  useEffect(() => {
    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/collaboration/accept?token=${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitation(data.invitation)
      } else {
        setResult({
          type: 'error',
          message: 'Invitation not found or invalid'
        })
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Failed to load invitation'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!session) {
      // Redirect to sign in
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`)
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch('/api/collaboration/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          type: 'success',
          message: 'Invitation accepted successfully!'
        })
        
        // Redirect to trip after a delay
        setTimeout(() => {
          router.push(`/trip/${invitation?.tripId}`)
        }, 2000)
      } else {
        setResult({
          type: 'error',
          message: data.error || 'Failed to accept invitation'
        })
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecline = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/collaboration/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setResult({
          type: 'success',
          message: 'Invitation declined'
        })
      } else {
        setResult({
          type: 'error',
          message: 'Failed to decline invitation'
        })
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'EDITOR':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              Loading invitation...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="text-center py-12">
              {result.type === 'success' ? (
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              )}
              <h2 className="text-xl font-semibold mb-2">
                {result.type === 'success' ? 'Success!' : 'Error'}
              </h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              {result.type === 'success' && (
                <p className="text-sm text-gray-500">
                  Redirecting to trip page...
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation Not Found</h2>
            <p className="text-gray-600 mb-6">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = isInvitationExpired(invitation.expiresAt)
  const canAccept = invitation.status === 'PENDING' && !isExpired

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Mail className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl">Trip Invitation</CardTitle>
            <p className="text-blue-100 mt-2">
              You've been invited to collaborate on a travel adventure!
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {/* Trip Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                {invitation.tripTitle}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Invited by:</span>
                  </div>
                  <p className="font-medium">
                    {invitation.invitedBy.name || invitation.invitedBy.email}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Your role:</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={getRoleBadgeColor(invitation.role)}
                  >
                    {getRoleDisplayName(invitation.role)}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires: {invitation.expiresAt.toLocaleDateString()} at{' '}
                    {invitation.expiresAt.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Message */}
            {invitation.message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Personal Message:</h4>
                <p className="text-blue-800 italic">"{invitation.message}"</p>
              </div>
            )}

            {/* Status Messages */}
            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Invitation Expired</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  This invitation expired on {invitation.expiresAt.toLocaleDateString()}.
                  Please contact the trip organizer for a new invitation.
                </p>
              </div>
            )}

            {invitation.status !== 'PENDING' && !isExpired && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    Invitation {invitation.status.toLowerCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Authentication Check */}
            {status === 'loading' && (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
              </div>
            )}

            {status === 'unauthenticated' && canAccept && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  You need to sign in to accept this invitation. Don't worry, we'll bring you right back here!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {canAccept && (
              <div className="flex gap-3">
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing || status === 'loading'}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {status === 'unauthenticated' ? 'Redirecting...' : 'Accepting...'}
                    </div>
                  ) : status === 'unauthenticated' ? (
                    'Sign In & Accept'
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
                
                <Button
                  onClick={handleDecline}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      Declining...
                    </div>
                  ) : (
                    'Decline'
                  )}
                </Button>
              </div>
            )}

            {/* Role Permissions Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">
                As a {getRoleDisplayName(invitation.role).toLowerCase()}, you'll be able to:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {invitation.role === 'ADMIN' && (
                  <>
                    <li>• View and edit all trip details</li>
                    <li>• Invite new members and manage roles</li>
                    <li>• Vote on activities and add comments</li>
                    <li>• Manage trip settings</li>
                  </>
                )}
                {invitation.role === 'EDITOR' && (
                  <>
                    <li>• View and edit trip activities</li>
                    <li>• Vote on activities and add comments</li>
                    <li>• Modify trip itinerary</li>
                  </>
                )}
                {invitation.role === 'VIEWER' && (
                  <>
                    <li>• View all trip details</li>
                    <li>• Vote on activities and add comments</li>
                    <li>• Receive trip updates</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}