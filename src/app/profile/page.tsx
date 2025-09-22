"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import {
  User,
  Camera,
  MapPin,
  Phone,
  Calendar,
  Mail,
  Edit,
  Save,
  X,
  Upload,
  Search,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { googlePlaces, PlaceResult } from "@/lib/google-places";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  profilePicture: string | null; // Base64 encoded image or blob URL
  onboardingCompleted: boolean;
  createdAt: Date;
  _count?: {
    trips: number;
  };
}

function ProfileContent() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location autocomplete state
  const [citySuggestions, setCitySuggestions] = useState<PlaceResult[]>([]);
  const [countrySuggestions, setCountrySuggestions] = useState<PlaceResult[]>(
    []
  );
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    city: "",
    country: "",
    phone: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    if (!session?.user?.id) return;

    // 1) Instant optimistic render from session to avoid blocking UI
    const sUser = session.user as any;
    const optimistic: UserProfile = {
      id: sUser.id,
      name: sUser.name || null,
      email: sUser.email || null,
      image: sUser.image || null,
      bio: null,
      city: null,
      country: null,
      phone: null,
      dateOfBirth: null,
      profilePicture: null,
      onboardingCompleted: !!sUser.onboardingCompleted,
      createdAt: new Date(),
      _count: { trips: 0 },
    };
    setProfile((prev) => prev ?? optimistic);
    setFormData((prev) => ({
      name: sUser.name || prev.name || "",
      bio: prev.bio || "",
      city: prev.city || "",
      country: prev.country || "",
      phone: prev.phone || "",
      dateOfBirth: prev.dateOfBirth || "",
    }));
    setIsLoading(false);

    // 2) Background hydrate from API for freshest data
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/user/profile`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const profileData: UserProfile = {
              id: result.data.id,
              name: result.data.name || null,
              email: result.data.email || null,
              image: result.data.image || null,
              bio: result.data.bio || null,
              city: result.data.city || null,
              country: result.data.country || null,
              phone: result.data.phone || null,
              dateOfBirth: result.data.dateOfBirth
                ? new Date(result.data.dateOfBirth).toISOString().split("T")[0]
                : null,
              profilePicture: result.data.profilePicture || null,
              onboardingCompleted: result.data.onboardingCompleted || false,
              createdAt: new Date(result.data.createdAt),
              _count: result.data._count,
            };
            setProfile(profileData);
            setFormData({
              name: profileData.name || "",
              bio: profileData.bio || "",
              city: profileData.city || "",
              country: profileData.country || "",
              phone: profileData.phone || "",
              dateOfBirth: profileData.dateOfBirth || "",
            });
          }
        }
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          console.error("Failed to load user profile:", error);
        }
      }
    })();

    return () => controller.abort();
  }, [session?.user?.id]);

  // Validation functions
  const validateDateOfBirth = (dateString: string): string | null => {
    if (!dateString) return null;
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    const fourteenYearsAgo = new Date();
    fourteenYearsAgo.setFullYear(today.getFullYear() - 14);
    
    if (selectedDate > today) {
      return "Date of birth cannot be in the future";
    }
    
    if (selectedDate > fourteenYearsAgo) {
      return "You must be at least 14 years old";
    }
    
    return null;
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Validate date of birth
    if (formData.dateOfBirth) {
      const dobError = validateDateOfBirth(formData.dateOfBirth);
      if (dobError) {
        errors.dateOfBirth = dobError;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }

    // If country is being changed, clear city and its suggestions
    if (field === "country") {
      setFormData((prev) => ({ ...prev, city: "" }));
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  // Location search functions with debouncing
  const searchCities = async (query: string) => {
    if (query.length < 2 || !formData.country) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }

    // Clear previous timeout
    if ((window as any).citySearchTimeout) {
      clearTimeout((window as any).citySearchTimeout);
    }

    // Set new timeout for debouncing
    (window as any).citySearchTimeout = setTimeout(async () => {
      setIsLoadingCity(true);
      try {
        // Search for cities within the selected country
        const searchQuery = `${query} city in ${formData.country}`;
        const results = await googlePlaces.searchDestinations(searchQuery);
        // Filter for cities (locality type) and ensure they're in the selected country
        const cityResults = results.filter(
          (place) =>
            (place.types.includes("locality") ||
              place.types.includes("administrative_area_level_1")) &&
            (place.secondaryText
              .toLowerCase()
              .includes(formData.country.toLowerCase()) ||
              place.description
                .toLowerCase()
                .includes(formData.country.toLowerCase()))
        );
        setCitySuggestions(cityResults);
        setShowCitySuggestions(true);
      } catch (error) {
        console.error("Error searching cities:", error);
        setCitySuggestions([]);
      } finally {
        setIsLoadingCity(false);
      }
    }, 300); // 300ms delay
  };

  const searchCountries = async (query: string) => {
    if (query.length < 2) {
      setCountrySuggestions([]);
      setShowCountrySuggestions(false);
      return;
    }

    // Clear previous timeout
    if ((window as any).countrySearchTimeout) {
      clearTimeout((window as any).countrySearchTimeout);
    }

    // Set new timeout for debouncing
    (window as any).countrySearchTimeout = setTimeout(async () => {
      setIsLoadingCountry(true);
      try {
        // Search specifically for countries using the dedicated method
        const countryResults = await googlePlaces.searchCountries(query);
        setCountrySuggestions(countryResults);
        setShowCountrySuggestions(true);
      } catch (error) {
        console.error("Error searching countries:", error);
        setCountrySuggestions([]);
      } finally {
        setIsLoadingCountry(false);
      }
    }, 300); // 300ms delay
  };

  const selectCity = (city: PlaceResult) => {
    setFormData((prev) => ({ ...prev, city: city.mainText }));
    setShowCitySuggestions(false);
    setCitySuggestions([]);
  };

  const selectCountry = (country: PlaceResult) => {
    setFormData((prev) => ({
      ...prev,
      country: country.mainText,
      city: "", // Clear city when country changes
    }));
    setShowCountrySuggestions(false);
    setCountrySuggestions([]);
    // Clear city suggestions since country changed
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".location-input")) {
        setShowCitySuggestions(false);
        setShowCountrySuggestions(false);
        setCitySuggestions([]);
        setCountrySuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close suggestions when pressing Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCitySuggestions(false);
        setShowCountrySuggestions(false);
        setCitySuggestions([]);
        setCountrySuggestions([]);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if ((window as any).citySearchTimeout) {
        clearTimeout((window as any).citySearchTimeout);
      }
      if ((window as any).countrySearchTimeout) {
        clearTimeout((window as any).countrySearchTimeout);
      }
    };
  }, []);

  const handleSaveProfile = async () => {
    // Validate form before saving
    if (!validateForm()) {
      return;
    }

    setSaveStatus({ type: null, message: '' });

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  ...formData,
                  dateOfBirth: formData.dateOfBirth || null,
                }
              : null
          );
          setIsEditing(false);
          
          // Show success message
          setSaveStatus({ 
            type: 'success', 
            message: 'Your profile has been updated successfully!' 
          });
          // Auto-hide success message after 5 seconds
          setTimeout(() => {
            setSaveStatus({ type: null, message: '' });
          }, 5000);

          // Update session with new name
          await update({
            name: formData.name,
          });

          console.log("✅ Profile updated successfully");
        }
      } else {
        let message = "Failed to update profile";
        try {
          const err = await response.json();
          message = err?.error || message;
        } catch {}
        console.error(message);
        setSaveStatus({ 
          type: 'error', 
          message: `${message}. Please try again.` 
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to update profile. Please check your connection and try again.' 
      });
    }
  };

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 2MB for security)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB");
      return;
    }

    setIsUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await fetch("/api/user/profile/picture", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Create a blob URL for immediate display
          const imageUrl = URL.createObjectURL(file);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  profilePicture: imageUrl,
                }
              : null
          );

          console.log("✅ Profile picture updated successfully");
        }
      } else {
        console.error("Failed to upload profile picture");
        alert("Failed to upload profile picture. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-6">
                <div className="w-32 h-32 bg-gray-300 rounded-full"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-gray-300 rounded w-64"></div>
                  <div className="h-4 bg-gray-300 rounded w-48"></div>
                  <div className="h-4 bg-gray-300 rounded w-56"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Profile not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">My Profile</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Manage your personal information and preferences to personalize your
            travel experience
          </p>
        </div>

        {/* Main Profile Card */}
        <Card className="mb-10 shadow-xl border-0 bg-white/95 rounded-3xl overflow-visible">
          <CardHeader className="pb-8 pt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                    Personal Information
                  </CardTitle>
                  <p className="text-gray-600 text-sm">
                    {isEditing
                      ? "Edit your profile details"
                      : "View and manage your profile information"}
                  </p>
                </div>
              </div>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 px-6 py-2.5 rounded-xl"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 px-6 py-2.5 rounded-xl"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: profile.name || "",
                        bio: profile.bio || "",
                        city: profile.city || "",
                        country: profile.country || "",
                        phone: profile.phone || "",
                        dateOfBirth: profile.dateOfBirth || "",
                      });
                    }}
                    variant="outline"
                    className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 shadow-sm hover:shadow-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 px-6 py-2.5 rounded-xl"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          {/* Status Message */}
          {saveStatus.type && (
            <div className="mx-8 mt-6">
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  saveStatus.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                } transition-all duration-200 animate-in fade-in-0 slide-in-from-top-1`}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="flex-1 font-medium">{saveStatus.message}</span>
                <button
                  onClick={() => setSaveStatus({ type: null, message: '' })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          <CardContent className="space-y-10 p-8">
            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col lg:flex-row items-start gap-10">
              {/* Profile Picture */}
              <div className="flex flex-col items-center space-y-6 lg:min-w-[200px]">
                <div
                  className="relative group cursor-pointer outline-none"
                  onClick={triggerFileInput}
                  role="button"
                  aria-label="Change profile picture"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      triggerFileInput();
                    }
                  }}
                >
                  <Avatar className="w-36 h-36 ring-4 ring-blue-200/60 shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:ring-blue-300">
                    <AvatarImage
                      src={profile.profilePicture || profile.image || ""}
                      alt={profile.name || profile.email || "User"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                      {profile.name?.charAt(0) ||
                        profile.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={triggerFileInput}
                  disabled={isUploadingPicture}
                  size="sm"
                  className="gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 border-0 px-6 py-2.5"
                >
                  {isUploadingPicture ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploadingPicture ? "Uploading..." : "Change Picture"}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                />
              </div>

              {/* Profile Details Form */}
              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Name */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="name"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      Full Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        placeholder="Enter your full name"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 text-base rounded-xl transition-all duration-200"
                      />
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-gray-900 font-medium">
                          {profile.name || "Not set"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-4 h-4 text-green-600" />
                      </div>
                      Email Address
                    </Label>
                    <div className="bg-gradient-to-r from-gray-50 to-green-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-gray-900 font-medium">
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  {/* Country */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="country"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                      </div>
                      Country
                    </Label>
                    {isEditing ? (
                      <div className="relative location-input">
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => {
                            handleInputChange("country", e.target.value);
                            searchCountries(e.target.value);
                          }}
                          onFocus={() => {
                            if (formData.country.length >= 2) {
                              searchCountries(formData.country);
                            }
                          }}
                          placeholder="Enter country name"
                          className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10 h-12 text-base rounded-xl transition-all duration-200"
                        />
                        {isLoadingCountry && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {showCountrySuggestions &&
                          countrySuggestions.length > 0 && (
                            <div className="absolute z-40 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {countrySuggestions.map((country) => (
                                <button
                                  key={country.placeId}
                                  type="button"
                                  onClick={() => selectCountry(country)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <div className="font-medium text-gray-900">
                                    {country.mainText}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {country.secondaryText}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-indigo-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-gray-900 font-medium">
                          {profile.country || "Not set"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="city"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-purple-600" />
                      </div>
                      City
                      {!formData.country && (
                        <span className="text-xs text-gray-500 font-normal">
                          (select country first)
                        </span>
                      )}
                    </Label>
                    {isEditing ? (
                      <div className="relative location-input">
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => {
                            handleInputChange("city", e.target.value);
                            searchCities(e.target.value);
                          }}
                          onFocus={() => {
                            if (formData.city.length >= 2 && formData.country) {
                              searchCities(formData.city);
                            }
                          }}
                          placeholder={
                            formData.country
                              ? `Enter city name in ${formData.country}`
                              : "Please select a country first"
                          }
                          disabled={!formData.country}
                          className={`border-gray-300 focus:border-purple-500 focus:ring-purple-500 pr-10 h-12 text-base rounded-xl transition-all duration-200 ${
                            !formData.country
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : ""
                          }`}
                        />
                        {!formData.country && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 text-gray-400">
                              <MapPin className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                        {isLoadingCity && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {showCitySuggestions && citySuggestions.length > 0 && (
                          <div className="absolute z-40 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {citySuggestions.map((city) => (
                              <button
                                key={city.placeId}
                                type="button"
                                onClick={() => selectCity(city)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <div className="font-medium text-gray-900">
                                  {city.mainText}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {city.secondaryText}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {!formData.country && (
                          <p className="text-sm text-gray-500 mt-1">
                            Please select a country first to search for cities
                          </p>
                        )}
                        {formData.country && !formData.city && (
                          <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Searching cities in {formData.country}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-purple-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-gray-900 font-medium">
                          {profile.city || "Not set"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="phone"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-4 h-4 text-orange-600" />
                      </div>
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="+1 (555) 123-4567"
                        className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 h-12 text-base rounded-xl transition-all duration-200"
                      />
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-orange-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-gray-900 font-medium">
                          {profile.phone || "Not set"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="dateOfBirth"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-rose-600" />
                      </div>
                      Date of Birth
                    </Label>
                    {isEditing ? (
                      <>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) =>
                            handleInputChange("dateOfBirth", e.target.value)
                          }
                          className="border-gray-300 focus:border-rose-500 focus:ring-rose-500 h-12 text-base rounded-xl transition-all duration-200"
                          max={(() => {
                            const fourteenYearsAgo = new Date();
                            fourteenYearsAgo.setFullYear(fourteenYearsAgo.getFullYear() - 14);
                            return fourteenYearsAgo.toISOString().split('T')[0];
                          })()}
                        />
                        {validationErrors.dateOfBirth && (
                          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {validationErrors.dateOfBirth}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-rose-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-gray-900 font-medium">
                          {profile.dateOfBirth
                            ? new Date(profile.dateOfBirth).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )
                            : "Not set"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-3">
                  <Label
                    htmlFor="bio"
                    className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-teal-600" />
                    </div>
                    About Me
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="border-gray-300 focus:border-teal-500 focus:ring-rose-500 resize-none rounded-xl transition-all duration-200 text-base"
                    />
                  ) : (
                    <div className="bg-gradient-to-r from-gray-50 to-teal-50 border border-gray-200 rounded-xl p-4 min-h-[100px]">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {profile.bio || "No bio provided"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Chips */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Badge
                      variant="outline"
                      className={`rounded-full px-4 py-2 border-2 font-medium ${
                        profile.onboardingCompleted
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                          : "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            profile.onboardingCompleted
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {profile.onboardingCompleted
                          ? "Setup Complete"
                          : "Setup Pending"}
                      </div>
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full px-4 py-2 border-2 border-gray-300 bg-white text-gray-700 font-medium shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Member since {new Date(profile.createdAt).getFullYear()}
                      </div>
                    </Badge>
                  </div>
                  {!profile.onboardingCompleted && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-blue-900">
                              Complete your travel profile
                            </p>
                            <p className="text-sm text-blue-600">
                              Get personalized recommendations and better trip
                              planning
                            </p>
                          </div>
                        </div>
                        <Link href="/onboarding">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            Complete Setup
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="text-center shadow-xl border-0 bg-white/95 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-8">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mx-auto mb-6 shadow-xl">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {profile._count?.trips || 0}
              </h3>
              <p className="text-gray-600 font-medium text-lg">Trips Created</p>
              <div className="mt-4 w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto"></div>
            </CardContent>
          </Card>

          <Card className="text-center shadow-xl border-0 bg-white/95 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-8">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl mx-auto mb-6 shadow-xl">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {new Date().getFullYear() -
                  new Date(profile.createdAt).getFullYear() || "<1"}
              </h3>
              <p className="text-gray-600 font-medium text-lg">Years Active</p>
              <div className="mt-4 w-16 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto"></div>
            </CardContent>
          </Card>

          <Card className="text-center shadow-xl border-0 bg-white/95 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-8">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl mx-auto mb-6 shadow-xl">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.onboardingCompleted ? "Pro" : "Basic"}
              </h3>
              <p className="text-gray-600 font-medium text-lg">Account Type</p>
              <div className="mt-4 w-16 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfileContent />;
}
