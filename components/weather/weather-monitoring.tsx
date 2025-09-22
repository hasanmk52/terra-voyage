'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  BarChart3,
  Timer,
  Zap
} from 'lucide-react';
import { weatherService } from '@/lib/weather-service';

interface WeatherMonitoringProps {
  onStatsUpdate?: (stats: any) => void;
}

export function WeatherMonitoring({ onStatsUpdate }: WeatherMonitoringProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const monitoringStats = weatherService.getMonitoringStats();
      setStats(monitoringStats);
      onStatsUpdate?.(monitoringStats);
    } catch (error) {
      console.error('Failed to load weather monitoring stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRate = (provider: any) => {
    if (!provider || provider.requests === 0) return 0;
    return Math.round((provider.successes / provider.requests) * 100);
  };

  const getProviderStatus = (successRate: number) => {
    if (successRate >= 95) return { status: 'excellent', color: 'text-green-600', icon: CheckCircle };
    if (successRate >= 80) return { status: 'good', color: 'text-blue-600', icon: CheckCircle };
    if (successRate >= 60) return { status: 'warning', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'poor', color: 'text-red-600', icon: XCircle };
  };

  if (!stats) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading monitoring data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallSuccessRate = stats.requests > 0 ? Math.round((stats.successes / stats.requests) * 100) : 0;
  const overallStatus = getProviderStatus(overallSuccessRate);

  return (
    <div className="space-y-4">
      {/* Overall System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Weather Service Health
            <Button onClick={loadStats} variant="ghost" size="sm" disabled={loading} className="ml-auto">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`flex items-center justify-center mb-2 ${overallStatus.color}`}>
                <overallStatus.icon className="h-8 w-8" />
              </div>
              <p className="text-2xl font-bold">{overallSuccessRate}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 text-blue-600">
                <BarChart3 className="h-8 w-8" />
              </div>
              <p className="text-2xl font-bold">{stats.requests}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 text-green-600">
                <TrendingUp className="h-8 w-8" />
              </div>
              <p className="text-2xl font-bold">{stats.successes}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 text-red-600">
                <TrendingDown className="h-8 w-8" />
              </div>
              <p className="text-2xl font-bold">{stats.failures}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Weather Provider Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.providerStats).map(([providerName, providerStats]: [string, any]) => {
              const successRate = getSuccessRate(providerStats);
              const status = getProviderStatus(successRate);
              
              return (
                <div key={providerName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <status.icon className={`h-5 w-5 ${status.color}`} />
                    <div>
                      <h3 className="font-semibold">{providerName}</h3>
                      <p className="text-sm text-muted-foreground">{status.status.toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold">{successRate}%</p>
                    <p className="text-sm text-muted-foreground">
                      {providerStats.successes}/{providerStats.requests}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant={
                      status.status === 'excellent' ? 'default' :
                      status.status === 'good' ? 'secondary' :
                      status.status === 'warning' ? 'destructive' : 'destructive'
                    }>
                      {status.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cache Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Cache Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{stats.cacheSize}</p>
              <p className="text-sm text-muted-foreground">Cached Entries</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Button 
                onClick={() => {
                  weatherService.clearCache();
                  loadStats();
                }} 
                variant="outline" 
                size="sm"
              >
                Clear Cache
              </Button>
              <p className="text-sm text-muted-foreground mt-2">Reset all cached data</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {overallSuccessRate < 80 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Weather service performance is below optimal. Some providers may be experiencing issues.</span>
              <Button onClick={loadStats} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {stats.failures > 10 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Multiple weather service failures detected. Check network connectivity and API keys.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}