"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Calendar,
  Sparkles,
  Plane,
} from "lucide-react";
// import { useForm } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"

import { DestinationAutocomplete } from "./destination-autocomplete";
import { DateRangePicker } from "./date-range-picker";
import { TravelerSelector, TravelerData } from "./traveler-selector";
import { BudgetSelector, BudgetData } from "./budget-selector";
import { InterestSelector } from "./interest-selector";
import { TravelPreferences } from "./travel-preferences";
import {
  useUserPreferences,
  useEnhancedFormData,
} from "@/hooks/use-user-preferences";

import {
  // tripPlanningFormSchema,
  validateStep,
  type TripPlanningFormData,
  type DestinationData,
  // type DateRangeData,
  type InterestCategories,
  type TravelPreferences as TravelPreferencesType,
} from "@/lib/trip-validation";

import {
  TransportationType,
  AccommodationType,
  TravelPace,
} from "@/types/travel-preferences";

import { mapStringToDietaryRestriction } from "@/lib/user-preferences-service";

function normalizePreferences(prefs: any) {
  return {
    pace: prefs.pace ? prefs.pace : TravelPace.Moderate,
    accommodationType: prefs.accommodationType
      ? prefs.accommodationType
      : AccommodationType.MidRange,
    transportation: prefs.transportation
      ? prefs.transportation
      : TransportationType.Mixed,
    dietaryRestrictions: (prefs.dietaryRestrictions || []).map(
      mapStringToDietaryRestriction
    ),
    accessibility: prefs.accessibility === true, // Only true if explicitly set, otherwise false
    specialRequests: prefs.specialRequests || "",
  };
}

// Form state types with optional dates for initialization
interface FormDateRangeData {
  startDate: Date | undefined;
  endDate: Date | undefined;
}
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  useErrorStateManager,
  useFormDataPreservation,
} from "@/lib/error-state-manager";
import { ErrorDisplay } from "@/components/ui/error-display";

interface FormStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isValid: boolean;
  isComplete: boolean;
}

interface TripPlanningFormProps {
  onComplete?: (data: TripPlanningFormData) => void;
  className?: string;
}

export function TripPlanningForm({
  onComplete,
  className,
}: TripPlanningFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);

  // Enhanced error handling
  const errorManager = useErrorStateManager();
  const [retryAttempts, setRetryAttempts] = useState(0);

  // User preferences integration
  const {
    preferences: userDefaults,
    isLoading: preferencesLoading,
    hasPreferences,
  } = useUserPreferences();
  const { createEnhancedFormData } = useEnhancedFormData();
  const [preferencesApplied, setPreferencesApplied] = useState(false);
  const [freshFormStart, setFreshFormStart] = useState(true); // Flag to prevent automatic restoration on fresh start

  // Form state - will be initialized with user preferences when available
  const [destination, setDestination] = useState<DestinationData>({
    destination: "",
    placeId: undefined,
  });
  const [dateRange, setDateRange] = useState<FormDateRangeData>({
    startDate: undefined,
    endDate: undefined,
  });
  const [travelers, setTravelers] = useState<TravelerData>({
    adults: 2,
    children: 0,
    infants: 0,
  });
  const [budget, setBudgetState] = useState<BudgetData>({
    amount: 1500,
    currency: "USD", // Fixed to USD
    range: "per-person",
  });

  // Custom budget setter
  const setBudget = (newBudget: BudgetData) => {
    // Always ensure currency is USD
    setBudgetState({
      ...newBudget,
      currency: "USD",
    });
  };

  const [interests, setInterests] = useState<InterestCategories>([]);
  const [preferences, setPreferences] = useState<TravelPreferencesType>({
    pace: TravelPace.Moderate,
    accommodationType: AccommodationType.MidRange,
    transportation: TransportationType.Mixed,
    accessibility: false,
    dietaryRestrictions: [],
    specialRequests: "",
  });

  // Remove currency tracking as we're now fixed to USD

  // Current form data for preservation
  const currentFormData = {
    destination,
    dateRange,
    travelers,
    budget,
    interests,
    preferences,
    currentStep,
  };

  // Form data preservation
  const { preserveFormData, restoreFormData, clearFormData } =
    useFormDataPreservation(currentFormData, errorManager);

  // Reset form to initial state while preserving user preferences
  const resetForm = useCallback(() => {
    // Clear localStorage and preserved data
    clearFormData();
    localStorage.removeItem("trip-planning-form");

    // Reset trip-specific selections to initial values
    setDestination({
      destination: "",
      placeId: undefined,
    });
    setDateRange({
      startDate: undefined,
      endDate: undefined,
    });
    setInterests([]);

    // Reset preferences to defaults but preserve user's personal settings
    const defaultPreferences = {
      pace: TravelPace.Moderate,
      accommodationType: AccommodationType.MidRange,
      transportation: TransportationType.Mixed,
      accessibility: false,
      dietaryRestrictions: (
        userDefaults?.preferences?.dietaryRestrictions || []
      ).map(mapStringToDietaryRestriction),
      specialRequests: "",
    };

    // Apply user's saved preferences if available, otherwise use defaults
    if (userDefaults) {
      if (userDefaults.travelers) setTravelers(userDefaults.travelers);
      if (userDefaults.budget) setBudgetState(userDefaults.budget);
      if (userDefaults && userDefaults.preferences) {
        // Apply user preferences but ensure accessibility always defaults to false (trip-specific)
        setPreferences(
          normalizePreferences({
            ...userDefaults.preferences,
            accessibility: false, // Always reset accessibility for new trips
          })
        );
      } else {
        setPreferences(defaultPreferences);
      }
    } else {
      // No user defaults, use standard defaults
      setTravelers({
        adults: 2,
        children: 0,
        infants: 0,
      });
      setBudgetState({
        amount: 1500,
        currency: "USD", // Always USD
        range: "per-person",
      });
      setPreferences(defaultPreferences);
    }

    // Reset step and other UI state
    setCurrentStep(0);
    setPreferencesApplied(false);
    setRetryAttempts(0);
    setFreshFormStart(true); // Mark as fresh start to prevent automatic restoration

    // Clear any errors
    errorManager.clearError();
  }, [userDefaults, clearFormData, errorManager]);

  // Reset form on component mount - but wait for user preferences to load
  useEffect(() => {
    if (!preferencesLoading) {
      resetForm();
    }
  }, [preferencesLoading, resetForm]); // Reset when preferences finish loading

  // Apply user preferences as defaults (only once, when available)
  useEffect(() => {
    if (!preferencesLoading && userDefaults && !preferencesApplied) {
      // Only apply defaults if no saved form data exists
      const hasSavedData = localStorage.getItem("trip-planning-form");

      if (!hasSavedData) {
        // Apply preferences defaults
        if (userDefaults.travelers) setTravelers(userDefaults.travelers);

        // Apply budget amount from user preferences but keep currency as USD
        if (userDefaults.budget) {
          setBudgetState({
            amount: userDefaults.budget.amount,
            currency: "USD", // Always USD
            range: userDefaults.budget.range,
          });
        }

        if (userDefaults.interests && userDefaults.interests.length > 0) {
          setInterests(userDefaults.interests);
        }

        // Apply travel preferences with type safety
        // Note: accessibility is trip-specific and should not be loaded from user preferences
        setPreferences((prev) =>
          normalizePreferences({
            pace: userDefaults.pace,
            accommodationType: userDefaults.accommodationType,
            transportation: userDefaults.transportation,
            dietaryRestrictions: userDefaults.dietaryRestrictions,
            specialRequests: userDefaults.specialRequests,
            // accessibility is always trip-specific, keep current form value (defaults to false)
            accessibility: prev.accessibility,
          })
        );

        setPreferencesApplied(true);
      }
    }
  }, [preferencesLoading, userDefaults, preferencesApplied]);

  // Ensure currency is always USD (cleanup effect)
  useEffect(() => {
    if (!preferencesLoading) {
      setBudgetState((prev) => {
        if (prev.currency !== "USD") {
          return {
            ...prev,
            currency: "USD",
          };
        }
        return prev;
      });
    }
  }, [preferencesLoading]);

  // Load saved form data from localStorage or error state (only if not a fresh start)
  useEffect(() => {
    // Skip restoration if this is a fresh form start
    if (freshFormStart) {
      setFreshFormStart(false); // Allow future restorations after the first load
      return;
    }

    try {
      // First check for preserved error state data
      const preservedData = restoreFormData();
      if (preservedData) {
        setDestination(preservedData.destination);
        setDateRange({
          startDate: preservedData.dateRange.startDate
            ? new Date(preservedData.dateRange.startDate)
            : undefined,
          endDate: preservedData.dateRange.endDate
            ? new Date(preservedData.dateRange.endDate)
            : undefined,
        });
        setTravelers(preservedData.travelers);
        setBudgetState({
          ...preservedData.budget,
          currency: "USD", // Always ensure USD
        });
        setInterests(preservedData.interests);
        setPreferences(preservedData.preferences);
        if (preservedData.currentStep !== undefined)
          setCurrentStep(preservedData.currentStep);
        return;
      }

      // Fallback to regular localStorage
      const saved = localStorage.getItem("trip-planning-form");
      if (saved) {
        const data = JSON.parse(saved);
        setDestination(data.destination);
        setDateRange({
          startDate: data.dateRange.startDate
            ? new Date(data.dateRange.startDate)
            : undefined,
          endDate: data.dateRange.endDate
            ? new Date(data.dateRange.endDate)
            : undefined,
        });
        setTravelers(data.travelers);
        setBudgetState({
          ...data.budget,
          currency: "USD", // Always ensure USD
        });
        setInterests(data.interests);
        if (data.preferences) {
          // Ensure accessibility always defaults to false unless explicitly user-set
          const normalizedPrefs = normalizePreferences(data.preferences);
          setPreferences(normalizedPrefs);
        }
        if (data.currentStep) setCurrentStep(data.currentStep);
      }
    } catch (error) {
      console.error("Failed to load saved form data:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshFormStart]); // Only depend on freshFormStart to run once after initialization

  // Save form data to localStorage
  useEffect(() => {
    const formData = {
      destination,
      dateRange: {
        startDate: dateRange.startDate?.toISOString(),
        endDate: dateRange.endDate?.toISOString(),
      },
      travelers,
      budget,
      interests,
      preferences,
      currentStep,
    };
    localStorage.setItem("trip-planning-form", JSON.stringify(formData));
  }, [
    destination,
    dateRange,
    travelers,
    budget,
    interests,
    preferences,
    currentStep,
  ]);

  // Validation state for each step
  const getStepValidation = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return validateStep("destination", { destination });
      case 1:
        // Convert to the required format for validation
        const dateRangeForValidation =
          dateRange.startDate && dateRange.endDate
            ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
            : null;
        return dateRangeForValidation
          ? validateStep("dates", { dateRange: dateRangeForValidation })
          : { success: false, errors: null };
      case 2:
        return validateStep("travelers", { travelers });
      case 3:
        return validateStep("budget", { budget });
      case 4:
        return validateStep("interests", { interests });
      case 5:
        return validateStep("preferences", { preferences });
      default:
        return { success: false, errors: null };
    }
  };

  // Form steps configuration
  const steps: FormStep[] = [
    {
      id: "destination",
      title: "Where to?",
      description: "Choose your dream destination",
      component: (
        <div className="space-y-6">
          <div>
            <label className="text-lg font-medium text-gray-900 block mb-4">
              Where would you like to travel?
            </label>
            <DestinationAutocomplete
              value={destination.destination}
              onChange={(value, placeId) =>
                setDestination({ destination: value, placeId })
              }
              placeholder="Search for cities, countries, or landmarks..."
              className="text-lg"
            />
          </div>
        </div>
      ),
      isValid: getStepValidation(0).success,
      isComplete: destination.destination.length > 0,
    },
    {
      id: "dates",
      title: "When?",
      description: "Pick your travel dates",
      component: (
        <div className="space-y-6">
          <div>
            <label className="text-lg font-medium text-gray-900 block mb-4">
              When do you want to travel?
            </label>
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(startDate, endDate) =>
                setDateRange({ startDate, endDate })
              }
              minDate={new Date()} // Prevent selecting past dates
              className="text-lg"
              error={
                !dateRange.startDate || !dateRange.endDate || !getStepValidation(1).success
              }
              errorMessage={
                !dateRange.startDate
                  ? "Please select a start date"
                  : !dateRange.endDate
                  ? "Please select an end date"
                  : getStepValidation(1).errors?.[0]?.message || undefined
              }
            />
          </div>
        </div>
      ),
      isValid: getStepValidation(1).success,
      isComplete:
        dateRange.startDate !== undefined && dateRange.endDate !== undefined,
    },
    {
      id: "travelers",
      title: "Who's going?",
      description: "Tell us about your travel group",
      component: (
        <div className="space-y-6">
          <div>
            <label className="text-lg font-medium text-gray-900 block mb-4">
              How many travelers?
            </label>
            <TravelerSelector
              value={travelers}
              onChange={setTravelers}
              className="text-lg"
            />
          </div>
        </div>
      ),
      isValid: getStepValidation(2).success,
      isComplete: travelers.adults > 0,
    },
    {
      id: "budget",
      title: "What's your budget?",
      description: "Set your travel budget",
      component: (
        <div className="space-y-6">
          <div>
            <label className="text-lg font-medium text-gray-900 block mb-4">
              What&apos;s your budget for this trip?
            </label>
            <BudgetSelector
              value={budget}
              onChange={setBudget}
              className="text-lg"
            />
          </div>
        </div>
      ),
      isValid: getStepValidation(3).success,
      isComplete: budget.amount > 0,
    },
    {
      id: "interests",
      title: "What interests you?",
      description: "Choose your travel interests",
      component: (
        <InterestSelector
          selectedInterests={interests}
          onChange={setInterests}
        />
      ),
      isValid: getStepValidation(4).success,
      isComplete: interests.length > 0,
    },
    {
      id: "preferences",
      title: "Travel preferences",
      description: "Customize your travel style",
      component: (
        <>
          <TravelPreferences value={preferences} onChange={setPreferences} />
        </>
      ),
      isValid: getStepValidation(5).success,
      isComplete: true, // Preferences have defaults, so always complete
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Enhanced validation for the final step to ensure all required data is present
  const isFormCompletelyValid = isLastStep
    ? currentStepData.isValid &&
      destination.destination.length > 0 &&
      dateRange.startDate !== undefined &&
      dateRange.endDate !== undefined &&
      travelers.adults > 0 &&
      budget.amount > 0 &&
      interests.length > 0
    : currentStepData.isValid;

  const canProceed = isFormCompletelyValid;
  const canGoBack = currentStep > 0;

  // Handle next step
  const handleNext = () => {
    if (canProceed && !isLastStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (canGoBack) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Loading steps for progress indication
  const loadingSteps = [
    {
      id: 0,
      title: "Processing your preferences",
      icon: Sparkles,
      duration: 2000,
    },
    {
      id: 1,
      title: "Finding amazing destinations",
      icon: MapPin,
      duration: 3000,
    },
    {
      id: 2,
      title: "Optimizing your travel dates",
      icon: Calendar,
      duration: 2500,
    },
    {
      id: 3,
      title: "Crafting your perfect itinerary",
      icon: Plane,
      duration: 4000,
    },
    { id: 4, title: "Adding final touches", icon: Check, duration: 1500 },
  ];

  // Animated status messages for final touches
  const finalTouchMessages = [
    "Packing your bags...",
    "Checking weather...",
    "Booking hidden gems...",
    "Finalizing details...",
    "Securing best deals...",
  ];
  const [finalTouchMsgIdx, setFinalTouchMsgIdx] = useState(0);
  useEffect(() => {
    let msgInterval: NodeJS.Timeout | undefined;
    if (isSubmitting && currentLoadingStep === loadingSteps.length - 1) {
      msgInterval = setInterval(() => {
        setFinalTouchMsgIdx((idx) => (idx + 1) % finalTouchMessages.length);
      }, 1200);
    } else {
      setFinalTouchMsgIdx(0);
    }
    return () => {
      if (msgInterval) clearInterval(msgInterval);
    };
  }, [isSubmitting, currentLoadingStep, finalTouchMessages.length, loadingSteps.length]);
  const handleSubmit = useCallback(async () => {
    if (!currentStepData.isValid) return;

    setIsSubmitting(true);
    errorManager.clearError();
    setCurrentLoadingStep(0);

    // Preserve form data before attempting submission
    preserveFormData();

    // Sequentially advance through loading steps using their durations
    let stepIndex = 0;
    function advanceStep() {
      if (stepIndex < loadingSteps.length - 1) {
        setTimeout(() => {
          setCurrentLoadingStep(++stepIndex);
          advanceStep();
        }, loadingSteps[stepIndex].duration);
      }
    }
    advanceStep();

    try {
      // Additional safety check - this should already be validated by step validation
      if (!dateRange.startDate || !dateRange.endDate) {
        // Don't throw a validation error immediately, instead gracefully handle it
        console.error(
          "Date validation failed during submission - this indicates a form state issue"
        );
        errorManager.clearError();
        setCurrentStep(1); // Go back to date selection step
        setIsSubmitting(false);
        // Removed: clearInterval(progressInterval); (no longer needed)
        return;
      }

      const formData: TripPlanningFormData = {
        destination,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        travelers,
        budget,
        interests,
        preferences,
      };

      // Create enhanced form data with user context for better AI personalization
      const enhancedFormData = createEnhancedFormData(formData);

      // Calculate total budget based on range type
      const totalTravelers =
        travelers.adults + travelers.children + travelers.infants;
      const totalBudget =
        budget.range === "per-person"
          ? budget.amount * totalTravelers
          : budget.amount;

      // Create trip via API with enhanced data
      const response = (await apiClient.createTrip({
        title: `Trip to ${destination.destination}`,
        destination: destination.destination,
        startDate: dateRange.startDate!.toISOString(),
        endDate: dateRange.endDate!.toISOString(),
        budget: totalBudget,
        currency: "USD", // Always USD
        travelers: totalTravelers,
        generateItinerary: true, // Enable itinerary generation
        interests,
        accommodationType: preferences.accommodationType,
        // Include user context and enhanced data for AI personalization
        ...enhancedFormData.userContext,
        preferences: enhancedFormData.preferences || preferences,
      })) as { trip: { id: string } };

      // Removed: clearInterval(progressInterval); (no longer needed)

      // Clear saved form data on success
      localStorage.removeItem("trip-planning-form");
      clearFormData();

      // Call completion handler or redirect to trip details
      if (onComplete) {
        onComplete(formData);
      } else {
        // Redirect to trip details without alert
        router.push(`/trip/${response.trip.id}`);
      }
    } catch (error) {
      // Removed: clearInterval(progressInterval); (no longer needed)
      console.error("Trip creation failed:", error);

      // Determine context for better error categorization
      let context = "trip_creation";
      let userFriendlyMessage = "Failed to create trip";

      if (error instanceof Error) {
        // Check for ApiClientError with details
        const apiError = error as any;

        // Handle specific validation errors
        if (apiError.status === 409) {
          // 409 Conflict - Date overlap error
          context = "dates";

          if (apiError.details && Array.isArray(apiError.details) && apiError.details.length > 0) {
            // Use the first error detail which should be the formatted overlap message
            const overlapMessage = apiError.details[0];
            userFriendlyMessage = overlapMessage;

            // If there are overlapping trips details, extract them
            if (apiError.overlappingTrips && apiError.overlappingTrips.length > 0) {
              const tripsList = apiError.overlappingTrips
                .map((trip: any) => `"${trip.title}" to ${trip.destination}`)
                .join(", ");

              userFriendlyMessage += `\n\nConflicting trip(s): ${tripsList}`;

              // Add suggested dates if available
              if (apiError.suggestedDates && apiError.suggestedDates.length > 0) {
                const suggestions = apiError.suggestedDates
                  .map((suggestion: any, index: number) =>
                    `${index + 1}. ${new Date(suggestion.startDate).toLocaleDateString()} - ${new Date(suggestion.endDate).toLocaleDateString()}`
                  )
                  .join("\n");

                userFriendlyMessage += `\n\nSuggested alternative dates:\n${suggestions}`;
              }
            }
          } else {
            userFriendlyMessage = "Your trip dates overlap with an existing trip. Please choose different dates.";
          }
        } else if (apiError.status === 400) {
          // 400 Bad Request - Validation errors
          context = "validation";

          // Check for specific validation messages
          if (apiError.message.includes("past")) {
            context = "dates";
            userFriendlyMessage = "Trip cannot start in the past. Please select today or a future date.";
          } else if (apiError.message.includes("End date must be after start date")) {
            context = "dates";
            userFriendlyMessage = "End date must be after start date. Please adjust your dates.";
          } else if (apiError.message.includes("more than 2 years")) {
            context = "dates";
            userFriendlyMessage = "Trip cannot be planned more than 2 years in advance. Please choose dates within the next 2 years.";
          } else if (apiError.details && Array.isArray(apiError.details)) {
            // Handle Zod validation errors
            const validationMessages = apiError.details
              .map((detail: any) => detail.message || detail)
              .join(". ");
            userFriendlyMessage = validationMessages;
          } else {
            userFriendlyMessage = apiError.message || "Invalid trip data. Please check your inputs.";
          }
        } else {
          // Handle other errors
          if (error.message.includes("destination")) {
            context = "destination";
            userFriendlyMessage = "There's an issue with the destination. Please check and try again.";
          } else if (error.message.includes("date")) {
            context = "dates";
            userFriendlyMessage = "There's an issue with the dates you selected. Please choose different dates.";
          } else {
            userFriendlyMessage = error.message || "Failed to create trip. Please try again.";
          }
        }
      }

      // Create a new error with the user-friendly message
      const displayError = new Error(userFriendlyMessage);

      // Show categorized error with form data preserved
      errorManager.showError(
        displayError,
        context,
        currentFormData
      );

      setRetryAttempts((prev) => prev + 1);
    } finally {
      setIsSubmitting(false);
      setCurrentLoadingStep(0);
    }
  }, [
    currentStepData,
    errorManager,
    preserveFormData,
    setCurrentLoadingStep,
    dateRange,
    destination,
    travelers,
    budget,
    interests,
    preferences,
    createEnhancedFormData,
    onComplete,
    router,
    clearFormData,
    setRetryAttempts,
    currentFormData
  ]);

  // Set up retry handler for error manager
  useEffect(() => {
    errorManager.setRetryHandler(async () => {
      await handleSubmit();
    });
  }, [currentFormData, errorManager, handleSubmit]);

  // Handle error actions
  const handleErrorAction = (action: any) => {
    switch (action.type) {
      case "retry":
        handleSubmit();
        break;
      case "modify":
        // Allow user to modify trip details
        errorManager.dismissError();
        break;
      case "navigate":
        if (action.url) {
          router.push(action.url);
        }
        break;
      case "contact":
        // Could integrate with support system
        console.log("Contact support requested");
        break;
      case "dismiss":
        errorManager.dismissError();
        break;
    }
  };

  return (
    <div className={cn("max-w-4xl mx-auto relative", className)}>
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          {/* Removed animated cloud ovals for cleaner look */}
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl relative z-10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Creating Your Perfect Trip
              </h3>
              <p className="text-gray-600 text-sm">
                Our AI is crafting a personalized itinerary just for you
              </p>
            </div>

            {/* Progress Steps */}
            <div className="space-y-4">
              {loadingSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentLoadingStep;
                const isCompleted = index < currentLoadingStep;
                // For last step, show animated loader and cycling message
                return (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                        isCompleted
                          ? "bg-green-100 text-green-600"
                          : isActive
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : isActive && index === loadingSteps.length - 1 ? (
                        <svg
                          className="animate-spin w-4 h-4 text-blue-600"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                      ) : (
                        <Icon
                          className={cn("w-4 h-4", isActive && "animate-pulse")}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium transition-colors duration-300",
                          isCompleted
                            ? "text-green-600"
                            : isActive
                            ? "text-blue-600"
                            : "text-gray-400"
                        )}
                      >
                        {isActive && index === loadingSteps.length - 1
                          ? finalTouchMessages[finalTouchMsgIdx]
                          : step.title}
                      </p>
                    </div>
                    {isActive && index !== loadingSteps.length - 1 && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse delay-100"></div>
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse delay-200"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Progress</span>
                <span>
                  {currentLoadingStep === loadingSteps.length - 1
                    ? "100%"
                    : `${Math.min(
                        99,
                        Math.round(
                          ((currentLoadingStep + 1) / loadingSteps.length) * 100
                        )
                      )}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width:
                      currentLoadingStep === loadingSteps.length - 1
                        ? "100%"
                        : `${Math.min(
                            99,
                            ((currentLoadingStep + 1) / loadingSteps.length) *
                              100
                          )}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                This may take a few moments while we create something amazing
                for you
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="text-sm text-gray-500">
            {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center space-y-2 cursor-pointer",
                index <= currentStep ? "text-blue-600" : "text-gray-400"
              )}
              onClick={() => index < currentStep && setCurrentStep(index)}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                  index < currentStep
                    ? "bg-blue-600 border-blue-600 text-white"
                    : index === currentStep
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-gray-300 text-gray-400 bg-white"
                )}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs font-medium hidden sm:block">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current step content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600">{currentStepData.description}</p>

          {/* User preferences indicator */}
          {hasPreferences && preferencesApplied && currentStep >= 2 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800 text-sm">
                <Check className="h-4 w-4" />
                <span className="font-medium">Smart defaults applied</span>
              </div>
              <p className="text-blue-700 text-xs mt-1">
                We&apos;ve pre-filled some options based on your preferences. You can
                modify them anytime.
              </p>
            </div>
          )}
        </div>

        <div className="mb-8">{currentStepData.component}</div>

        {/* Enhanced Error Display */}
        {errorManager.errorState.isVisible && errorManager.errorState.error && (
          <div className="mb-6">
            <ErrorDisplay
              error={errorManager.errorState.error}
              onAction={handleErrorAction}
              onDismiss={
                errorManager.errorState.isDismissible
                  ? errorManager.dismissError
                  : undefined
              }
              showTechnicalDetails={retryAttempts >= 2}
            />
          </div>
        )}

        {/* Step validation errors */}
        {!currentStepData.isValid &&
          currentStepData.isComplete &&
          !errorManager.errorState.isVisible && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="text-blue-800 text-sm">
                <div className="font-medium mb-2">
                  Please complete these details:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {getStepValidation(currentStep).errors?.map(
                    (error, index) => (
                      <li key={index}>{error.message}</li>
                    )
                  )}
                </ul>
              </div>
            </div>
          )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoBack}
            className={cn(
              "flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors",
              canGoBack
                ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                : "text-gray-400 bg-gray-50 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
              className={cn(
                "flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors",
                canProceed && !isSubmitting
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Trip...</span>
                </>
              ) : (
                <>
                  <span>Create Trip</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors",
                canProceed
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
