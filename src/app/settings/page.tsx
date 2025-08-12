"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Palette,
  DollarSign,
  Ruler,
  Languages,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserPreferences {
  // App preferences
  theme: string;
  currency: string;
  measurementUnit: string;
  language: string;

  // Notifications
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    tripReminders: boolean;
    activityUpdates: boolean;
  };

  // Privacy
  privacy: {
    profilePublic: boolean;
    tripsPublic: boolean;
    shareAnalytics: boolean;
  };

  // Travel preferences
  travel: {
    preferredTransport: string[];
    accommodationType: string[];
    dietaryRestrictions: string[];
    mobility: string;
  };
}

const defaultPreferences: UserPreferences = {
  theme: "light",
  currency: "USD",
  measurementUnit: "metric",
  language: "en",
  notifications: {
    email: true,
    push: false,
    marketing: false,
    tripReminders: true,
    activityUpdates: true,
  },
  privacy: {
    profilePublic: false,
    tripsPublic: false,
    shareAnalytics: true,
  },
  travel: {
    preferredTransport: ["flight", "car"],
    accommodationType: ["hotel"],
    dietaryRestrictions: [],
    mobility: "full",
  },
};

function SettingsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Apply theme immediately when changed in settings
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective =
      preferences.theme === "system"
        ? prefersDark
          ? "dark"
          : "light"
        : preferences.theme;
    if (effective === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [preferences.theme]);

  useEffect(() => {
    if (!session?.user?.id) return;

    // 1) Instant optimistic render from session to avoid blocking UI
    const sessionPrefs = (session.user as any)?.preferences;
    if (sessionPrefs) {
      setPreferences({ ...defaultPreferences, ...(sessionPrefs || {}) });
    }
    setIsLoading(false);

    // 2) Background hydrate from API for freshest data
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/user/profile", {
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.preferences) {
            setPreferences({
              ...defaultPreferences,
              ...(result.data.preferences || {}),
            });
          }
        }
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          console.error("Failed to load preferences:", error);
        }
      }
    })();

    return () => controller.abort();
  }, [session?.user?.id]);

  const updatePreference = (section: string, key: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof UserPreferences],
        [key]: value,
      },
    }));
  };

  const toggleArrayPreference = (
    section: string,
    key: string,
    value: string
  ) => {
    setPreferences((prev) => {
      const currentArray =
        (prev[section as keyof UserPreferences] as any)[key] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item: string) => item !== value)
        : [...currentArray, value];

      return {
        ...prev,
        [section]: {
          ...prev[section as keyof UserPreferences],
          [key]: newArray,
        },
      };
    });
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Only send defined keys to avoid failing validation
          preferences: JSON.parse(JSON.stringify(preferences)),
        }),
      });

      if (response.ok) {
        console.log("✅ Preferences saved successfully");
        // Show success message or toast
      } else {
        let message = "Failed to save preferences";
        try {
          const err = await response.json();
          message = err?.error || message;
          if (err?.details) {
            console.error("Validation details:", err.details);
          }
        } catch {}
        console.error(message);
        alert(`${message}. Please try again.`);
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-xl p-6">
                <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Customize your Terra Voyage experience
          </p>
        </div>

        {/* Save Button - Fixed at top */}
        <div className="mb-6 flex justify-end">
          <Button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* App Preferences */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Palette className="w-7 h-7 text-blue-600" />
                App Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Theme
                  </Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Currency
                  </Label>
                  <Select
                    value={preferences.currency}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, currency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">
                        AUD - Australian Dollar
                      </SelectItem>
                      <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Measurement Unit */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Measurement Unit
                  </Label>
                  <Select
                    value={preferences.measurementUnit}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        measurementUnit: value,
                      }))
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

                {/* Language */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Language
                  </Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, language: value }))
                    }
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
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Bell className="w-7 h-7 text-green-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.email}
                    onCheckedChange={(checked) =>
                      updatePreference("notifications", "email", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Push Notifications</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Get notified on your device
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.push}
                    onCheckedChange={(checked) =>
                      updatePreference("notifications", "push", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">
                      Marketing Communications
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive news and offers
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.marketing}
                    onCheckedChange={(checked) =>
                      updatePreference("notifications", "marketing", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Trip Reminders</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Get reminded about upcoming trips
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.tripReminders}
                    onCheckedChange={(checked) =>
                      updatePreference(
                        "notifications",
                        "tripReminders",
                        checked
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Shield className="w-7 h-7 text-purple-600" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Public Profile</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Make your profile visible to others
                    </p>
                  </div>
                  <Switch
                    checked={preferences.privacy.profilePublic}
                    onCheckedChange={(checked) =>
                      updatePreference("privacy", "profilePublic", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Public Trips</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Allow others to see your trips
                    </p>
                  </div>
                  <Switch
                    checked={preferences.privacy.tripsPublic}
                    onCheckedChange={(checked) =>
                      updatePreference("privacy", "tripsPublic", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg md:col-span-2">
                  <div>
                    <Label className="font-medium">Analytics Sharing</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Help improve Terra Voyage by sharing anonymous usage data
                    </p>
                  </div>
                  <Switch
                    checked={preferences.privacy.shareAnalytics}
                    onCheckedChange={(checked) =>
                      updatePreference("privacy", "shareAnalytics", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel Preferences */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Globe className="w-7 h-7 text-orange-600" />
                Travel Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Preferred Transport */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-900">
                  Preferred Transportation
                </Label>
                <div className="flex flex-wrap gap-3">
                  {["flight", "train", "bus", "car", "ferry", "walking"].map(
                    (transport) => {
                      const isSelected =
                        preferences.travel.preferredTransport.includes(
                          transport
                        );
                      return (
                        <Badge
                          key={transport}
                          variant="outline"
                          className={`cursor-pointer px-4 py-2 text-sm capitalize transition-colors border rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
                          }`}
                          onClick={() =>
                            toggleArrayPreference(
                              "travel",
                              "preferredTransport",
                              transport
                            )
                          }
                          role="button"
                          aria-pressed={isSelected}
                        >
                          {transport}
                        </Badge>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Accommodation Type */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-900">
                  Preferred Accommodations
                </Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    "hotel",
                    "airbnb",
                    "hostel",
                    "resort",
                    "apartment",
                    "camping",
                  ].map((accommodation) => {
                    const isSelected =
                      preferences.travel.accommodationType.includes(
                        accommodation
                      );
                    return (
                      <Badge
                        key={accommodation}
                        variant="outline"
                        className={`cursor-pointer px-4 py-2 text-sm capitalize transition-colors border rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
                        }`}
                        onClick={() =>
                          toggleArrayPreference(
                            "travel",
                            "accommodationType",
                            accommodation
                          )
                        }
                        role="button"
                        aria-pressed={isSelected}
                      >
                        {accommodation}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-900">
                  Dietary Restrictions
                </Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    "vegetarian",
                    "vegan",
                    "gluten-free",
                    "kosher",
                    "halal",
                    "lactose-free",
                    "nut-free",
                  ].map((diet) => {
                    const isSelected =
                      preferences.travel.dietaryRestrictions.includes(diet);
                    return (
                      <Badge
                        key={diet}
                        variant="outline"
                        className={`cursor-pointer px-4 py-2 text-sm capitalize transition-colors border rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
                        }`}
                        onClick={() =>
                          toggleArrayPreference(
                            "travel",
                            "dietaryRestrictions",
                            diet
                          )
                        }
                        role="button"
                        aria-pressed={isSelected}
                      >
                        {diet.replace("-", " ")}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Mobility */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-900">
                  Mobility Requirements
                </Label>
                <Select
                  value={preferences.travel.mobility}
                  onValueChange={(value) =>
                    updatePreference("travel", "mobility", value)
                  }
                >
                  <SelectTrigger className="w-full md:w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">
                      No special requirements
                    </SelectItem>
                    <SelectItem value="limited">Limited mobility</SelectItem>
                    <SelectItem value="wheelchair">
                      Wheelchair accessible required
                    </SelectItem>
                    <SelectItem value="assistance">
                      Assistance needed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button - Bottom */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleSavePreferences}
            disabled={isSaving}
            size="lg"
            className="gap-2 px-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? "Saving Preferences..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
