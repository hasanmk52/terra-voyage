"use client";

import { useState, useEffect } from "react";
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
  DietaryRestriction,
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
import { categorizeError } from "@/lib/error-service";

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
    currency: "USD", // Will be updated from user preferences
    range: "per-person",
  });

  // Custom budget setter that tracks user currency changes
  const setBudget = (newBudget: BudgetData) => {
    // Check if the currency is being changed by comparing with current state
    if (newBudget.currency !== budget.currency) {
      setUserModifiedCurrency(true);
    }
    setBudgetState(newBudget);
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

  // Track whether user has manually changed the currency
  const [hasInitialCurrencySync, setHasInitialCurrencySync] = useState(false);
  const [userModifiedCurrency, setUserModifiedCurrency] = useState(false);

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
  const resetForm = () => {
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
        setPreferences(normalizePreferences({
          ...userDefaults.preferences,
          accessibility: false, // Always reset accessibility for new trips
        }));
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
        currency: userDefaults?.budget?.currency || "USD",
        range: "per-person",
      });
      setPreferences(defaultPreferences);
    }

    // Reset step and other UI state
    setCurrentStep(0);
    setPreferencesApplied(false);
    setRetryAttempts(0);
    setFreshFormStart(true); // Mark as fresh start to prevent automatic restoration
    setHasInitialCurrencySync(false);
    setUserModifiedCurrency(false);

    // Clear any errors
    errorManager.clearError();
  };

  // Reset form on component mount - but wait for user preferences to load
  useEffect(() => {
    if (!preferencesLoading) {
      resetForm();
    }
  }, [preferencesLoading]); // Reset when preferences finish loading

  // Apply user preferences as defaults (only once, when available)
  useEffect(() => {
    if (!preferencesLoading && userDefaults && !preferencesApplied) {
      // Only apply defaults if no saved form data exists
      const hasSavedData = localStorage.getItem("trip-planning-form");

      if (!hasSavedData) {
        // Apply preferences defaults
        if (userDefaults.travelers) setTravelers(userDefaults.travelers);
        
        // For budget, only apply if user hasn't made any changes yet
        if (userDefaults.budget && !hasInitialCurrencySync) {
          setBudgetState(userDefaults.budget);
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
  }, [preferencesLoading, userDefaults, preferencesApplied, hasInitialCurrencySync]);

  useEffect(() => {
    if (!preferencesLoading && userDefaults?.budget?.currency && !hasInitialCurrencySync && !userModifiedCurrency) {
      setBudgetState(prev => ({
        ...prev,
        currency: userDefaults.budget.currency
      }));
      setHasInitialCurrencySync(true);
    }
  }, [preferencesLoading, hasInitialCurrencySync, userModifiedCurrency]);

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
        setBudgetState(preservedData.budget);
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
        setBudgetState(data.budget);
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
  }, []);

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
              className="text-lg"
              error={
                !getStepValidation(1).success &&
                (dateRange.startDate !== undefined ||
                  dateRange.endDate !== undefined)
              }
              errorMessage={
                !dateRange.startDate
                  ? "Please select a start date"
                  : !dateRange.endDate
                  ? "Please select an end date"
                  : getStepValidation(1).errors?.[0]?.message
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

  // Handle form submission with enhanced error handling
  const handleSubmit = async () => {
    if (!currentStepData.isValid) return;

    setIsSubmitting(true);
    errorManager.clearError();
    setCurrentLoadingStep(0);

    // Preserve form data before attempting submission
    preserveFormData();

    // Simulate progress through loading steps
    const progressInterval = setInterval(() => {
      setCurrentLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500); // Average step duration

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
        clearInterval(progressInterval);
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
        currency: budget.currency, // Include user's selected currency
        travelers: totalTravelers,
        generateItinerary: true, // Enable itinerary generation
        interests,
        accommodationType: preferences.accommodationType,
        // Include user context and enhanced data for AI personalization
        ...enhancedFormData.userContext,
        preferences: enhancedFormData.preferences || preferences,
      })) as { trip: { id: string } };

      clearInterval(progressInterval);

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
      clearInterval(progressInterval);
      console.error("Trip creation failed:", error);

      // Determine context for better error categorization
      let context = "trip_creation";
      if (error instanceof Error) {
        if (error.message.includes("destination")) context = "destination";
        if (error.message.includes("date")) context = "dates";
        if (error.message.includes("validation")) context = "validation";
      }

      // Show categorized error with form data preserved
      errorManager.showError(
        error instanceof Error ? error : "Failed to create trip",
        context,
        currentFormData
      );
      setRetryAttempts((prev) => prev + 1);
    } finally {
      setIsSubmitting(false);
      setCurrentLoadingStep(0);
    }
  };

  // Set up retry handler for error manager
  useEffect(() => {
    errorManager.setRetryHandler(async () => {
      await handleSubmit();
    });
  }, [currentFormData]);

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
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
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
                        {step.title}
                      </p>
                    </div>
                    {isActive && (
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
                  {Math.round(
                    ((currentLoadingStep + 1) / loadingSteps.length) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      ((currentLoadingStep + 1) / loadingSteps.length) * 100
                    }%`,
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
                We've pre-filled some options based on your preferences. You can
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
