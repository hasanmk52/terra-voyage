"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  MapPin,
  Heart,
  Plane,
  Camera,
  Mountain,
  Car,
  Home,
  Utensils,
  Wallet,
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// Onboarding schema
const onboardingSchema = z.object({
  // Personal Information
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
  location: z.string().optional(),
  bio: z.string().max(500).optional(),

  // Travel Style & Preferences
  travelStyle: z.enum([
    "adventure",
    "luxury",
    "budget",
    "cultural",
    "relaxation",
    "mixed",
  ]),
  pace: z.enum(["slow", "moderate", "fast"]),
  accommodationType: z
    .array(z.string())
    .min(1, "Select at least one accommodation type"),
  transportPreferences: z
    .array(z.string())
    .min(1, "Select at least one transport preference"),

  // Interests
  interests: z.array(z.string()).min(3, "Select at least 3 interests"),

  // Dietary & Accessibility
  dietaryRestrictions: z.array(z.string()),
  accessibility: z.enum(["full", "limited", "wheelchair", "none"]),

  // Preferences
  measurementUnit: z.enum(["metric", "imperial"]),
  language: z.enum(["en", "es", "fr", "de", "it", "pt"]),

  // Privacy
  profilePublic: z.boolean(),
  allowMarketing: z.boolean(),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 1, title: "Welcome", description: "Let's get to know you" },
  { id: 2, title: "Travel Style", description: "How do you like to travel?" },
  { id: 3, title: "Interests", description: "What excites you most?" },
  { id: 4, title: "Preferences", description: "Customize your experience" },
  { id: 5, title: "Privacy", description: "Control your data" },
];

const INTERESTS = [
  { id: "culture", label: "Culture & History", icon: "🏛️" },
  { id: "food", label: "Food & Cuisine", icon: "🍽️" },
  { id: "adventure", label: "Adventure Sports", icon: "🏔️" },
  { id: "nature", label: "Nature & Wildlife", icon: "🌿" },
  { id: "photography", label: "Photography", icon: "📸" },
  { id: "art", label: "Art & Museums", icon: "🎨" },
  { id: "music", label: "Music & Festivals", icon: "🎵" },
  { id: "beaches", label: "Beaches & Islands", icon: "🏖️" },
  { id: "nightlife", label: "Nightlife", icon: "🌙" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "architecture", label: "Architecture", icon: "🏗️" },
  { id: "wellness", label: "Wellness & Spa", icon: "🧘" },
];

const ACCOMMODATION_TYPES = [
  { id: "hotel", label: "Hotels" },
  { id: "airbnb", label: "Airbnb/Vacation Rentals" },
  { id: "hostel", label: "Hostels" },
  { id: "resort", label: "Resorts" },
  { id: "boutique", label: "Boutique Hotels" },
  { id: "camping", label: "Camping" },
];

const TRANSPORT_PREFERENCES = [
  { id: "flight", label: "Flight" },
  { id: "car", label: "Car/Driving" },
  { id: "train", label: "Train" },
  { id: "bus", label: "Bus" },
  { id: "walking", label: "Walking" },
  { id: "bicycle", label: "Bicycle" },
  { id: "public", label: "Public Transport" },
];

const DIETARY_RESTRICTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "dairy-free", label: "Dairy-free" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" },
];

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: session?.user?.name || "",
      location: "",
      bio: "",
      travelStyle: "mixed",
      pace: "moderate",
      accommodationType: ["hotel"],
      transportPreferences: ["flight"],
      interests: [],
      dietaryRestrictions: [],
      accessibility: "full",
      measurementUnit: "metric",
      language: "en",
      profilePublic: false,
      allowMarketing: false,
    },
  });

  const { watch, setValue, getValues } = form;

  // Redirect if already onboarded
  useEffect(() => {
    if (session?.user?.onboardingCompleted) {
      router.push("/trips");
    }
  }, [session, router]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!session) {
    router.push("/auth/signin?callbackUrl=/onboarding");
    return null;
  }

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    try {
      // Submit onboarding data to API
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      // Update session to reflect completed onboarding
      await update();

      // Redirect to trips page
      router.push("/trips");
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Failed to save your preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={session.user?.image || ""} />
                <AvatarFallback className="text-2xl">
                  {session.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">Welcome to Terra Voyage!</h2>
              <p className="text-gray-600 mt-2">
                Let's personalize your travel experience
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...form.register("displayName")}
                  placeholder="How should we call you?"
                />
                {form.formState.errors.displayName && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  {...form.register("location")}
                  placeholder="Where are you based?"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  {...form.register("bio")}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Your Travel Style</h2>
              <p className="text-gray-600 mt-2">
                Help us understand how you like to travel
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label>Primary Travel Style</Label>
                <RadioGroup
                  value={watch("travelStyle")}
                  onValueChange={(value) =>
                    setValue("travelStyle", value as any)
                  }
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  {[
                    { value: "adventure", label: "Adventure", icon: "🏔️" },
                    { value: "luxury", label: "Luxury", icon: "💎" },
                    { value: "budget", label: "Budget", icon: "💰" },
                    { value: "cultural", label: "Cultural", icon: "🏛️" },
                    { value: "relaxation", label: "Relaxation", icon: "🧘" },
                    { value: "mixed", label: "Mixed", icon: "🎯" },
                  ].map((style) => (
                    <div
                      key={style.value}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem value={style.value} id={style.value} />
                      <Label
                        htmlFor={style.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span>{style.icon}</span>
                        {style.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label>Travel Pace</Label>
                <Select
                  value={watch("pace")}
                  onValueChange={(value) => setValue("pace", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow & Relaxed</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="fast">Fast & Packed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Preferred Accommodations</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ACCOMMODATION_TYPES.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.id}
                        checked={watch("accommodationType").includes(type.id)}
                        onCheckedChange={(checked) => {
                          const current = watch("accommodationType");
                          if (checked) {
                            setValue("accommodationType", [
                              ...current,
                              type.id,
                            ]);
                          } else {
                            setValue(
                              "accommodationType",
                              current.filter((t) => t !== type.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={type.id} className="text-sm">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Transport Preferences</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TRANSPORT_PREFERENCES.map((transport) => (
                    <div
                      key={transport.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={transport.id}
                        checked={watch("transportPreferences").includes(
                          transport.id
                        )}
                        onCheckedChange={(checked) => {
                          const current = watch("transportPreferences");
                          if (checked) {
                            setValue("transportPreferences", [
                              ...current,
                              transport.id,
                            ]);
                          } else {
                            setValue(
                              "transportPreferences",
                              current.filter((t) => t !== transport.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={transport.id} className="text-sm">
                        {transport.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Your Interests</h2>
              <p className="text-gray-600 mt-2">
                What excites you most when traveling? (Select at least 3)
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INTERESTS.map((interest) => (
                <div
                  key={interest.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    watch("interests").includes(interest.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    const current = watch("interests");
                    if (current.includes(interest.id)) {
                      setValue(
                        "interests",
                        current.filter((i) => i !== interest.id)
                      );
                    } else {
                      setValue("interests", [...current, interest.id]);
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{interest.icon}</div>
                    <div className="text-sm font-medium">{interest.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Badge variant="outline">
                {watch("interests").length} interests selected
              </Badge>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Preferences & Settings</h2>
              <p className="text-gray-600 mt-2">Customize your experience</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Measurement Unit</Label>
                  <Select
                    value={watch("measurementUnit")}
                    onValueChange={(value) =>
                      setValue("measurementUnit", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (km, °C)</SelectItem>
                      <SelectItem value="imperial">
                        Imperial (mi, °F)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Language</Label>
                <Select
                  value={watch("language")}
                  onValueChange={(value) => setValue("language", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dietary Restrictions (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DIETARY_RESTRICTIONS.map((diet) => (
                    <div key={diet.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={diet.id}
                        checked={watch("dietaryRestrictions").includes(diet.id)}
                        onCheckedChange={(checked) => {
                          const current = watch("dietaryRestrictions");
                          if (checked) {
                            setValue("dietaryRestrictions", [
                              ...current,
                              diet.id,
                            ]);
                          } else {
                            setValue(
                              "dietaryRestrictions",
                              current.filter((d) => d !== diet.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={diet.id} className="text-sm">
                        {diet.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Accessibility Needs</Label>
                <Select
                  value={watch("accessibility")}
                  onValueChange={(value) =>
                    setValue("accessibility", value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">No accessibility needs</SelectItem>
                    <SelectItem value="limited">Limited mobility</SelectItem>
                    <SelectItem value="wheelchair">
                      Wheelchair accessible
                    </SelectItem>
                    <SelectItem value="none">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Privacy Settings</h2>
              <p className="text-gray-600 mt-2">
                Control how your data is used
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="profilePublic"
                  checked={watch("profilePublic")}
                  onCheckedChange={(checked) =>
                    setValue("profilePublic", !!checked)
                  }
                />
                <div>
                  <Label htmlFor="profilePublic">Make my profile public</Label>
                  <p className="text-sm text-gray-600">
                    Other users can see your profile and travel interests
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="allowMarketing"
                  checked={watch("allowMarketing")}
                  onCheckedChange={(checked) =>
                    setValue("allowMarketing", !!checked)
                  }
                />
                <div>
                  <Label htmlFor="allowMarketing">
                    Receive marketing communications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Get travel tips, deals, and product updates
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                🎉 You're all set!
              </h3>
              <p className="text-blue-800 text-sm">
                Click "Complete Setup" to start planning your next adventure
                with personalized recommendations based on your preferences.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Setup Your Profile</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign Out
            </Button>
          </div>

          <Progress value={progress} className="mb-2" />

          <div className="flex justify-between text-xs text-gray-600">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`text-center ${
                  step.id === currentStep ? "text-blue-600 font-medium" : ""
                }`}
              >
                <div>{step.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8 shadow-2xl border-0 bg-white/90 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-8">
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {renderStep()}
            </form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="h-11 px-6 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={nextStep}
              className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting || watch("interests").length < 3}
              className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
