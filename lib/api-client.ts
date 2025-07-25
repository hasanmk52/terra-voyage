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

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

  return response.json()
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