import { useMocks, simulateDelay } from './mock-data'

// Mock database storage
let mockDatabase = {
  users: [
    {
      id: 'user-1',
      email: 'demo@terravoyage.com',
      name: 'Demo User',
      image: null,
      emailVerified: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }
  ],
  trips: [
    {
      id: 'trip-1',
      title: 'Paris Adventure',
      destination: 'Paris, France',
      description: 'Exploring the City of Light',
      startDate: new Date('2024-06-15'),
      endDate: new Date('2024-06-20'),
      budget: 2000,
      travelers: 2,
      status: 'PLANNED',
      isPublic: false,
      userId: 'user-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    }
  ],
  activities: [
    {
      id: 'activity-1',
      tripId: 'trip-1',
      title: 'Visit Eiffel Tower',
      description: 'Iconic tower visit with panoramic views',
      startTime: new Date('2024-06-15T14:00:00'),
      endTime: new Date('2024-06-15T16:00:00'),
      type: 'sightseeing',
      location: 'Eiffel Tower, Paris',
      cost: 25,
      currency: 'EUR',
      notes: 'Book tickets in advance',
      day: 1,
      order: 1,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    }
  ],
  collaborations: [],
  comments: [],
  votes: [],
  shares: [],
  notifications: []
}

// Helper to generate unique IDs
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Mock Prisma client implementation
export class MockPrismaClient {
  // User operations
  user = {
    findUnique: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) return null
      
      const { where } = params
      return mockDatabase.users.find(user => 
        (where.id && user.id === where.id) ||
        (where.email && user.email === where.email)
      ) || null
    },
    
    findMany: async (params: any = {}) => {
      await simulateDelay('database')
      if (!useMocks) return []
      
      return mockDatabase.users
    },
    
    create: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const newUser = {
        id: generateId(),
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockDatabase.users.push(newUser)
      return newUser
    },
    
    update: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const { where, data } = params
      const userIndex = mockDatabase.users.findIndex(user => user.id === where.id)
      
      if (userIndex === -1) throw new Error('User not found')
      
      mockDatabase.users[userIndex] = {
        ...mockDatabase.users[userIndex],
        ...data,
        updatedAt: new Date(),
      }
      
      return mockDatabase.users[userIndex]
    },
    
    delete: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const { where } = params
      const userIndex = mockDatabase.users.findIndex(user => user.id === where.id)
      
      if (userIndex === -1) throw new Error('User not found')
      
      const deletedUser = mockDatabase.users[userIndex]
      mockDatabase.users.splice(userIndex, 1)
      
      return deletedUser
    }
  }

  // Trip operations
  trip = {
    findUnique: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) return null
      
      const { where, include } = params
      let trip = mockDatabase.trips.find(trip => trip.id === where.id)
      
      if (!trip) return null
      
      // Add includes if requested
      if (include) {
        const result: any = { ...trip }
        
        if (include.activities) {
          result.activities = mockDatabase.activities.filter(a => a.tripId === trip.id)
        }
        
        if (include.collaborations) {
          result.collaborations = mockDatabase.collaborations.filter(c => c.tripId === trip.id)
        }
        
        if (include._count) {
          result._count = {
            activities: mockDatabase.activities.filter(a => a.tripId === trip.id).length,
            collaborations: mockDatabase.collaborations.filter(c => c.tripId === trip.id).length,
          }
        }
        
        return result
      }
      
      return trip
    },
    
    findMany: async (params: any = {}) => {
      await simulateDelay('database')
      if (!useMocks) return []
      
      let trips = [...mockDatabase.trips]
      
      // Apply where filter
      if (params.where) {
        if (params.where.userId) {
          trips = trips.filter(trip => trip.userId === params.where.userId)
        }
        if (params.where.isPublic) {
          trips = trips.filter(trip => trip.isPublic === params.where.isPublic)
        }
      }
      
      // Apply ordering
      if (params.orderBy) {
        trips.sort((a, b) => {
          const field = Object.keys(params.orderBy)[0]
          const order = params.orderBy[field]
          
          if (order === 'desc') {
            return new Date(b[field]).getTime() - new Date(a[field]).getTime()
          } else {
            return new Date(a[field]).getTime() - new Date(b[field]).getTime()
          }
        })
      }
      
      // Apply pagination
      if (params.skip) {
        trips = trips.slice(params.skip)
      }
      if (params.take) {
        trips = trips.slice(0, params.take)
      }
      
      // Add includes
      if (params.include) {
        trips = trips.map(trip => {
          const result: any = { ...trip }
          
          if (params.include.activities) {
            result.activities = mockDatabase.activities.filter(a => a.tripId === trip.id)
          }
          
          if (params.include._count) {
            result._count = {
              activities: mockDatabase.activities.filter(a => a.tripId === trip.id).length,
              collaborations: mockDatabase.collaborations.filter(c => c.tripId === trip.id).length,
            }
          }
          
          return result
        })
      }
      
      return trips
    },
    
    create: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const newTrip = {
        id: generateId(),
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockDatabase.trips.push(newTrip)
      return newTrip
    },
    
    update: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const { where, data } = params
      const tripIndex = mockDatabase.trips.findIndex(trip => trip.id === where.id)
      
      if (tripIndex === -1) throw new Error('Trip not found')
      
      mockDatabase.trips[tripIndex] = {
        ...mockDatabase.trips[tripIndex],
        ...data,
        updatedAt: new Date(),
      }
      
      return mockDatabase.trips[tripIndex]
    },
    
    delete: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const { where } = params
      const tripIndex = mockDatabase.trips.findIndex(trip => trip.id === where.id)
      
      if (tripIndex === -1) throw new Error('Trip not found')
      
      const deletedTrip = mockDatabase.trips[tripIndex]
      mockDatabase.trips.splice(tripIndex, 1)
      
      // Also delete related activities
      mockDatabase.activities = mockDatabase.activities.filter(a => a.tripId !== where.id)
      
      return deletedTrip
    },
    
    count: async (params: any = {}) => {
      await simulateDelay('database')
      if (!useMocks) return 0
      
      let trips = [...mockDatabase.trips]
      
      if (params.where) {
        if (params.where.userId) {
          trips = trips.filter(trip => trip.userId === params.where.userId)
        }
      }
      
      return trips.length
    }
  }

  // Activity operations
  activity = {
    findMany: async (params: any = {}) => {
      await simulateDelay('database')
      if (!useMocks) return []
      
      let activities = [...mockDatabase.activities]
      
      if (params.where?.tripId) {
        activities = activities.filter(a => a.tripId === params.where.tripId)
      }
      
      return activities
    },
    
    create: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const newActivity = {
        id: generateId(),
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockDatabase.activities.push(newActivity)
      return newActivity
    },
    
    update: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const { where, data } = params
      const activityIndex = mockDatabase.activities.findIndex(a => a.id === where.id)
      
      if (activityIndex === -1) throw new Error('Activity not found')
      
      mockDatabase.activities[activityIndex] = {
        ...mockDatabase.activities[activityIndex],
        ...data,
        updatedAt: new Date(),
      }
      
      return mockDatabase.activities[activityIndex]
    },
    
    delete: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const { where } = params
      const activityIndex = mockDatabase.activities.findIndex(a => a.id === where.id)
      
      if (activityIndex === -1) throw new Error('Activity not found')
      
      const deletedActivity = mockDatabase.activities[activityIndex]
      mockDatabase.activities.splice(activityIndex, 1)
      
      return deletedActivity
    }
  }

  // Comment operations
  comment = {
    findMany: async (params: any = {}) => {
      await simulateDelay('database')
      if (!useMocks) return []
      
      let comments = [...mockDatabase.comments]
      
      if (params.where?.tripId) {
        comments = comments.filter(c => c.tripId === params.where.tripId)
      }
      
      return comments
    },
    
    create: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const newComment = {
        id: generateId(),
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockDatabase.comments.push(newComment)
      return newComment
    }
  }

  // Share operations
  share = {
    findUnique: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) return null
      
      const { where } = params
      return mockDatabase.shares.find(share => 
        share.shareToken === where.shareToken
      ) || null
    },
    
    create: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const newShare = {
        id: generateId(),
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockDatabase.shares.push(newShare)
      return newShare
    }
  }

  // Notification operations
  notification = {
    findMany: async (params: any = {}) => {
      await simulateDelay('database')
      if (!useMocks) return []
      
      return mockDatabase.notifications.filter(n => 
        !params.where?.userId || n.userId === params.where.userId
      )
    },
    
    create: async (params: any) => {
      await simulateDelay('database')
      if (!useMocks) throw new Error('Database not available in live mode')
      
      const newNotification = {
        id: generateId(),
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockDatabase.notifications.push(newNotification)
      return newNotification
    }
  }

  // Transaction support (simplified)
  $transaction = async (operations: any[]) => {
    await simulateDelay('database')
    if (!useMocks) throw new Error('Database not available in live mode')
    
    // Execute all operations sequentially
    const results = []
    for (const operation of operations) {
      results.push(await operation)
    }
    return results
  }

  // Connect/disconnect (no-op for mock)
  $connect = async () => {
    if (useMocks) return
  }
  
  $disconnect = async () => {
    if (useMocks) return
  }
}

// Export singleton instance
export const mockPrisma = new MockPrismaClient()

// Helper to reset mock database (useful for testing)
export const resetMockDatabase = () => {
  mockDatabase = {
    users: [
      {
        id: 'user-1',
        email: 'demo@terravoyage.com',
        name: 'Demo User',
        image: null,
        emailVerified: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
    ],
    trips: [
      {
        id: 'trip-1',
        title: 'Paris Adventure',
        destination: 'Paris, France',
        description: 'Exploring the City of Light',
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-06-20'),
        budget: 2000,
        travelers: 2,
        status: 'PLANNED',
        isPublic: false,
        userId: 'user-1',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      }
    ],
    activities: [
      {
        id: 'activity-1',
        tripId: 'trip-1',
        title: 'Visit Eiffel Tower',
        description: 'Iconic tower visit with panoramic views',
        startTime: new Date('2024-06-15T14:00:00'),
        endTime: new Date('2024-06-15T16:00:00'),
        type: 'sightseeing',
        location: 'Eiffel Tower, Paris',
        cost: 25,
        currency: 'EUR',
        notes: 'Book tickets in advance',
        day: 1,
        order: 1,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      }
    ],
    collaborations: [],
    comments: [],
    votes: [],
    shares: [],
    notifications: []
  }
}

// Export mock database for direct access if needed
export { mockDatabase }