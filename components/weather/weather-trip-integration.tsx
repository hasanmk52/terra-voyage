'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Snowflake, 
  Wind, 
  Thermometer, 
  Umbrella,
  AlertTriangle,
  Info,
  Package,
  Shirt,
  Calendar,
  TrendingUp,
  Eye,
  Clock
} from 'lucide-react';
import { WeatherForecast, ProcessedWeather, WeatherAlert } from '@/lib/weather-types';
import { weatherService } from '@/lib/weather-service';
import { weatherRecommendationEngine } from '@/lib/weather-recommendations';

interface WeatherTripIntegrationProps {
  destination: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  activities?: Array<{
    name: string;
    type: string;
    description: string;
    time?: string;
    date?: string;
  }>;
  dateRange: {
    start: Date;
    end: Date;
  };
  onWeatherLoaded?: (forecast: WeatherForecast) => void;
}

export function WeatherTripIntegration({
  destination,
  activities = [],
  dateRange,
  onWeatherLoaded
}: WeatherTripIntegrationProps) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadWeatherData();
  }, [destination.coordinates.lat, destination.coordinates.lng]);

  const loadWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const weatherData = await weatherService.getWeatherForecast(
        destination.coordinates.lat,
        destination.coordinates.lng,
        destination.name
      );
      
      setForecast(weatherData);
      
      // Generate recommendations
      const recs = weatherRecommendationEngine.generateRecommendations(
        weatherData,
        activities
      );
      setRecommendations(recs);
      
      onWeatherLoaded?.(weatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string, size: number = 20) => {
    const iconProps = { size, className: "text-blue-600" };
    
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun {...iconProps} className="text-yellow-500" />;
      case 'clouds':
        return <Cloud {...iconProps} className="text-gray-500" />;
      case 'rain':
        return <CloudRain {...iconProps} className="text-blue-600" />;
      case 'snow':
        return <Snowflake {...iconProps} className="text-blue-200" />;
      default:
        return <Cloud {...iconProps} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'destructive';
      case 'moderate': return 'default';
      case 'mild': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading weather data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button onClick={loadWeatherData} variant="outline" size="sm" className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!forecast || !recommendations) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather & Recommendations for {destination.name}
          <Badge variant="outline" className="ml-auto">
            Source: {forecast.source}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forecast">7-Day Forecast</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="packing">Packing</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Current Weather */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current</p>
                      <p className="text-2xl font-bold">{forecast.current.temperature.current}°C</p>
                      <p className="text-sm capitalize">{forecast.current.condition.description}</p>
                    </div>
                    {getWeatherIcon(forecast.current.condition.main, 32)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Precipitation</p>
                      <p className="font-semibold">{forecast.current.precipitation.probability}%</p>
                      <p className="text-sm">{forecast.current.precipitation.amount}mm</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Wind</p>
                      <p className="font-semibold">{forecast.current.wind.speed} km/h</p>
                      <p className="text-sm">{forecast.current.wind.direction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Visibility</p>
                      <p className="font-semibold">{forecast.current.visibility} km</p>
                      <p className="text-sm">{forecast.current.humidity}% humidity</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shirt className="h-4 w-4" />
                    Clothing Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recommendations.clothing.slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant={item.priority === 'essential' ? 'destructive' : 'secondary'} className="text-xs">
                          {item.priority}
                        </Badge>
                        <span className="text-sm">{item.items[0]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Daily Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recommendations.dailyTips[0]?.tips.slice(0, 3).map((tip: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <Info className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm">{tip}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <div className="grid gap-3">
              {forecast.forecast.slice(0, 7).map((day) => (
                <Card key={day.date}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="font-semibold">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                          <p className="text-sm text-muted-foreground">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        {getWeatherIcon(day.condition.main, 28)}
                        <div>
                          <p className="font-semibold capitalize">{day.condition.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {day.temperature.min}°C - {day.temperature.max}°C
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1">
                          <CloudRain className="h-3 w-3" />
                          <span className="text-sm">{day.precipitation.probability}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wind className="h-3 w-3" />
                          <span className="text-sm">{day.wind.speed} km/h</span>
                        </div>
                        <Badge variant={getSeverityColor(day.condition.severity)} className="text-xs">
                          {day.condition.severity}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            {recommendations.activities.length > 0 ? (
              <div className="space-y-3">
                {recommendations.activities.map((activity: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{activity.activityName}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{activity.activityType} • {activity.location}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{activity.suitabilityScore}/100</span>
                            <Badge variant={
                              activity.impact === 'positive' ? 'default' : 
                              activity.impact === 'neutral' ? 'secondary' : 'destructive'
                            }>
                              {activity.impact}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {activity.recommendations.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Recommendations:</p>
                          {activity.recommendations.map((rec: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <Info className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                              <span className="text-sm">{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {activity.alternatives && activity.alternatives.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-medium text-orange-600">Alternative Suggestions:</p>
                          {activity.alternatives.map((alt: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <TrendingUp className="h-3 w-3 mt-0.5 text-orange-600 flex-shrink-0" />
                              <span className="text-sm">{alt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>No activities provided for weather assessment</p>
                <p className="text-sm">Add activities to your itinerary to see weather-based recommendations</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="packing" className="space-y-4">
            <div className="grid gap-4">
              {['essential', 'recommended', 'optional'].map(priority => {
                const items = recommendations.packing.filter((item: any) => item.priority === priority);
                if (items.length === 0) return null;
                
                return (
                  <Card key={priority}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 capitalize">
                        <Package className="h-4 w-4" />
                        {priority} Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {items.map((item: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{item.item}</p>
                              <p className="text-sm text-muted-foreground">{item.reason}</p>
                              {item.alternatives && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Alternatives: {item.alternatives.join(', ')}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {recommendations.alerts.length > 0 ? (
              <div className="space-y-3">
                {recommendations.alerts.map((alert: WeatherAlert) => (
                  <Alert key={alert.id} className={
                    alert.severity === 'severe' ? 'border-red-200 bg-red-50' :
                    alert.severity === 'warning' ? 'border-orange-200 bg-orange-50' :
                    'border-blue-200 bg-blue-50'
                  }>
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.severity === 'severe' ? 'text-red-600' :
                      alert.severity === 'warning' ? 'text-orange-600' :
                      'text-blue-600'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{alert.title}</span>
                        <Badge variant={alert.severity === 'severe' ? 'destructive' : 'default'} className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      <AlertDescription>
                        <p className="mb-2">{alert.description}</p>
                        {alert.recommendations.length > 0 && (
                          <div>
                            <p className="font-medium text-sm mb-1">Recommendations:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {alert.recommendations.map((rec, i) => (
                                <li key={i} className="text-sm">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sun className="h-8 w-8 mx-auto mb-2" />
                <p>No weather alerts for your trip</p>
                <p className="text-sm">Enjoy your travels!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Data source and refresh info */}
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>Last updated: {new Date(forecast.lastUpdated).toLocaleString()}</span>
          <Button onClick={loadWeatherData} variant="ghost" size="sm">
            <Clock className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}