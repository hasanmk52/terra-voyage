/**
 * User Preferences Service
 * Manages loading and applying user preferences to trip planning defaults
 */

import { TravelPreferences } from "@/components/forms/travel-preferences";
import {
  DietaryRestriction,
  TransportationType,
  AccommodationType,
  TravelPace,
} from "@/types/travel-preferences";

// Utility functions for mapping strings to enums
export function mapStringToDietaryRestriction(str: string): DietaryRestriction {
  switch (str.trim().toLowerCase()) {
    case "vegetarian":
      return DietaryRestriction.Vegetarian;
    case "vegan":
      return DietaryRestriction.Vegan;
    case "gluten-free":
      return DietaryRestriction.GlutenFree;
    case "dairy-free":
      return DietaryRestriction.DairyFree;
    case "nut-free":
      return DietaryRestriction.NutFree;
    case "halal":
      return DietaryRestriction.Halal;
    case "kosher":
      return DietaryRestriction.Kosher;
    case "keto":
      return DietaryRestriction.Keto;
    case "paleo":
      return DietaryRestriction.Paleo;
    case "other":
      return DietaryRestriction.Other;
    default:
      return str as DietaryRestriction;
  }
}
export function mapStringToTransportationType(str: string): TransportationType {
  switch (str.trim().toLowerCase()) {
    case "walking":
    case "walk":
    case "on foot":
      return TransportationType.Walking;
    case "public":
    case "public transport":
    case "bus":
    case "train":
    case "metro":
      return TransportationType.Public;
    case "rental-car":
    case "car":
    case "rental car":
    case "driving":
      return TransportationType.RentalCar;
    case "mixed":
    case "variety":
    case "combination":
      return TransportationType.Mixed;
    default:
      return TransportationType.Mixed;
  }
}
export function mapStringToAccommodationType(str: string): AccommodationType {
  switch (str.trim().toLowerCase()) {
    case "budget":
    case "hostel":
    case "budget hotel":
      return AccommodationType.Budget;
    case "luxury":
    case "4-star":
    case "5-star":
    case "premium":
      return AccommodationType.Luxury;
    case "mid-range":
    case "3-star":
    case "boutique":
      return AccommodationType.MidRange;
    case "mixed":
    case "variety":
      return AccommodationType.Mixed;
    default:
      return AccommodationType.MidRange;
  }
}
export function mapStringToTravelPace(str: string): TravelPace {
  switch (str.trim().toLowerCase()) {
    case "slow":
      return TravelPace.Slow;
    case "moderate":
      return TravelPace.Moderate;
    case "fast":
      return TravelPace.Fast;
    default:
      return TravelPace.Moderate;
  }
}

// User preferences from database (matches the stored structure)
export interface UserProfilePreferences {
  measurementUnit?: "metric" | "imperial";
  language?: string;
  theme?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
    tripReminders?: boolean;
    activityUpdates?: boolean;
  };
  privacy?: {
    profilePublic?: boolean;
    tripsPublic?: boolean;
    shareAnalytics?: boolean;
  };
  travel?: {
    preferredTransport?: string[];
    accommodationType?: string[];
    dietaryRestrictions?: string[];
    mobility?: string;
  };
}

export interface UserTravelPreferences {
  pace?: "slow" | "moderate" | "fast";
  accommodationType?: string[];
  transportPreferences?: string[];
  dietaryRestrictions?: string[];
  accessibility?: string;
}

export interface UserProfile {
  id: string;
  name?: string;
  onboardingCompleted: boolean;
  travelStyle?: string;
  interests?: string; // JSON string
  travelPreferences?: string; // JSON string
  preferences?: UserProfilePreferences;
}

// Default values when user has no preferences
export const DEFAULT_PREFERENCES = {
  pace: "moderate" as const,
  accommodationType: "mid-range" as const,
  transportation: "mixed" as const,
  accessibility: false,
  dietaryRestrictions: [],
  specialRequests: "",
  budget: {
    amount: 1500,
    currency: "USD", // Fixed to USD
    range: "per-person" as const,
  },
  interests: [],
  travelers: {
    adults: 2,
    children: 0,
    infants: 0,
  },
};

export class UserPreferencesService {
  /**
   * Fetch user profile and preferences from API
   */
  static async fetchUserProfile(): Promise<UserProfile | null> {
    try {
      const response = await fetch("/api/user/onboarding");
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - return null
          return null;
        }
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.warn("Could not fetch user preferences:", error);
      return null;
    }
  }

  /**
   * Transform user preferences into trip planning form defaults
   */
  static transformToTripDefaults(profile: UserProfile | null) {
    if (!profile) {
      return DEFAULT_PREFERENCES;
    }

    // Parse stored JSON preferences
    let travelPrefs: UserTravelPreferences = {};
    let interests: string[] = [];

    try {
      if (profile.travelPreferences) {
        travelPrefs = JSON.parse(profile.travelPreferences);
      }
      if (profile.interests) {
        interests = JSON.parse(profile.interests);
      }
    } catch (error) {
      console.warn("Error parsing user preferences:", error);
    }

    // Transform travel preferences to form format
    const transformedPreferences: TravelPreferences = {
      pace: travelPrefs.pace || DEFAULT_PREFERENCES.pace,
      accommodationType: this.transformAccommodationType(
        travelPrefs.accommodationType ||
          profile.preferences?.travel?.accommodationType
      ),
      transportation: this.transformTransportation(
        travelPrefs.transportPreferences ||
          profile.preferences?.travel?.preferredTransport
      ),
      // accessibility is trip-specific, not a user preference - always default to false
      accessibility: false,
      dietaryRestrictions:
        travelPrefs.dietaryRestrictions ||
        profile.preferences?.travel?.dietaryRestrictions ||
        DEFAULT_PREFERENCES.dietaryRestrictions,
      specialRequests: DEFAULT_PREFERENCES.specialRequests,
    };

    return {
      pace: transformedPreferences.pace,
      accommodationType: transformedPreferences.accommodationType,
      transportation: transformedPreferences.transportation,
      // accessibility is trip-specific, not a user preference - always default to false
      accessibility: false,
      dietaryRestrictions: transformedPreferences.dietaryRestrictions,
      specialRequests: transformedPreferences.specialRequests,
      budget: {
        amount: DEFAULT_PREFERENCES.budget.amount,
        currency: "USD", // Always USD
        range: DEFAULT_PREFERENCES.budget.range,
      },
      interests:
        interests.length > 0 ? interests : DEFAULT_PREFERENCES.interests,
      travelers: DEFAULT_PREFERENCES.travelers, // Keep default for travelers
      travelStyle: profile.travelStyle, // Pass through for AI generation
    };
  }

  /**
   * Transform accommodation type from array to single value
   */
  private static transformAccommodationType(
    accommodationTypes?: string[]
  ): TravelPreferences["accommodationType"] {
    if (!accommodationTypes || accommodationTypes.length === 0) {
      return DEFAULT_PREFERENCES.accommodationType;
    }

    // If user has multiple preferences, use "mixed"
    if (accommodationTypes.length > 1) {
      return "mixed";
    }

    // Map stored values to form values
    const type = accommodationTypes[0].toLowerCase();
    switch (type) {
      case "budget":
      case "hostel":
      case "budget hotel":
        return "budget";
      case "luxury":
      case "4-star":
      case "5-star":
      case "premium":
        return "luxury";
      case "mid-range":
      case "3-star":
      case "boutique":
        return "mid-range";
      case "mixed":
      case "variety":
        return "mixed";
      default:
        return "mid-range";
    }
  }

  /**
   * Transform transportation preferences from array to single value
   */
  private static transformTransportation(
    transportPrefs?: string[]
  ): TravelPreferences["transportation"] {
    if (!transportPrefs || transportPrefs.length === 0) {
      return DEFAULT_PREFERENCES.transportation;
    }

    // If user has multiple preferences, use "mixed"
    if (transportPrefs.length > 1) {
      return "mixed";
    }

    // Map stored values to form values
    const transport = transportPrefs[0].toLowerCase();
    switch (transport) {
      case "walking":
      case "walk":
      case "on foot":
        return "walking";
      case "public":
      case "public transport":
      case "bus":
      case "train":
      case "metro":
        return "public";
      case "rental-car":
      case "car":
      case "rental car":
      case "driving":
        return "rental-car";
      case "mixed":
      case "variety":
      case "combination":
        return "mixed";
      default:
        return "mixed";
    }
  }


  /**
   * Create enhanced form data for itinerary generation that includes user context
   */
  static createEnhancedFormData(formData: any, profile: UserProfile | null) {
    const baseData = { ...formData };

    if (!profile) {
      return baseData;
    }

    // Add user context for better AI generation
    const userContext = {
      travelStyle: profile.travelStyle,
      onboardingCompleted: profile.onboardingCompleted,
      preferredLanguage: profile.preferences?.language,
      currency: "USD", // Always USD
    };

    return {
      ...baseData,
      userContext,
      // Include user ID for personalization
      userId: profile.id,
    };
  }

}

// Export types for use in components
export type TripPlanningDefaults = ReturnType<
  typeof UserPreferencesService.transformToTripDefaults
>;
