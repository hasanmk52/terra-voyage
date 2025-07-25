'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InviteMemberDialog } from './invite-member-dialog'
import { MembersList } from './members-list'
import { CommentsPanel } from './comments-panel'
import { VotingPanel } from './voting-panel'
import { OnlineUsers } from './online-users'
import { TripCollaboration } from '@/lib/collaboration-types'
import { useCollaboration } from '@/hooks/use-collaboration'
import {
  Users,
  MessageSquare,
  Vote,
  UserPlus,
  Settings,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CollaborationPanelProps {
  tripId: string
  collaboration: TripCollaboration
  onCollaborationUpdate?: (collaboration: TripCollaboration) => void
  className?: string
}

export function CollaborationPanel({
  tripId,
  collaboration,
  onCollaborationUpdate,
  className = ''
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState('members')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const {
    isConnected,
    onlineUsers,
    connectionError,
    retryConnection
  } = useCollaboration({
    tripId,
    enabled: true,
    onCollaborationEvent: (event) => {
      console.log('Collaboration event received:', event)
      // Handle real-time updates here
    }
  })

  const handleRefreshCollaboration = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/collaboration/invite?tripId=${tripId}`)
      if (response.ok) {
        const data = await response.json()
        onCollaborationUpdate?.(data.collaboration)
      }
    } catch (error) {
      console.error('Failed to refresh collaboration:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const canInvite = collaboration.permissions.canInvite
  const canManageMembers = collaboration.permissions.canManageMembers

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle className="text-lg">Collaboration</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {collaboration.collaborators.length} member{collaboration.collaborators.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshCollaboration}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {/* Invite Button */}
            {canInvite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            )}
          </div>
        </div>

        {/* Connection Error */}
        <AnimatePresence>
          {connectionError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-800">
                    Connection lost: {connectionError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryConnection}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent>
        {/* Online Users Indicator */}
        <OnlineUsers 
          onlineUsers={onlineUsers}
          totalMembers={collaboration.collaborators.length}
          className="mb-4"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
              <Badge variant="secondary" className="ml-1">
                {collaboration.collaborators.length}
              </Badge>
            </TabsTrigger>
            
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
            
            <TabsTrigger value="voting" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Voting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <MembersList
              tripId={tripId}
              collaboration={collaboration}
              canManageMembers={canManageMembers}
              onMemberUpdate={handleRefreshCollaboration}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <CommentsPanel
              tripId={tripId}
              canComment={collaboration.permissions.canComment}
            />
          </TabsContent>

          <TabsContent value="voting" className="mt-4">
            <VotingPanel
              tripId={tripId}
              canVote={collaboration.permissions.canVote}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        tripId={tripId}
        onInviteSent={handleRefreshCollaboration}
      />
    </Card>
  )
}

export default CollaborationPanel