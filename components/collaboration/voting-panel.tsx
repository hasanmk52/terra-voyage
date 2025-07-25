'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ActivityVotes, VoteData } from '@/lib/collaboration-types'
import { useCollaboration } from '@/hooks/use-collaboration'
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Vote,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VotingPanelProps {
  tripId: string
  canVote: boolean
  className?: string
}

export function VotingPanel({
  tripId,
  canVote,
  className = ''
}: VotingPanelProps) {
  const [tripVotes, setTripVotes] = useState<Record<string, ActivityVotes>>({})
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [votingOn, setVotingOn] = useState<string | null>(null)

  const { emitVoteAdded } = useCollaboration({
    tripId,
    enabled: true,
    onCollaborationEvent: (event) => {
      if (event.type === 'vote_added') {
        fetchVotes()
      }
    }
  })

  // Fetch trip activities and votes
  const fetchVotes = async () => {
    try {
      // Fetch activities (you'll need to implement this endpoint)
      const activitiesResponse = await fetch(`/api/trips/${tripId}/activities`)
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json()
        setActivities(activitiesData.activities || [])
      }

      // Fetch votes
      const votesResponse = await fetch(`/api/votes?tripId=${tripId}`)
      if (votesResponse.ok) {
        const votesData = await votesResponse.json()
        setTripVotes(votesData.tripVotes || {})
      }
    } catch (error) {
      console.error('Failed to fetch votes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVotes()
  }, [tripId])

  const handleVote = async (activityId: string, value: number) => {
    if (!canVote) return

    setVotingOn(activityId)
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          value
        })
      })

      if (response.ok) {
        const result = await response.json()
        fetchVotes()
        
        // Emit real-time event
        emitVoteAdded(activityId, result.vote)
      }
    } catch (error) {
      console.error('Failed to cast vote:', error)
    } finally {
      setVotingOn(null)
    }
  }

  const getConsensusColor = (consensus: string) => {
    switch (consensus) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'mixed':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getConsensusIcon = (consensus: string) => {
    switch (consensus) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />
      case 'negative':
        return <TrendingDown className="h-4 w-4" />
      case 'mixed':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const renderVoteButton = (activityId: string, voteValue: number, icon: React.ReactNode, label: string) => {
    const activityVotes = tripVotes[activityId]
    const userVote = activityVotes?.userVote
    const isActive = userVote?.value === voteValue
    const count = activityVotes?.votes.filter(v => v.value === voteValue).length || 0

    return (
      <Button
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote(activityId, isActive ? 0 : voteValue)}
        disabled={!canVote || votingOn === activityId}
        className={`flex items-center gap-1 ${isActive ? 'bg-blue-600' : ''}`}
      >
        {votingOn === activityId ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
        <span className="text-xs">{label}</span>
        {count > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {count}
          </Badge>
        )}
      </Button>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading voting data...
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Vote className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No activities to vote on</p>
        <p className="text-xs">Activities will appear here once they're added to the trip</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Voting Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(tripVotes).reduce((sum, votes) => sum + votes.totalVotes, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Votes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Object.values(tripVotes).filter(votes => votes.consensus === 'positive').length}
              </div>
              <div className="text-xs text-gray-600">Popular</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(tripVotes).filter(votes => votes.consensus === 'mixed').length}
              </div>
              <div className="text-xs text-gray-600">Debated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Voting List */}
      <div className="space-y-3">
        <AnimatePresence>
          {activities.map((activity, index) => {
            const activityVotes = tripVotes[activity.id]
            const consensus = activityVotes?.consensus || 'neutral'
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {activity.name}
                        </h4>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={`ml-3 flex items-center gap-1 ${getConsensusColor(consensus)}`}
                      >
                        {getConsensusIcon(consensus)}
                        <span className="capitalize text-xs">{consensus}</span>
                      </Badge>
                    </div>

                    {/* Voting Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderVoteButton(activity.id, 1, <ThumbsUp className="h-4 w-4" />, 'Like')}
                        {renderVoteButton(activity.id, -1, <ThumbsDown className="h-4 w-4" />, 'Dislike')}
                      </div>

                      {/* Vote Summary */}
                      {activityVotes && activityVotes.totalVotes > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {activityVotes.votes
                              .filter(vote => vote.value !== 0)
                              .slice(0, 3)
                              .map((vote, idx) => (
                                <Avatar key={idx} className="h-6 w-6 border-2 border-white">
                                  <AvatarImage src={vote.userImage || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {(vote.userName || 'U')?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {activityVotes.totalVotes} vote{activityVotes.totalVotes !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detailed Vote Breakdown */}
                    {activityVotes && activityVotes.votes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1">
                          {activityVotes.votes.map((vote) => (
                            <div
                              key={vote.id}
                              className="flex items-center gap-1 text-xs bg-gray-50 rounded-full px-2 py-1"
                            >
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={vote.userImage || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(vote.userName || 'U')?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-700">
                                {vote.userName || 'Unknown'}
                              </span>
                              {vote.value > 0 ? (
                                <ThumbsUp className="h-3 w-3 text-green-600" />
                              ) : vote.value < 0 ? (
                                <ThumbsDown className="h-3 w-3 text-red-600" />
                              ) : (
                                <Minus className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {!canVote && (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            You don't have permission to vote on activities
          </p>
        </div>
      )}
    </div>
  )
}

export default VotingPanel