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
} from "lucide-react";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
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
      location: null,
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
      location: prev.location || "",
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
              location: result.data.location || null,
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
              location: profileData.location || "",
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
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

          // Update session with new name
          await update({
            name: formData.name,
          });

          console.log("✅ Profile updated successfully");
        }
      } else {
        console.error("Failed to update profile");
        alert("Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Manage your personal information
          </p>
        </div>

        {/* Main Profile Card */}
        <Card className="mb-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <User className="w-7 h-7 text-blue-600" />
                Personal Information
              </CardTitle>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    className="gap-2 bg-green-600 hover:bg-green-700"
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
                        location: profile.location || "",
                        phone: profile.phone || "",
                        dateOfBirth: profile.dateOfBirth || "",
                      });
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Profile Picture */}
              <div className="flex flex-col items-center space-y-4">
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
                  <Avatar className="w-32 h-32 ring-4 ring-blue-200 shadow-lg transition-transform duration-200 group-hover:scale-[1.02]">
                    <AvatarImage
                      src={profile.profilePicture || profile.image || ""}
                      alt={profile.name || profile.email || "User"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {profile.name?.charAt(0) ||
                        profile.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/40">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>

                <Button
                  onClick={triggerFileInput}
                  disabled={isUploadingPicture}
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {isUploadingPicture ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
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
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium py-2 px-3 bg-gray-50 rounded-lg">
                        {profile.name || "Not set"}
                      </p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <p className="text-gray-900 font-medium py-2 px-3 bg-gray-100 rounded-lg">
                      {profile.email}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Location
                    </Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        placeholder="City, Country"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium py-2 px-3 bg-gray-50 rounded-lg">
                        {profile.location || "Not set"}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
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
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium py-2 px-3 bg-gray-50 rounded-lg">
                        {profile.phone || "Not set"}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="dateOfBirth"
                      className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </Label>
                    {isEditing ? (
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) =>
                          handleInputChange("dateOfBirth", e.target.value)
                        }
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium py-2 px-3 bg-gray-50 rounded-lg">
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
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label
                    htmlFor="bio"
                    className="text-sm font-semibold text-gray-700"
                  >
                    About Me
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <p className="text-gray-900 py-3 px-4 bg-gray-50 rounded-lg min-h-[100px] whitespace-pre-wrap">
                      {profile.bio || "No bio provided"}
                    </p>
                  )}
                </div>

                {/* Status Chips */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1.5 border ${
                      profile.onboardingCompleted
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-amber-300 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {profile.onboardingCompleted
                      ? "Setup Complete"
                      : "Setup Pending"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1.5 border border-gray-300 bg-white text-gray-700"
                  >
                    Member since {new Date(profile.createdAt).getFullYear()}
                  </Badge>
                  {!profile.onboardingCompleted && (
                    <Link href="/onboarding">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Complete Travel Setup
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {profile._count?.trips || 0}
              </h3>
              <p className="text-gray-600 font-medium">Trips Created</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-4 shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {new Date().getFullYear() -
                  new Date(profile.createdAt).getFullYear() || "<1"}
              </h3>
              <p className="text-gray-600 font-medium">Years Active</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mx-auto mb-4 shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {profile.onboardingCompleted ? "Pro" : "Basic"}
              </h3>
              <p className="text-gray-600 font-medium">Account Type</p>
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
