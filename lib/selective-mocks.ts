// Selective mock configuration - use real services when API keys are available
export const serviceConfig = {
  // AI Service - use real Gemini when API key is available
  useRealAI: !!process.env.GEMINI_API_KEY,
  
  // Google Maps - use real service when API key is available  
  useRealMaps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && 
               process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== "your-google-maps-api-key" &&
               process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 20,
               
  // Weather API - use real service when API key is available
  useRealWeather: !!process.env.WEATHER_API_KEY && 
                  process.env.WEATHER_API_KEY !== "your-weather-api-key",
                  
  // Mapbox - use real service when token is available
  useRealMapbox: !!process.env.MAPBOX_ACCESS_TOKEN && 
                 process.env.MAPBOX_ACCESS_TOKEN !== "your-mapbox-token",
                 
  // Database - use real database when URL is configured (for now keep mocked)
  useRealDatabase: false, // Set to true when you want to use real database
  
  // Redis Cache - use real Redis when URL is configured (for now keep mocked)  
  useRealCache: false, // Set to true when you want to use real Redis
  
  // Services that will remain mocked for demo
  useRealWebSocket: false, // Keep mocked for demo
  useRealBooking: false,   // Keep mocked for demo
  useRealNotifications: false, // Keep mocked for demo
  useRealPDF: false,       // Keep mocked for demo
  useRealCalendar: false,  // Keep mocked for demo
}

// Helper function to check if a specific service should use mocks
export const shouldUseMock = (service: keyof typeof serviceConfig): boolean => {
  // If global mocks are enabled, use mocks for everything
  if (process.env.USE_MOCKS === "true" || process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
    return true
  }
  
  // Otherwise, use real service if configured
  return !serviceConfig[service]
}

// Export individual service flags for easy use
export const useMockAI = shouldUseMock('useRealAI')
export const useMockMaps = shouldUseMock('useRealMaps') 
export const useMockWeather = shouldUseMock('useRealWeather')
export const useMockMapbox = shouldUseMock('useRealMapbox')
export const useMockDatabase = shouldUseMock('useRealDatabase')
export const useMockCache = shouldUseMock('useRealCache')
export const useMockWebSocket = shouldUseMock('useRealWebSocket')
export const useMockBooking = shouldUseMock('useRealBooking')
export const useMockNotifications = shouldUseMock('useRealNotifications')
export const useMockPDF = shouldUseMock('useRealPDF')
export const useMockCalendar = shouldUseMock('useRealCalendar')

// Log the configuration on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Service Configuration:', {
    AI: useMockAI ? 'MOCK' : 'REAL',
    Maps: useMockMaps ? 'MOCK' : 'REAL', 
    Weather: useMockWeather ? 'MOCK' : 'REAL',
    Database: useMockDatabase ? 'MOCK' : 'REAL',
    Cache: useMockCache ? 'MOCK' : 'REAL',
    WebSocket: useMockWebSocket ? 'MOCK' : 'REAL',
    PDF: useMockPDF ? 'MOCK' : 'REAL',
  })
}