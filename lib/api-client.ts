interface ApiError {
  error: string;
  details?: any;
}

class ApiClientError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Simple cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// Cache invalidation helper
// This function removes cached entries that match the given pattern
// Used to ensure fresh data is loaded after mutations (create, update, delete)
function invalidateCache(pattern: string) {
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => cache.delete(key));
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Check cache for GET requests
  if (!options.method || options.method === "GET") {
    const cached = cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: "Network error",
    }));

    throw new ApiClientError(
      errorData.error || "Request failed",
      response.status,
      errorData.details
    );
  }

  const data = await response.json();

  // Cache GET requests
  if (!options.method || options.method === "GET") {
    cache.set(endpoint, { data, timestamp: Date.now() });
  }

  return data;
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
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);

    const query = searchParams.toString();
    return apiRequest(`/api/user/trips${query ? `?${query}` : ""}`);
  },

  createTrip: (data: any) =>
    apiRequest("/api/user/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((response) => {
      // Invalidate trips cache after creating a new trip
      invalidateCache("/api/user/trips");
      return response;
    }),

  getTrip: (tripId: string) => apiRequest(`/api/user/trips/${tripId}`),

  updateTrip: (tripId: string, data: any) =>
    apiRequest(`/api/user/trips/${tripId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).then((response) => {
      // Invalidate trips cache after updating a trip
      invalidateCache("/api/user/trips");
      return response;
    }),

  deleteTrip: (tripId: string) =>
    apiRequest(`/api/user/trips/${tripId}`, {
      method: "DELETE",
    }).then((response) => {
      // Invalidate trips cache after deleting a trip
      invalidateCache("/api/user/trips");
      return response;
    }),

  // Trip Status Management
  updateTripStatus: (tripId: string, status: string) =>
    apiRequest(`/api/user/trips/${tripId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }).then((response) => {
      // Invalidate trips cache after status change
      invalidateCache("/api/user/trips");
      return response;
    }),

  getTripStatusHistory: (tripId: string, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return apiRequest(`/api/user/trips/${tripId}/status-history${query ? `?${query}` : ''}`);
  },

  // Cache management
  clearCache: (pattern?: string) => {
    if (pattern) {
      invalidateCache(pattern);
    } else {
      cache.clear();
    }
  },
};

export { ApiClientError };
