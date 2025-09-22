/**
 * Map Performance Optimization Hook
 * Handles performance monitoring, throttling, and mobile optimization
 */

import { useEffect, useState, useCallback, useRef } from 'react'

export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  apiCallCount: number
  apiCallsPerMinute: number
  averageResponseTime: number
  errorRate: number
  memoryUsage?: number
}

export interface PerformanceConfig {
  maxApiCallsPerMinute: number
  apiCallThrottleMs: number
  enableMemoryMonitoring: boolean
  enableRenderOptimization: boolean
  maxTileRequests: number
  mobileOptimization: boolean
}

export interface DeviceCapabilities {
  isMobile: boolean
  isLowEnd: boolean
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown'
  deviceMemory?: number
  maxTouchPoints: number
}

export function useMapPerformance(config: Partial<PerformanceConfig> = {}) {
  const defaultConfig: PerformanceConfig = {
    maxApiCallsPerMinute: 60,
    apiCallThrottleMs: 1000,
    enableMemoryMonitoring: true,
    enableRenderOptimization: true,
    maxTileRequests: 10,
    mobileOptimization: true
  }

  const finalConfig = { ...defaultConfig, ...config }

  // Performance metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    apiCallCount: 0,
    apiCallsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0
  })

  // Device capabilities
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities>({
    isMobile: false,
    isLowEnd: false,
    connectionType: 'unknown',
    maxTouchPoints: 0
  })

  // Performance tracking refs
  const apiCallTimes = useRef<number[]>([])
  const apiResponseTimes = useRef<number[]>([])
  const apiErrors = useRef<number>(0)
  const lastApiCall = useRef<number>(0)
  const throttleQueue = useRef<Array<{ fn: Function; resolve: Function; reject: Function }>>([])
  const isProcessingQueue = useRef<boolean>(false)

  // Detect device capabilities
  useEffect(() => {
    const detectCapabilities = () => {
      const capabilities: DeviceCapabilities = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isLowEnd: false,
        connectionType: 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 0
      }

      // Check for low-end device indicators
      if ('deviceMemory' in navigator) {
        capabilities.deviceMemory = (navigator as any).deviceMemory
        capabilities.isLowEnd = capabilities.deviceMemory <= 2
      }

      // Detect connection type
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        capabilities.connectionType = connection.effectiveType || 'unknown'
      }

      // Additional low-end device detection
      if (capabilities.isMobile && (
        capabilities.maxTouchPoints <= 1 ||
        screen.width <= 480 ||
        /Android 4|Android 5|iPhone 5|iPhone 6/i.test(navigator.userAgent)
      )) {
        capabilities.isLowEnd = true
      }

      setDeviceCapabilities(capabilities)
    }

    detectCapabilities()
  }, [])

  // Memory monitoring
  useEffect(() => {
    if (!finalConfig.enableMemoryMonitoring || typeof window === 'undefined') return

    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / (1024 * 1024) // MB
        }))
      }
    }

    const interval = setInterval(monitorMemory, 5000)
    return () => clearInterval(interval)
  }, [finalConfig.enableMemoryMonitoring])

  // API call throttling
  const throttleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> => {
    const now = Date.now()
    
    // Check rate limiting
    const recentCalls = apiCallTimes.current.filter(time => now - time < 60000)
    if (recentCalls.length >= finalConfig.maxApiCallsPerMinute) {
      throw new Error('API rate limit exceeded')
    }

    // Check throttling
    if (now - lastApiCall.current < finalConfig.apiCallThrottleMs) {
      return new Promise((resolve, reject) => {
        throttleQueue.current.push({ fn: apiCall, resolve, reject })
        if (!isProcessingQueue.current) {
          processThrottleQueue()
        }
      })
    }

    return executeApiCall(apiCall)
  }, [finalConfig.maxApiCallsPerMinute, finalConfig.apiCallThrottleMs])

  // Process throttle queue
  const processThrottleQueue = useCallback(async () => {
    isProcessingQueue.current = true

    while (throttleQueue.current.length > 0) {
      const item = throttleQueue.current.shift()
      if (!item) break

      try {
        const result = await executeApiCall(item.fn)
        item.resolve(result)
      } catch (error) {
        item.reject(error)
      }

      // Wait for throttle interval
      await new Promise(resolve => setTimeout(resolve, finalConfig.apiCallThrottleMs))
    }

    isProcessingQueue.current = false
  }, [finalConfig.apiCallThrottleMs])

  // Execute API call with metrics tracking
  const executeApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T> => {
    const startTime = Date.now()
    lastApiCall.current = startTime

    try {
      const result = await apiCall()
      const responseTime = Date.now() - startTime

      // Update metrics
      apiCallTimes.current.push(startTime)
      apiResponseTimes.current.push(responseTime)

      // Keep only recent data (last 100 calls)
      if (apiCallTimes.current.length > 100) {
        apiCallTimes.current = apiCallTimes.current.slice(-100)
        apiResponseTimes.current = apiResponseTimes.current.slice(-100)
      }

      updateMetrics()
      return result
    } catch (error) {
      apiErrors.current++
      updateMetrics()
      throw error
    }
  }, [])

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const now = Date.now()
    const recentCalls = apiCallTimes.current.filter(time => now - time < 60000)
    const averageResponseTime = apiResponseTimes.current.length > 0
      ? apiResponseTimes.current.reduce((a, b) => a + b, 0) / apiResponseTimes.current.length
      : 0

    const errorRate = apiCallTimes.current.length > 0
      ? apiErrors.current / apiCallTimes.current.length
      : 0

    setMetrics(prev => ({
      ...prev,
      apiCallCount: apiCallTimes.current.length,
      apiCallsPerMinute: recentCalls.length,
      averageResponseTime,
      errorRate
    }))
  }, [])

  // Get optimized tile settings based on device capabilities
  const getOptimizedTileSettings = useCallback(() => {
    if (!finalConfig.mobileOptimization) {
      return {
        tileSize: 512,
        maxZoom: 18,
        maxPitch: 60,
        antialias: true
      }
    }

    if (deviceCapabilities.isLowEnd) {
      return {
        tileSize: 256,
        maxZoom: 16,
        maxPitch: 0,
        antialias: false
      }
    }

    if (deviceCapabilities.isMobile) {
      return {
        tileSize: 512,
        maxZoom: 17,
        maxPitch: 30,
        antialias: true
      }
    }

    return {
      tileSize: 512,
      maxZoom: 18,
      maxPitch: 60,
      antialias: true
    }
  }, [deviceCapabilities, finalConfig.mobileOptimization])

  // Get optimized render settings
  const getOptimizedRenderSettings = useCallback(() => {
    const baseSettings = {
      enableClustering: true,
      clusterRadius: 50,
      clusterMaxZoom: 14,
      animationDuration: 300
    }

    if (deviceCapabilities.isLowEnd) {
      return {
        ...baseSettings,
        enableClustering: true,
        clusterRadius: 80,
        clusterMaxZoom: 12,
        animationDuration: 0
      }
    }

    if (deviceCapabilities.connectionType === 'slow-2g' || deviceCapabilities.connectionType === '2g') {
      return {
        ...baseSettings,
        enableClustering: true,
        clusterRadius: 100,
        animationDuration: 150
      }
    }

    return baseSettings
  }, [deviceCapabilities])

  // Performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = []

    if (metrics.apiCallsPerMinute > finalConfig.maxApiCallsPerMinute * 0.8) {
      recommendations.push('Consider reducing map interactions or implementing better caching')
    }

    if (metrics.averageResponseTime > 2000) {
      recommendations.push('API response times are slow. Consider offline mode or static maps')
    }

    if (metrics.errorRate > 0.1) {
      recommendations.push('High error rate detected. Check network connectivity and API limits')
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 100) {
      recommendations.push('High memory usage. Consider reducing tile cache size or map complexity')
    }

    if (deviceCapabilities.isLowEnd && !finalConfig.mobileOptimization) {
      recommendations.push('Enable mobile optimization for better performance on this device')
    }

    return recommendations
  }, [metrics, deviceCapabilities, finalConfig])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      throttleQueue.current = []
      isProcessingQueue.current = false
    }
  }, [])

  return {
    metrics,
    deviceCapabilities,
    throttleApiCall,
    getOptimizedTileSettings,
    getOptimizedRenderSettings,
    getPerformanceRecommendations,
    isLowEndDevice: deviceCapabilities.isLowEnd,
    isMobileDevice: deviceCapabilities.isMobile,
    shouldUseOfflineMode: deviceCapabilities.connectionType === 'slow-2g' || 
                         deviceCapabilities.connectionType === '2g' ||
                         metrics.errorRate > 0.2
  }
}