import { TripStatus } from '@prisma/client'

export interface TripPermissions {
  canEdit: boolean
  canDelete: boolean
  canGenerateItinerary: boolean
  canAddActivities: boolean
  canEditActivities: boolean
  canDeleteActivities: boolean
  canChangeStatus: boolean
  canExport: boolean
  canShare: boolean
  canView: boolean
  reasons?: string[]
}

export interface Trip {
  id: string
  status: TripStatus
  startDate: Date
  endDate: Date
  userId?: string
}

/**
 * Get permissions for a trip based on its status and context
 */
export function getTripPermissions(
  trip: Trip,
  userId?: string,
  userRole?: string
): TripPermissions {
  const isOwner = userId && trip.userId === userId
  const isAdmin = userRole === 'admin' || userRole === 'owner'
  const now = new Date()
  const hasStarted = now >= trip.startDate
  const hasEnded = now > trip.endDate
  
  const reasons: string[] = []
  
  // Base permissions based on status
  const permissions: TripPermissions = {
    canView: true, // Everyone can view (for public trips)
    canEdit: false,
    canDelete: false,
    canGenerateItinerary: false,
    canAddActivities: false,
    canEditActivities: false,
    canDeleteActivities: false,
    canChangeStatus: false,
    canExport: true, // Everyone can export
    canShare: true,  // Everyone can share
    reasons
  }

  // Status-based permissions
  switch (trip.status) {
    case 'DRAFT':
      permissions.canEdit = true
      permissions.canDelete = true
      permissions.canGenerateItinerary = true
      permissions.canAddActivities = true
      permissions.canEditActivities = true
      permissions.canDeleteActivities = true
      permissions.canChangeStatus = true
      break

    case 'PLANNED':
      permissions.canEdit = true // Limited editing
      permissions.canDelete = true // Can still delete planned trips
      permissions.canGenerateItinerary = true // Can regenerate
      permissions.canAddActivities = true
      permissions.canEditActivities = true
      permissions.canDeleteActivities = true
      permissions.canChangeStatus = true
      break

    case 'ACTIVE':
      permissions.canEdit = false // No major edits during active trip
      permissions.canDelete = false // Cannot delete active trips
      permissions.canGenerateItinerary = false // Cannot regenerate during trip
      permissions.canAddActivities = true // Can add activities on the go
      permissions.canEditActivities = true // Can modify activities
      permissions.canDeleteActivities = true // Can remove activities
      permissions.canChangeStatus = true // Can mark as completed
      reasons.push('Trip is currently active')
      break

    case 'COMPLETED':
      permissions.canEdit = false
      permissions.canDelete = false
      permissions.canGenerateItinerary = false
      permissions.canAddActivities = false
      permissions.canEditActivities = false
      permissions.canDeleteActivities = false
      permissions.canChangeStatus = true // Can reactivate if needed
      reasons.push('Trip has been completed')
      break

    case 'CANCELLED':
      permissions.canEdit = false
      permissions.canDelete = true // Can clean up cancelled trips
      permissions.canGenerateItinerary = false
      permissions.canAddActivities = false
      permissions.canEditActivities = false
      permissions.canDeleteActivities = false
      permissions.canChangeStatus = true // Can restore or replan
      reasons.push('Trip has been cancelled')
      break
  }

  // Override permissions based on user role and ownership
  if (!isOwner && !isAdmin) {
    // Non-owners have limited permissions
    permissions.canEdit = false
    permissions.canDelete = false
    permissions.canGenerateItinerary = false
    permissions.canChangeStatus = false
    
    // But can still interact with activities in some cases
    if (trip.status === 'ACTIVE' || trip.status === 'PLANNED') {
      permissions.canAddActivities = true // Can suggest activities
      permissions.canEditActivities = false // Cannot edit others' activities
      permissions.canDeleteActivities = false // Cannot delete others' activities
    }
    
    reasons.push('You are not the trip owner')
  }

  // Time-based restrictions
  if (hasEnded && trip.status === 'ACTIVE') {
    reasons.push('Trip has ended but status is still active')
  }
  
  if (hasStarted && trip.status === 'DRAFT') {
    reasons.push('Trip start date has passed but status is still draft')
  }

  // Admin overrides (admins can do most things)
  if (isAdmin) {
    permissions.canEdit = true
    permissions.canDelete = true
    permissions.canChangeStatus = true
    
    if (reasons.includes('You are not the trip owner')) {
      const index = reasons.indexOf('You are not the trip owner')
      reasons.splice(index, 1)
    }
    reasons.push('Admin privileges')
  }

  return permissions
}

/**
 * Check if a specific action is allowed for a trip
 */
export function canPerformAction(
  trip: Trip,
  action: keyof Omit<TripPermissions, 'reasons'>,
  userId?: string,
  userRole?: string
): boolean {
  const permissions = getTripPermissions(trip, userId, userRole)
  return permissions[action]
}

/**
 * Get user-friendly messages for permission restrictions
 */
export function getPermissionMessages(
  trip: Trip,
  userId?: string,
  userRole?: string
): {
  cannotEdit?: string
  cannotDelete?: string
  cannotGenerateItinerary?: string
  cannotAddActivities?: string
  cannotChangeStatus?: string
  general?: string[]
} {
  const permissions = getTripPermissions(trip, userId, userRole)
  const messages: any = {}

  if (!permissions.canEdit) {
    switch (trip.status) {
      case 'ACTIVE':
        messages.cannotEdit = 'Cannot make major edits to an active trip. You can still modify activities.'
        break
      case 'COMPLETED':
        messages.cannotEdit = 'Cannot edit a completed trip. You can reactivate it if needed.'
        break
      case 'CANCELLED':
        messages.cannotEdit = 'Cannot edit a cancelled trip. You can restore it to continue planning.'
        break
      default:
        messages.cannotEdit = 'You do not have permission to edit this trip.'
    }
  }

  if (!permissions.canDelete) {
    switch (trip.status) {
      case 'ACTIVE':
        messages.cannotDelete = 'Cannot delete an active trip. Complete or cancel it first.'
        break
      case 'COMPLETED':
        messages.cannotDelete = 'Cannot delete a completed trip. This preserves your travel history.'
        break
      default:
        messages.cannotDelete = 'You do not have permission to delete this trip.'
    }
  }

  if (!permissions.canGenerateItinerary) {
    switch (trip.status) {
      case 'ACTIVE':
        messages.cannotGenerateItinerary = 'Cannot regenerate itinerary during an active trip.'
        break
      case 'COMPLETED':
      case 'CANCELLED':
        messages.cannotGenerateItinerary = 'Cannot generate itinerary for a completed or cancelled trip.'
        break
      default:
        messages.cannotGenerateItinerary = 'You do not have permission to generate itineraries for this trip.'
    }
  }

  if (!permissions.canAddActivities) {
    switch (trip.status) {
      case 'COMPLETED':
        messages.cannotAddActivities = 'Cannot add activities to a completed trip.'
        break
      case 'CANCELLED':
        messages.cannotAddActivities = 'Cannot add activities to a cancelled trip.'
        break
      default:
        messages.cannotAddActivities = 'You do not have permission to add activities to this trip.'
    }
  }

  if (!permissions.canChangeStatus) {
    messages.cannotChangeStatus = 'You do not have permission to change the status of this trip.'
  }

  messages.general = permissions.reasons || []

  return messages
}

/**
 * Get status-specific UI hints and recommendations
 */
export function getStatusUIHints(trip: Trip, userId?: string): {
  primaryAction?: string
  secondaryActions?: string[]
  warnings?: string[]
  recommendations?: string[]
} {
  const now = new Date()
  const hasStarted = now >= trip.startDate
  const hasEnded = now > trip.endDate
  const permissions = getTripPermissions(trip, userId)

  const hints = {
    primaryAction: undefined as string | undefined,
    secondaryActions: [] as string[],
    warnings: [] as string[],
    recommendations: [] as string[]
  }

  switch (trip.status) {
    case 'DRAFT':
      hints.primaryAction = 'Generate Itinerary'
      hints.secondaryActions = ['Edit Trip Details', 'Add Manual Activities']
      if (hasStarted) {
        hints.warnings.push('Trip start date has passed')
        hints.recommendations.push('Consider updating your travel dates or activating the trip')
      }
      break

    case 'PLANNED':
      if (!hasStarted) {
        hints.primaryAction = 'Trip is Ready'
        hints.secondaryActions = ['Review Itinerary', 'Invite Collaborators', 'Export Trip']
        const daysUntilStart = Math.ceil((trip.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilStart <= 7) {
          hints.recommendations.push(`Trip starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`)
        }
      } else if (!hasEnded) {
        hints.primaryAction = 'Start Trip'
        hints.warnings.push('Trip should be active (start date has passed)')
        hints.recommendations.push('Mark the trip as active to track your progress')
      } else {
        hints.warnings.push('Trip dates have passed')
        hints.recommendations.push('Update trip dates or mark as completed')
      }
      break

    case 'ACTIVE':
      if (!hasEnded) {
        hints.primaryAction = 'Trip in Progress'
        hints.secondaryActions = ['View Activities', 'Add Notes', 'Track Progress']
        const daysRemaining = Math.ceil((trip.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysRemaining <= 2) {
          hints.recommendations.push(`Trip ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`)
        }
      } else {
        hints.primaryAction = 'Complete Trip'
        hints.warnings.push('Trip end date has passed')
        hints.recommendations.push('Mark the trip as completed')
      }
      break

    case 'COMPLETED':
      hints.primaryAction = 'Trip Completed'
      hints.secondaryActions = ['View Memories', 'Export Summary', 'Share Experience']
      hints.recommendations.push('Your trip is complete! You can export or share your travel experience.')
      break

    case 'CANCELLED':
      hints.primaryAction = 'Trip Cancelled'
      hints.secondaryActions = ['Restore Trip', 'Delete Trip']
      hints.recommendations.push('You can restore this trip to continue planning or delete it permanently.')
      break
  }

  return hints
}

export default {
  getTripPermissions,
  canPerformAction,
  getPermissionMessages,
  getStatusUIHints
}
