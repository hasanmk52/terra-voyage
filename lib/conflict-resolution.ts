import { CollaborationEvent } from './collaboration-types'

export interface ConflictEvent {
  id: string
  type: 'edit_conflict' | 'concurrent_update' | 'version_mismatch'
  entityType: 'trip' | 'activity' | 'comment'
  entityId: string
  userId: string
  userName: string | null
  timestamp: Date
  changes: any
  conflictsWith: string[] // Array of other user IDs involved in conflict
  resolved: boolean
  resolution?: 'merge' | 'override' | 'manual'
  resolvedBy?: string
  resolvedAt?: Date
}

export interface ConflictResolution {
  strategy: 'last_write_wins' | 'first_write_wins' | 'manual_merge' | 'user_choice'
  winner?: string // User ID whose changes take precedence
  mergedChanges?: any
  requiresUserInput: boolean
}

export class ConflictResolver {
  private activeConflicts: Map<string, ConflictEvent[]> = new Map()
  private resolutionStrategies: Map<string, ConflictResolution['strategy']> = new Map()

  // Default resolution strategies by entity type
  private defaultStrategies = {
    trip: 'last_write_wins' as const,
    activity: 'manual_merge' as const,
    comment: 'first_write_wins' as const
  }

  // Detect potential conflicts from collaboration events
  detectConflict(events: CollaborationEvent[]): ConflictEvent[] {
    const conflicts: ConflictEvent[] = []
    const entityEvents = new Map<string, CollaborationEvent[]>()

    // Group events by entity
    events.forEach(event => {
      const entityKey = `${event.tripId}_${event.data?.activityId || 'trip'}`
      if (!entityEvents.has(entityKey)) {
        entityEvents.set(entityKey, [])
      }
      entityEvents.get(entityKey)!.push(event)
    })

    // Check for conflicts within each entity
    entityEvents.forEach((entityEventList, entityKey) => {
      const simultaneousEvents = this.findSimultaneousEvents(entityEventList)
      
      if (simultaneousEvents.length > 1) {
        const conflict = this.createConflictEvent(simultaneousEvents, entityKey)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    })

    return conflicts
  }

  // Find events that happened within a conflict window (e.g., 5 seconds)
  private findSimultaneousEvents(events: CollaborationEvent[]): CollaborationEvent[] {
    const CONFLICT_WINDOW_MS = 5000 // 5 seconds
    const simultaneousEvents: CollaborationEvent[] = []
    
    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i]
      const conflictingEvents = [currentEvent]
      
      for (let j = i + 1; j < events.length; j++) {
        const otherEvent = events[j]
        const timeDiff = Math.abs(
          otherEvent.timestamp.getTime() - currentEvent.timestamp.getTime()
        )
        
        if (timeDiff <= CONFLICT_WINDOW_MS && otherEvent.userId !== currentEvent.userId) {
          conflictingEvents.push(otherEvent)
        }
      }
      
      if (conflictingEvents.length > 1) {
        simultaneousEvents.push(...conflictingEvents)
      }
    }
    
    return Array.from(new Set(simultaneousEvents)) // Remove duplicates
  }

  // Create a conflict event from simultaneous events
  private createConflictEvent(events: CollaborationEvent[], entityKey: string): ConflictEvent | null {
    if (events.length < 2) return null

    const [tripId, entityId] = entityKey.split('_')
    const entityType = entityId === 'trip' ? 'trip' : 'activity'
    
    // Use the earliest event as the base
    const baseEvent = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]
    
    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'concurrent_update',
      entityType: entityType as 'trip' | 'activity',
      entityId: entityId === 'trip' ? tripId : entityId,
      userId: baseEvent.userId,
      userName: baseEvent.userName,
      timestamp: baseEvent.timestamp,
      changes: baseEvent.data,
      conflictsWith: events.filter(e => e.userId !== baseEvent.userId).map(e => e.userId),
      resolved: false
    }
  }

  // Resolve a conflict using the appropriate strategy
  async resolveConflict(
    conflict: ConflictEvent,
    strategy?: ConflictResolution['strategy'],
    userInput?: any
  ): Promise<ConflictResolution> {
    const resolverStrategy = strategy || 
      this.resolutionStrategies.get(conflict.entityId) || 
      this.defaultStrategies[conflict.entityType]

    let resolution: ConflictResolution

    switch (resolverStrategy) {
      case 'last_write_wins':
        resolution = this.resolveLastWriteWins(conflict)
        break
      case 'first_write_wins':
        resolution = this.resolveFirstWriteWins(conflict)
        break
      case 'manual_merge':
        resolution = this.resolveManualMerge(conflict, userInput)
        break
      case 'user_choice':
        resolution = this.resolveUserChoice(conflict, userInput)
        break
      default:
        resolution = this.resolveLastWriteWins(conflict)
    }

    // Mark conflict as resolved if no user input is required
    if (!resolution.requiresUserInput) {
      conflict.resolved = true
      conflict.resolution = resolution.strategy === 'manual_merge' ? 'merge' : 'override'
      conflict.resolvedAt = new Date()
    }

    return resolution
  }

  // Last write wins - use the most recent change
  private resolveLastWriteWins(conflict: ConflictEvent): ConflictResolution {
    return {
      strategy: 'last_write_wins',
      winner: conflict.userId, // Base event user
      requiresUserInput: false
    }
  }

  // First write wins - use the earliest change
  private resolveFirstWriteWins(conflict: ConflictEvent): ConflictResolution {
    return {
      strategy: 'first_write_wins',
      winner: conflict.userId, // Base event user (earliest)
      requiresUserInput: false
    }
  }

  // Manual merge - attempt to merge changes intelligently
  private resolveManualMerge(conflict: ConflictEvent, userInput?: any): ConflictResolution {
    if (!userInput) {
      return {
        strategy: 'manual_merge',
        requiresUserInput: true
      }
    }

    // Attempt to merge changes based on field-level conflicts
    const mergedChanges = this.mergeChanges(conflict.changes, userInput.conflictingChanges)

    return {
      strategy: 'manual_merge',
      mergedChanges,
      requiresUserInput: false
    }
  }

  // User choice - let user pick the winning version
  private resolveUserChoice(conflict: ConflictEvent, userInput?: any): ConflictResolution {
    if (!userInput?.winner) {
      return {
        strategy: 'user_choice',
        requiresUserInput: true
      }
    }

    return {
      strategy: 'user_choice',
      winner: userInput.winner,
      requiresUserInput: false
    }
  }

  // Intelligent merging of changes at field level
  private mergeChanges(baseChanges: any, conflictingChanges: any): any {
    const merged = { ...baseChanges }

    Object.keys(conflictingChanges).forEach(key => {
      // Simple merge strategy: non-conflicting fields are merged
      if (!(key in baseChanges)) {
        merged[key] = conflictingChanges[key]
      } else if (Array.isArray(baseChanges[key]) && Array.isArray(conflictingChanges[key])) {
        // Merge arrays by combining unique items
        merged[key] = Array.from(new Set([...baseChanges[key], ...conflictingChanges[key]]))
      } else if (typeof baseChanges[key] === 'object' && typeof conflictingChanges[key] === 'object') {
        // Recursively merge objects
        merged[key] = this.mergeChanges(baseChanges[key], conflictingChanges[key])
      }
      // For primitive conflicts, keep the base value (can be customized)
    })

    return merged
  }

  // Get active conflicts for a trip or entity
  getActiveConflicts(entityId: string): ConflictEvent[] {
    return this.activeConflicts.get(entityId) || []
  }

  // Add a conflict to tracking
  addConflict(entityId: string, conflict: ConflictEvent): void {
    if (!this.activeConflicts.has(entityId)) {
      this.activeConflicts.set(entityId, [])
    }
    this.activeConflicts.get(entityId)!.push(conflict)
  }

  // Remove resolved conflicts
  removeResolvedConflicts(entityId: string): void {
    const conflicts = this.activeConflicts.get(entityId) || []
    const activeConflicts = conflicts.filter(c => !c.resolved)
    
    if (activeConflicts.length === 0) {
      this.activeConflicts.delete(entityId)
    } else {
      this.activeConflicts.set(entityId, activeConflicts)
    }
  }

  // Set resolution strategy for an entity
  setResolutionStrategy(entityId: string, strategy: ConflictResolution['strategy']): void {
    this.resolutionStrategies.set(entityId, strategy)
  }

  // Generate conflict summary for UI
  generateConflictSummary(conflict: ConflictEvent): {
    title: string
    description: string
    affectedUsers: string[]
    recommendedAction: string
  } {
    const affectedUsers = [conflict.userId, ...conflict.conflictsWith].filter(Boolean)
    
    return {
      title: `${conflict.entityType.charAt(0).toUpperCase() + conflict.entityType.slice(1)} Edit Conflict`,
      description: `Multiple users edited the same ${conflict.entityType} simultaneously. Changes may conflict.`,
      affectedUsers,
      recommendedAction: this.getRecommendedAction(conflict)
    }
  }

  private getRecommendedAction(conflict: ConflictEvent): string {
    switch (conflict.entityType) {
      case 'trip':
        return 'Review changes and choose the version to keep'
      case 'activity':
        return 'Merge changes manually or choose a winner'
      case 'comment':
        return 'All comments will be preserved automatically'
      default:
        return 'Review conflicting changes'
    }
  }
}

// Singleton instance
export const conflictResolver = new ConflictResolver()

// Utility functions for UI components
export function getConflictSeverity(conflict: ConflictEvent): 'low' | 'medium' | 'high' {
  const userCount = conflict.conflictsWith.length + 1
  const entityImportance = conflict.entityType === 'trip' ? 2 : 1
  
  const severity = userCount * entityImportance
  
  if (severity >= 4) return 'high'
  if (severity >= 2) return 'medium'
  return 'low'
}

export function formatConflictMessage(conflict: ConflictEvent): string {
  const userCount = conflict.conflictsWith.length + 1
  return `${userCount} users made conflicting changes to this ${conflict.entityType}`
}