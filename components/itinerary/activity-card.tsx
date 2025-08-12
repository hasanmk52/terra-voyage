"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Activity } from "@/lib/itinerary-types";
import {
  formatTimeRange,
  getActivityIcon,
  getActivityColor,
} from "@/lib/itinerary-types";
import { formatCurrency } from "@/lib/utils";
import {
  Clock,
  MapPin,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Star,
  GripVertical,
  ExternalLink,
  Heart,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

interface ActivityCardProps {
  activity: Activity;
  dayNumber?: number;
  index?: number;
  isDragging?: boolean;
  onSelect: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onRemove: (activity: Activity) => void;
  onToggleFavorite?: (activity: Activity) => void;
  className?: string;
}

export function ActivityCard({
  activity,
  dayNumber,
  index,
  isDragging = false,
  onSelect,
  onEdit,
  onRemove,
  onToggleFavorite,
  className = "",
}: ActivityCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const formatPrice = (pricing: Activity["pricing"]) => {
    if (!pricing || pricing.amount === 0) return "Free";
    return `${formatCurrency(pricing.amount)} ${
      pricing.priceType === "per_person"
        ? "/person"
        : pricing.priceType === "per_group"
        ? "/group"
        : ""
    }`;
  };

  const getPriorityColor = () => {
    if (activity.bookingRequired) return "border-l-red-500";
    if (activity.type === "transportation") return "border-l-blue-500";
    if (activity.type === "restaurant") return "border-l-amber-500";
    return "border-l-gray-300";
  };

  const formatDuration = (duration: string) => {
    // Safely extract duration number from string, handling cases where duration might not be a string
    const durationStr = typeof duration === "string" ? duration : "";
    const minutes = parseInt(durationStr.match(/\d+/)?.[0] || "0");
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
    return `${minutes}m`;
  };

  if (isDragging) {
    return (
      <Card
        className={`bg-white shadow-lg border-2 border-blue-300 ${className}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">
                {activity.name}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-2">
                {activity.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={className}
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`group hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 border-l-4 ${getPriorityColor()} ${
          activity.isFavorite
            ? "ring-2 ring-pink-200 bg-gradient-to-r from-pink-50/30"
            : "hover:bg-gradient-to-r hover:from-blue-50/30"
        } hover:border-blue-200 hover:-translate-y-1 hover:scale-[1.02] border-gray-100 bg-white/80 backdrop-blur-sm`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-100 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </div>

            {/* Activity icon */}
            <div className="text-2xl flex-shrink-0 mt-1 p-2 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-sm">
              {getActivityIcon(activity.type)}
            </div>

            {/* Activity content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                      onClick={() => onSelect(activity)}
                    >
                      {activity.name}
                    </h4>
                    {activity.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{activity.rating}</span>
                      </div>
                    )}
                    {activity.isFavorite && (
                      <Heart className="h-4 w-4 text-pink-500 fill-current" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={`${getActivityColor(activity.type)} shadow-sm`}
                    >
                      {activity.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
                    >
                      {activity.timeSlot}
                    </Badge>
                    {activity.bookingRequired && (
                      <Badge
                        variant="destructive"
                        className="text-xs shadow-sm bg-gradient-to-r from-red-500 to-red-600"
                      >
                        Booking Required
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {activity.description}
                  </p>

                  {/* Activity details */}
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTimeRange(
                            activity.startTime,
                            activity.endTime
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{formatDuration(activity.duration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">
                        {activity.location.address}
                      </span>
                    </div>

                    {activity.pricing && activity.pricing.amount > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatPrice(activity.pricing)}</span>
                        {activity.priceCategory && (
                          <span className="text-gray-400">
                            ({activity.priceCategory})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable details */}
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                    >
                      {activity.tips && activity.tips.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1">
                            Tips:
                          </h5>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {activity.tips.map((tip, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-1"
                              >
                                <span className="text-gray-400">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activity.accessibility && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1">
                            Accessibility:
                          </h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            {activity.accessibility.wheelchairAccessible && (
                              <div>• Wheelchair accessible</div>
                            )}
                            {activity.accessibility.hasElevator && (
                              <div>• Elevator available</div>
                            )}
                            {activity.accessibility.notes && (
                              <div>• {activity.accessibility.notes}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Actions menu */}
                <div className="relative z-50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="More options"
                        title="More options"
                        className="p-2 h-9 w-9 rounded-full bg-white/80 border border-gray-200 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 hover:border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 z-[9999]">
                      <DropdownMenuItem
                        onClick={() => onSelect(activity)}
                        className="group"
                      >
                        <Eye className="h-4 w-4 mr-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        <span className="font-medium">View Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDetails(!showDetails)}
                        className="group"
                      >
                        <Info className="h-4 w-4 mr-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        <span className="font-medium">
                          {showDetails ? "Hide" : "Show"} Info
                        </span>
                      </DropdownMenuItem>
                      {onToggleFavorite && (
                        <DropdownMenuItem
                          onClick={() => onToggleFavorite(activity)}
                          className="group"
                        >
                          <Heart
                            className={`h-4 w-4 mr-3 transition-colors ${
                              activity.isFavorite
                                ? "fill-current text-pink-500"
                                : "text-gray-600 group-hover:text-pink-500"
                            }`}
                          />
                          <span className="font-medium">
                            {activity.isFavorite ? "Remove from" : "Add to"}{" "}
                            Favorites
                          </span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onEdit(activity)}
                        className="group"
                      >
                        <Edit className="h-4 w-4 mr-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        <span className="font-medium">Edit Activity</span>
                      </DropdownMenuItem>
                      {activity.bookingUrl && (
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(activity.bookingUrl, "_blank")
                          }
                          className="group"
                        >
                          <ExternalLink className="h-4 w-4 mr-3 text-gray-600 group-hover:text-green-600 transition-colors" />
                          <span className="font-medium">Book Now</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onRemove(activity)}
                        className="group text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-3 text-red-500 group-hover:text-red-600 transition-colors" />
                        <span className="font-medium">Remove</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ActivityCard;
