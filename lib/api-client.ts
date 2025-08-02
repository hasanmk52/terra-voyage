interface ApiError {
  error: string
  details?: any
}

class ApiClientError extends Error {
  public status: number
  public details?: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.status = status
    this.details = details
  }
}

// Simple cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Check cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = cache.get(endpoint)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
  }
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: "Network error",
    }))

    throw new ApiClientError(
      errorData.error || "Request failed",
      response.status,
      errorData.details
    )
  }

  const data = await response.json()
  
  // Cache GET requests
  if (!options.method || options.method === 'GET') {
    cache.set(endpoint, { data, timestamp: Date.now() })
  }
  
  return data
}

export const apiClient = {
  // User Profile
  getProfile: () => apiRequest("/api/user/profile"),
  
  updateProfile: (data: any) =>
    apiRequest("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAccount: () =>
    apiRequest("/api/user/profile", {
      method: "DELETE",
    }),

  // User Trips
  getTrips: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.status) searchParams.set("status", params.status)

    const query = searchParams.toString()
    return apiRequest(`/api/user/trips${query ? `?${query}` : ""}`)
  },

  createTrip: (data: any) =>
    apiRequest("/api/user/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTrip: (tripId: string) =>
    apiRequest(`/api/user/trips/${tripId}`),

  updateTrip: (tripId: string, data: any) =>
    apiRequest(`/api/user/trips/${tripId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTrip: (tripId: string) =>
    apiRequest(`/api/user/trips/${tripId}`, {
      method: "DELETE",
    }),
}

export { ApiClientError }