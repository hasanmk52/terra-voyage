import { db } from "@/lib/db"

// Database connection optimization
export async function optimizeConnection() {
  try {
    // Test connection
    await db.$connect()
    console.log("✅ Database connected successfully")
    
    // Set connection pool settings in production
    if (process.env.NODE_ENV === "production") {
      await db.$executeRaw`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'`
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    throw error
  }
}

// Query optimization helpers
export const queryOptimizations = {
  // Efficient user trips query with pagination
  getUserTripsOptimized: async (
    userId: string, 
    page: number = 1, 
    limit: number = 10,
    status?: string
  ) => {
    const skip = (page - 1) * limit
    
    return db.trip.findMany({
      where: {
        userId,
        ...(status && { status: status.toUpperCase() as any }),
      },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true,
        status: true,
        budget: true,
        travelers: true,
        isPublic: true,
        coverImage: true,
        _count: {
          select: {
            activities: true,
            collaborations: true,
          }
        }
      },
      orderBy: [
        { status: "asc" },
        { startDate: "desc" },
      ],
      skip,
      take: limit,
    })
  },

  // Efficient trip details query
  getTripDetailsOptimized: async (tripId: string, userId: string) => {
    return db.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          {
            collaborations: {
              some: {
                userId,
                acceptedAt: { not: null },
              }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        destination: true,
        description: true,
        startDate: true,
        endDate: true,
        budget: true,
        travelers: true,
        status: true,
        isPublic: true,
        coverImage: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        activities: {
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            address: true,
            coordinates: true,
            startTime: true,
            endTime: true,
            type: true,
            price: true,
            currency: true,
            bookingStatus: true,
            order: true,
          },
          orderBy: [
            { order: "asc" },
            { startTime: "asc" },
          ]
        },
        collaborations: {
          where: {
            acceptedAt: { not: null },
          },
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          }
        }
      }
    })
  },

  // Efficient search query
  searchTripsOptimized: async (
    query: string, 
    userId: string, 
    limit: number = 20
  ) => {
    return db.trip.findMany({
      where: {
        OR: [
          { userId },
          {
            isPublic: true,
          },
          {
            collaborations: {
              some: {
                userId,
                acceptedAt: { not: null },
              }
            }
          }
        ],
        AND: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { destination: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ]
        }
      },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true,
        coverImage: true,
        isPublic: true,
        user: {
          select: {
            name: true,
            image: true,
          }
        }
      },
      take: limit,
      orderBy: {
        updatedAt: "desc",
      }
    })
  }
}

// Database health check
export async function healthCheck() {
  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`
    const duration = Date.now() - start
    
    return {
      status: "healthy",
      responseTime: duration,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
  }
}

// Cleanup function for graceful shutdown
export async function cleanup() {
  try {
    await db.$disconnect()
    console.log("✅ Database disconnected successfully")
  } catch (error) {
    console.error("❌ Database disconnection failed:", error)
  }
}