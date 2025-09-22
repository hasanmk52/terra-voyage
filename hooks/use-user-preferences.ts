/**
 * React hook for loading and caching user preferences
 * Integrates with trip planning form to provide smart defaults
 */

import { useState, useEffect } from 'react'
import { UserPreferencesService, type TripPlanningDefaults, type UserProfile } from '@/lib/user-preferences-service'

interface UseUserPreferencesState {
  preferences: TripPlanningDefaults | null
  userProfile: UserProfile | null
  isLoading: boolean
  error: string | null
  hasPreferences: boolean
}

interface UseUserPreferencesActions {
  refetchPreferences: () => Promise<void>
  clearCache: () => void
}

type UseUserPreferencesReturn = UseUserPreferencesState & UseUserPreferencesActions

/**
 * Hook to load user preferences and provide trip planning defaults
 * Handles caching, error states, and loading states
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const [state, setState] = useState<UseUserPreferencesState>({
    preferences: null,
    userProfile: null,
    isLoading: true,
    error: null,
    hasPreferences: false,
  })

  // Load preferences on mount
  const loadPreferences = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const userProfile = await UserPreferencesService.fetchUserProfile()
      const preferences = UserPreferencesService.transformToTripDefaults(userProfile)
      
      setState({
        preferences,
        userProfile,
        isLoading: false,
        error: null,
        hasPreferences: userProfile?.onboardingCompleted === true,
      })
    } catch (error) {
      console.warn('Failed to load user preferences:', error)
      
      // Fall back to defaults on error
      const defaultPreferences = UserPreferencesService.transformToTripDefaults(null)
      
      setState({
        preferences: defaultPreferences,
        userProfile: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load preferences',
        hasPreferences: false,
      })
    }
  }

  // Refetch preferences (useful after profile updates)
  const refetchPreferences = async () => {
    await loadPreferences()
  }

  // Clear cached preferences
  const clearCache = () => {
    setState({
      preferences: null,
      userProfile: null,
      isLoading: false,
      error: null,
      hasPreferences: false,
    })
  }

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  return {
    ...state,
    refetchPreferences,
    clearCache,
  }
}

/**
 * Helper hook that provides enhanced form data for itinerary generation
 * Combines form data with user context for better AI personalization
 */
export function useEnhancedFormData() {
  const { userProfile } = useUserPreferences()

  const createEnhancedFormData = (formData: any) => {
    return UserPreferencesService.createEnhancedFormData(formData, userProfile)
  }

  return {
    createEnhancedFormData,
    userProfile,
    hasUserContext: !!userProfile,
  }
}

/**
 * Hook for components that need to know if user has completed preferences
 * Useful for showing preference completion prompts
 */
export function usePreferenceStatus() {
  const { hasPreferences, userProfile, isLoading } = useUserPreferences()

  return {
    hasPreferences,
    needsOnboarding: !isLoading && !hasPreferences,
    isOnboardingComplete: userProfile?.onboardingCompleted === true,
    isLoading,
  }
}