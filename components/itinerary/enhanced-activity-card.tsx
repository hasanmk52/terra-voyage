/**
 * Enhanced Activity Card with Coordinate Interaction
 * Integrates coordinate validation and user interaction features
 */

'use client';

import { useState, useCallback } from 'react';
import { Clock, MapPin, DollarSign, Star, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoordinateInteraction } from '@/components/maps/coordinate-interaction';
import { Activity } from '@/lib/itinerary-types';
import { Coordinates } from '@/lib/coordinate-validation';

interface EnhancedActivityCardProps {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
  onCoordinateUpdate?: (activityId: string, coordinates: Coordinates) => void;
  onAccuracyReport?: (activityId: string, report: any) => void;
  editable?: boolean;
  showCoordinateInteraction?: boolean;
  className?: string;
}

export function EnhancedActivityCard({
  activity,
  onEdit,
  onDelete,
  onCoordinateUpdate,
  onAccuracyReport,
  editable = false,
  showCoordinateInteraction = true,
  className = ''
}: EnhancedActivityCardProps) {
  const [updatedActivity, setUpdatedActivity] = useState<Activity>(activity);

  const handleCoordinateUpdate = useCallback((newCoordinates: Coordinates) => {
    const updated = {
      ...updatedActivity,
      location: {
        ...updatedActivity.location,
        coordinates: newCoordinates
      }
    };
    setUpdatedActivity(updated);
    onCoordinateUpdate?.(activity.id, newCoordinates);
  }, [updatedActivity, activity.id, onCoordinateUpdate]);

  const handleAccuracyReport = useCallback((report: any) => {
    onAccuracyReport?.(activity.id, report);
  }, [activity.id, onAccuracyReport]);

  const getActivityTypeColor = (type: string) => {
    const colors = {
      attraction: 'bg-blue-100 text-blue-800',
      restaurant: 'bg-red-100 text-red-800',
      experience: 'bg-purple-100 text-purple-800',
      accommodation: 'bg-green-100 text-green-800',
      transportation: 'bg-gray-100 text-gray-800',
      shopping: 'bg-yellow-100 text-yellow-800',
      other: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatPrice = (pricing: Activity['pricing']) => {
    if (pricing.amount === 0) return 'Free';
    return `${pricing.currency} ${pricing.amount}${pricing.priceType === 'per_person' ? '/person' : ''}`;
  };

  return (
    <Card className={`relative hover:shadow-md transition-shadow ${className}`}>
      {/* Activity Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getActivityTypeColor(updatedActivity.type)}>
                {updatedActivity.type.charAt(0).toUpperCase() + updatedActivity.type.slice(1)}
              </Badge>
              {updatedActivity.bookingRequired && (
                <Badge variant="outline" className="text-xs">
                  Booking Required
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {updatedActivity.name}
            </CardTitle>
          </div>
          
          {editable && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit?.(updatedActivity)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete?.(activity.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {updatedActivity.description && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {updatedActivity.description}
          </p>
        )}

        {/* Time and Duration */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(updatedActivity.startTime)} - {formatTime(updatedActivity.endTime)}
            </span>
          </div>
          {updatedActivity.duration && (
            <span className="text-gray-500">
              ({updatedActivity.duration} mins)
            </span>
          )}
        </div>

        {/* Location with Coordinate Interaction */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {updatedActivity.location.name}
              </p>
              <p className="text-xs text-gray-600">
                {updatedActivity.location.address}
              </p>
            </div>
          </div>

          {/* Coordinate Interaction Component */}
          {showCoordinateInteraction && (
            <div className="ml-6">
              <CoordinateInteraction
                coordinates={updatedActivity.location.coordinates}
                address={updatedActivity.location.address}
                activityId={activity.id}
                onCoordinateUpdate={handleCoordinateUpdate}
                onAccuracyReport={handleAccuracyReport}
                editable={editable}
                showAccuracyIndicator={true}
                className="text-xs"
              />
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-center gap-1 text-sm">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-green-600">
            {formatPrice(updatedActivity.pricing)}
          </span>
        </div>

        {/* Tips */}
        {updatedActivity.tips && updatedActivity.tips.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700">Tips:</p>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {updatedActivity.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-gray-400">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Accessibility Information */}
        {(updatedActivity.accessibility.wheelchairAccessible || updatedActivity.accessibility.notes) && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700">Accessibility:</p>
            <div className="text-xs text-gray-600 space-y-0.5">
              {updatedActivity.accessibility.wheelchairAccessible && (
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>Wheelchair accessible</span>
                </div>
              )}
              {updatedActivity.accessibility.hasElevator && (
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>Elevator available</span>
                </div>
              )}
              {updatedActivity.accessibility.notes && (
                <p className="text-gray-600">{updatedActivity.accessibility.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        {(updatedActivity.rating || updatedActivity.estimatedCost) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {updatedActivity.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{updatedActivity.rating}</span>
              </div>
            )}
            {updatedActivity.estimatedCost && (
              <div className="text-xs text-gray-500">
                Est. {updatedActivity.estimatedCost.currency} {updatedActivity.estimatedCost.amount}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};