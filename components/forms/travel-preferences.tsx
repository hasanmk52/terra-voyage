"use client";

import { useState } from "react";
import { Clock, Home, Car, Accessibility, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DietaryRestriction,
  TransportationType,
  AccommodationType,
  TravelPace,
} from "@/types/travel-preferences";

export interface TravelPreferences {
  pace: TravelPace;
  accommodationType: AccommodationType;
  transportation: TransportationType;
  accessibility: boolean;
  dietaryRestrictions: DietaryRestriction[];
  specialRequests: string;
}

interface TravelPreferencesProps {
  value: TravelPreferences;
  onChange: (preferences: TravelPreferences) => void;
  className?: string;
  disabled?: boolean;
}

const paceOptions = [
  {
    value: TravelPace.Slow,
    label: "Slow & Relaxed",
    description: "2-3 activities per day, plenty of rest time",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    value: TravelPace.Moderate,
    label: "Moderate",
    description: "4-5 activities per day, balanced schedule",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    value: TravelPace.Fast,
    label: "Fast & Packed",
    description: "6+ activities per day, maximize experiences",
    icon: <Clock className="h-5 w-5" />,
  },
];

const accommodationOptions = [
  {
    value: AccommodationType.Budget,
    label: "Budget",
    description: "Hostels, budget hotels, shared accommodations",
    icon: <Home className="h-5 w-5" />,
  },
  {
    value: AccommodationType.MidRange,
    label: "Mid-Range",
    description: "3-star hotels, boutique properties",
    icon: <Home className="h-5 w-5" />,
  },
  {
    value: AccommodationType.Luxury,
    label: "Luxury",
    description: "4-5 star hotels, premium amenities",
    icon: <Home className="h-5 w-5" />,
  },
  {
    value: AccommodationType.Mixed,
    label: "Mixed",
    description: "Variety of accommodation types",
    icon: <Home className="h-5 w-5" />,
  },
];

const transportationOptions = [
  {
    value: TransportationType.Walking,
    label: "Walking",
    description: "Explore on foot, walkable distances only",
    icon: <Car className="h-5 w-5" />,
  },
  {
    value: TransportationType.Public,
    label: "Public Transport",
    description: "Buses, trains, metro systems",
    icon: <Car className="h-5 w-5" />,
  },
  {
    value: TransportationType.RentalCar,
    label: "Rental Car",
    description: "Car rental for flexibility",
    icon: <Car className="h-5 w-5" />,
  },
  {
    value: TransportationType.Mixed,
    label: "Mixed",
    description: "Combination of transport methods",
    icon: <Car className="h-5 w-5" />,
  },
];

const dietaryOptions = [
  DietaryRestriction.Vegetarian,
  DietaryRestriction.Vegan,
  DietaryRestriction.GlutenFree,
  DietaryRestriction.DairyFree,
  DietaryRestriction.NutFree,
  DietaryRestriction.Halal,
  DietaryRestriction.Kosher,
  DietaryRestriction.Keto,
  DietaryRestriction.Paleo,
  DietaryRestriction.Other,
];

export function TravelPreferences({
  value,
  onChange,
  className,
  disabled,
}: TravelPreferencesProps) {
  const [showDietaryOther, setShowDietaryOther] = useState(() => {
    const hasCustomRestrictions = value.dietaryRestrictions.some(
      (restriction) => !dietaryOptions.slice(0, -1).includes(restriction)
    );
    return hasCustomRestrictions;
  });

  const handlePreferenceChange = <K extends keyof TravelPreferences>(
    key: K,
    newValue: TravelPreferences[K]
  ) => {
    onChange({
      ...value,
      [key]: newValue,
    });
  };

  const toggleDietaryRestriction = (restriction: DietaryRestriction) => {
    const isSelected = value.dietaryRestrictions.includes(restriction);
    if (isSelected) {
      handlePreferenceChange(
        "dietaryRestrictions",
        value.dietaryRestrictions.filter((r) => r !== restriction)
      );
    } else {
      handlePreferenceChange("dietaryRestrictions", [
        ...value.dietaryRestrictions,
        restriction,
      ]);
    }
  };

  const handleCustomDietary = (customRestriction: string) => {
    const otherRestrictions = value.dietaryRestrictions.filter((r) =>
      dietaryOptions.slice(0, -1).includes(r)
    );
    if (customRestriction.trim()) {
      handlePreferenceChange("dietaryRestrictions", [
        ...otherRestrictions,
        customRestriction.trim() as DietaryRestriction,
      ]);
    } else {
      handlePreferenceChange("dietaryRestrictions", otherRestrictions);
    }
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Travel Pace */}
      <div>
        <label className="text-base font-medium text-gray-900 block mb-4">
          Travel Pace
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {paceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePreferenceChange("pace", option.value)}
              disabled={disabled}
              className={cn(
                "p-4 border rounded-lg text-left transition-all",
                "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                value.pace === option.value
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={cn(
                    "flex-shrink-0 p-2 rounded-md",
                    value.pace === option.value
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{option.label}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accommodation Type */}
      <div>
        <label className="text-base font-medium text-gray-900 block mb-4">
          Accommodation Preference
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accommodationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                handlePreferenceChange("accommodationType", option.value)
              }
              disabled={disabled}
              className={cn(
                "p-4 border rounded-lg text-left transition-all",
                "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                value.accommodationType === option.value
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={cn(
                    "flex-shrink-0 p-2 rounded-md",
                    value.accommodationType === option.value
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{option.label}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transportation */}
      <div>
        <label className="text-base font-medium text-gray-900 block mb-4">
          Transportation Preference
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {transportationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                handlePreferenceChange("transportation", option.value)
              }
              disabled={disabled}
              className={cn(
                "p-4 border rounded-lg text-left transition-all",
                "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                value.transportation === option.value
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={cn(
                    "flex-shrink-0 p-2 rounded-md",
                    value.transportation === option.value
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{option.label}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() =>
              handlePreferenceChange("accessibility", !value.accessibility)
            }
            disabled={disabled}
            className={cn(
              "flex items-center space-x-3 p-4 border rounded-lg transition-all",
              "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              value.accessibility
                ? "border-blue-300 bg-blue-50"
                : "border-gray-200 bg-white"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 p-2 rounded-md",
                value.accessibility
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <Accessibility className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900">
                Accessibility Requirements
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Need wheelchair accessible venues and transportation
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="text-base font-medium text-gray-900 block mb-4">
          <UtensilsCrossed className="h-5 w-5 inline-block mr-2" />
          Dietary Restrictions
        </label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {dietaryOptions.slice(0, -1).map((restriction) => {
              const isSelected =
                value.dietaryRestrictions.includes(restriction);
              return (
                <button
                  key={restriction}
                  type="button"
                  onClick={() => toggleDietaryRestriction(restriction)}
                  disabled={disabled}
                  className={cn(
                    "px-4 py-2 border rounded-lg text-sm transition-all",
                    "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700"
                  )}
                >
                  {restriction}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowDietaryOther(!showDietaryOther)}
              disabled={disabled}
              className={cn(
                "px-4 py-2 border rounded-lg text-sm transition-all",
                "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                showDietaryOther
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700"
              )}
            >
              Other
            </button>
          </div>
          {showDietaryOther && (
            <input
              type="text"
              placeholder="Specify other dietary restrictions..."
              onChange={(e) => handleCustomDietary(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          )}
        </div>
      </div>

      {/* Special Requests */}
      <div>
        <label className="text-base font-medium text-gray-900 block mb-4">
          Special Requests or Notes
        </label>
        <textarea
          value={value.specialRequests}
          onChange={(e) =>
            handlePreferenceChange("specialRequests", e.target.value)
          }
          placeholder="Any special requests, medical needs, or additional information we should know about..."
          rows={4}
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
          maxLength={500}
        />
        <div className="mt-2 text-sm text-gray-500 text-right">
          {value.specialRequests.length}/500 characters
        </div>
      </div>
    </div>
  );
}
