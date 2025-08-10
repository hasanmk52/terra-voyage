"use client"

import { TripStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  XCircle, 
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react'

export interface StatusBadgeProps {
  status: TripStatus
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'minimal' | 'detailed'
  showTooltip?: boolean
}

// Status configuration with colors, icons, and descriptions
const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    description: 'Trip is being planned and not yet finalized',
    color: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200',
    icon: FileText,
    gradient: 'from-slate-100 to-slate-200'
  },
  PLANNED: {
    label: 'Planned',
    description: 'Trip is planned with itinerary and ready to go',
    color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    icon: Calendar,
    gradient: 'from-blue-100 to-blue-200'
  },
  ACTIVE: {
    label: 'Active',
    description: 'Trip is currently in progress',
    color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    icon: PlayCircle,
    gradient: 'from-green-100 to-green-200'
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Trip has been completed successfully',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
    icon: CheckCircle,
    gradient: 'from-emerald-100 to-emerald-200'
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Trip has been cancelled',
    color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    icon: XCircle,
    gradient: 'from-red-100 to-red-200'
  }
} as const

export function StatusBadge({
  status,
  className,
  showIcon = true,
  size = 'default',
  variant = 'default',
  showTooltip = false
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    default: 'px-2.5 py-1 text-sm font-medium',
    lg: 'px-3 py-1.5 text-base font-semibold'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const badgeContent = (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        config.color,
        sizeClasses[size],
        variant === 'minimal' && 'border-transparent bg-transparent',
        variant === 'detailed' && `bg-gradient-to-r ${config.gradient}`,
        className
      )}
      title={showTooltip ? config.description : undefined}
      role="status"
      aria-label={`Trip status: ${config.label}. ${config.description}`}
    >
      {showIcon && (
        <Icon className={cn(iconSizes[size], 'flex-shrink-0')} />
      )}
      <span className="font-medium">{config.label}</span>
      {variant === 'detailed' && (
        <div className="ml-1 opacity-75">
          <AlertCircle className="w-3 h-3" />
        </div>
      )}
    </Badge>
  )

  if (showTooltip) {
    return (
      <div className="group relative inline-flex tooltip-container">
        {badgeContent}
        <div 
          className="tooltip-content absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 shadow-lg"
          role="tooltip"
          aria-hidden="true"
        >
          {config.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  return badgeContent
}

// Helper function to get next possible status transitions for display
export function getStatusTransitionInfo(currentStatus: TripStatus) {
  const transitionMap = {
    DRAFT: [
      { status: 'PLANNED' as TripStatus, label: 'Mark as Planned', description: 'Trip is ready with itinerary' },
      { status: 'CANCELLED' as TripStatus, label: 'Cancel Trip', description: 'Cancel this trip', variant: 'destructive' }
    ],
    PLANNED: [
      { status: 'ACTIVE' as TripStatus, label: 'Start Trip', description: 'Trip is now active' },
      { status: 'DRAFT' as TripStatus, label: 'Back to Draft', description: 'Continue planning' },
      { status: 'CANCELLED' as TripStatus, label: 'Cancel Trip', description: 'Cancel this trip', variant: 'destructive' }
    ],
    ACTIVE: [
      { status: 'COMPLETED' as TripStatus, label: 'Complete Trip', description: 'Mark trip as completed' },
      { status: 'CANCELLED' as TripStatus, label: 'Cancel Trip', description: 'Cancel this trip', variant: 'destructive' }
    ],
    COMPLETED: [
      { status: 'ACTIVE' as TripStatus, label: 'Reactivate', description: 'Reactivate this trip' }
    ],
    CANCELLED: [
      { status: 'DRAFT' as TripStatus, label: 'Restore to Draft', description: 'Continue planning' },
      { status: 'PLANNED' as TripStatus, label: 'Restore to Planned', description: 'Restore planned trip' }
    ]
  }

  return transitionMap[currentStatus] || []
}

// Status priority for sorting (lower number = higher priority)
export function getStatusPriority(status: TripStatus): number {
  const priorities = {
    ACTIVE: 1,
    PLANNED: 2,
    DRAFT: 3,
    COMPLETED: 4,
    CANCELLED: 5
  }
  return priorities[status] || 999
}

// Check if status indicates trip is editable
export function isStatusEditable(status: TripStatus): boolean {
  return ['DRAFT', 'PLANNED'].includes(status)
}

// Check if status indicates trip is active or completed
export function isStatusCompleted(status: TripStatus): boolean {
  return ['COMPLETED', 'CANCELLED'].includes(status)
}

export default StatusBadge