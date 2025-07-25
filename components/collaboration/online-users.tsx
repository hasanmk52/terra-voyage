'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserPresence } from '@/lib/collaboration-types'
import { Users, Circle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OnlineUsersProps {
  onlineUsers: UserPresence[]
  totalMembers: number
  className?: string
}

export function OnlineUsers({
  onlineUsers,
  totalMembers,
  className = ''
}: OnlineUsersProps) {
  const onlineCount = onlineUsers.filter(user => user.isOnline).length

  return (
    <div className={`flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Circle className="h-2 w-2 fill-green-600 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {onlineCount} of {totalMembers} online
          </span>
        </div>

        {/* Online User Avatars */}
        <div className="flex -space-x-2">
          <AnimatePresence>
            {onlineUsers
              .filter(user => user.isOnline)
              .slice(0, 3)
              .map((user, index) => (
                <motion.div
                  key={user.userId}
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <Avatar className="h-8 w-8 border-2 border-white">
                    <AvatarImage 
                      src={user.userImage || undefined} 
                      alt={user.userName || 'User'} 
                    />
                    <AvatarFallback className="text-xs">
                      {(user.userName || 'U')?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </motion.div>
              ))}
          </AnimatePresence>

          {/* Show more indicator */}
          {onlineCount > 3 && (
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 border-2 border-white rounded-full text-xs font-medium text-gray-600">
              +{onlineCount - 3}
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <Badge variant="outline" className="text-green-700 border-green-300">
        <Users className="h-3 w-3 mr-1" />
        Active
      </Badge>
    </div>
  )
}

export default OnlineUsers