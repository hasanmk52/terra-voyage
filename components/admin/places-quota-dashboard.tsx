/**
 * Places API Quota Dashboard Component
 * FR-005.2: Display quota status in admin dashboard for monitoring
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp,
  Activity,
  Wifi,
  WifiOff 
} from "lucide-react"
import { placesQuotaMonitor, QuotaStatus } from "@/lib/places-quota-monitor"
import { cn } from "@/lib/utils"

interface QuotaUsageStats {
  searchTextRequests: number
  placeDetailsRequests: number
  nearbySearchRequests: number
  autocompleteRequests: number
  totalRequests: number
  lastReset: number
  dailyLimit: number
  monthlyLimit: number
  status: QuotaStatus
  timeUntilResetFormatted: string
}

export function PlacesQuotaDashboard() {
  const [stats, setStats] = useState<QuotaUsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const refreshStats = async () => {
    try {
      const usageStats = placesQuotaMonitor.getUsageStats()
      setStats(usageStats)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to load quota stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshStats()
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading quota information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: QuotaStatus) => {
    if (status.shouldUseFallback) return "text-red-500"
    if (status.warningThreshold) return "text-yellow-500"
    return "text-green-500"
  }

  const getStatusIcon = (status: QuotaStatus) => {
    if (status.shouldUseFallback) return AlertTriangle
    if (status.warningThreshold) return Clock
    return CheckCircle
  }

  const StatusIcon = getStatusIcon(stats.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Places API Quota Monitor</h2>
          <p className="text-gray-600">Monitor Google Places API usage and quota limits</p>
        </div>
        <Button 
          onClick={refreshStats} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <StatusIcon className={cn("h-5 w-5", getStatusColor(stats.status))} />
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Service</span>
                <div className="flex items-center gap-1">
                  {stats.status.isAvailable ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    stats.status.isAvailable ? "text-green-600" : "text-red-600"
                  )}>
                    {stats.status.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Fallback Mode</span>
                <span className={cn(
                  "text-sm font-medium",
                  stats.status.shouldUseFallback ? "text-orange-600" : "text-green-600"
                )}>
                  {stats.status.shouldUseFallback ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Daily Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {stats.totalRequests}
                </span>
                <span className="text-sm text-gray-600">
                  / {stats.dailyLimit}
                </span>
              </div>
              
              <Progress 
                value={stats.status.usagePercentage * 100} 
                className="h-2"
                indicatorClassName={cn(
                  "transition-all duration-300",
                  stats.status.shouldUseFallback ? "bg-red-500" :
                  stats.status.warningThreshold ? "bg-yellow-500" : "bg-green-500"
                )}
              />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {Math.round(stats.status.usagePercentage * 100)}% used
                </span>
                <span className="text-gray-500">
                  {stats.status.remainingRequests} remaining
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Timer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Reset Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">
                {stats.timeUntilResetFormatted}
              </div>
              <div className="text-sm text-gray-600">
                until quota reset
              </div>
              <div className="text-xs text-gray-500">
                Last reset: {new Date(stats.lastReset).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Request Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.searchTextRequests}
              </div>
              <div className="text-sm text-blue-800">Search Text</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.placeDetailsRequests}
              </div>
              <div className="text-sm text-green-800">Place Details</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.nearbySearchRequests}
              </div>
              <div className="text-sm text-purple-800">Nearby Search</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {stats.autocompleteRequests}
              </div>
              <div className="text-sm text-orange-800">Autocomplete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Recommendations */}
      {(stats.status.warningThreshold || stats.status.shouldUseFallback) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Quota Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.status.warningThreshold && !stats.status.shouldUseFallback && (
                <div className="flex items-start gap-2 text-yellow-700">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Quota Warning</p>
                    <p className="text-sm">
                      You've used {Math.round(stats.status.usagePercentage * 100)}% of your daily quota. 
                      Consider implementing caching or reducing API calls.
                    </p>
                  </div>
                </div>
              )}
              
              {stats.status.shouldUseFallback && (
                <div className="flex items-start gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Fallback Mode Active</p>
                    <p className="text-sm">
                      API quota exceeded. The system is using offline destination search. 
                      Quota will reset in {stats.timeUntilResetFormatted}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdated.toLocaleTimeString()} • 
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}