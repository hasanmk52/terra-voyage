import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Sanitization function to prevent XSS
function sanitizeString(input: string): string {
  return input
    .replace(/[<>\"']/g, "") // Remove potential HTML/script characters
    .replace(/javascript:/gi, "") // Remove javascript: protocols
    .replace(/data:/gi, "") // Remove data: protocols
    .replace(/vbscript:/gi, "") // Remove vbscript: protocols
    .trim();
}

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .refine((name) => /^[a-zA-Z\s\-'\.]+$/.test(name), {
      message:
        "Name can only contain letters, spaces, hyphens, apostrophes, and periods",
    })
    .optional(),
  bio: z
    .string()
    .max(500)
    .trim()
    .refine((bio) => !/<script|javascript:|data:|vbscript:/i.test(bio), {
      message: "Bio contains unsafe content",
    })
    .optional(),
  city: z
    .string()
    .max(100)
    .trim()
    .refine((city) => /^[a-zA-Z0-9\s\-,\.]+$/.test(city), {
      message:
        "City can only contain letters, numbers, spaces, hyphens, commas, and periods",
    })
    .optional(),
  country: z
    .string()
    .max(100)
    .trim()
    .refine((country) => /^[a-zA-Z0-9\s\-,\.]+$/.test(country), {
      message:
        "Country can only contain letters, numbers, spaces, hyphens, commas, and periods",
    })
    .optional(),
  phone: z
    .string()
    .max(20)
    .trim()
    .refine((phone) => /^[\+]?[\d\s\-\(\)]+$/.test(phone), {
      message: "Phone number format is invalid",
    })
    .optional(),
  dateOfBirth: z
    .string()
    .refine(
      (date) => {
        if (!date) return true;
        const birthDate = new Date(date);
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 120); // Max age 120 years
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() - 13); // Min age 13 years

        return birthDate >= minDate && birthDate <= maxDate;
      },
      { message: "Date of birth must be between 13 and 120 years ago" }
    )
    .optional(),
  // Allow partial nested objects so the client can send subsets safely
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      currency: z
        .string()
        .length(3)
        .regex(/^[A-Z]{3}$/)
        .optional(), // ISO currency codes
      measurementUnit: z.enum(["metric", "imperial"]).optional(),
      language: z
        .string()
        .length(2)
        .regex(/^[a-z]{2}$/)
        .optional(), // ISO language codes
      notifications: z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          marketing: z.boolean().optional(),
          tripReminders: z.boolean().optional(),
          activityUpdates: z.boolean().optional(),
        })
        .partial()
        .optional(),
      privacy: z
        .object({
          profilePublic: z.boolean().optional(),
          tripsPublic: z.boolean().optional(),
          shareAnalytics: z.boolean().optional(),
        })
        .partial()
        .optional(),
      travel: z
        .object({
          preferredTransport: z
            .array(
              z.enum(["flight", "train", "bus", "car", "ferry", "walking"])
            )
            .optional(),
          accommodationType: z
            .array(
              z.enum([
                "hotel",
                "airbnb",
                "hostel",
                "resort",
                "apartment",
                "camping",
              ])
            )
            .optional(),
          dietaryRestrictions: z
            .array(
              z.enum([
                "vegetarian",
                "vegan",
                "gluten-free",
                "kosher",
                "halal",
                "lactose-free",
                "nut-free",
              ])
            )
            .optional(),
          mobility: z
            .enum(["full", "limited", "wheelchair", "assistance"])
            .optional(),
        })
        .partial()
        .optional(),
    })
    .partial()
    .optional(),
});

// GET /api/user/profile - Get user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        bio: true,
        city: true,
        country: true,
        phone: true,
        dateOfBirth: true,
        profilePicture: true,
        profilePictureType: true,
        onboardingCompleted: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            trips: true
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert profile picture blob to base64 if exists
    let profilePicture = null;
    if (user.profilePicture && user.profilePictureType) {
      const base64 = Buffer.from(user.profilePicture).toString("base64");
      profilePicture = `data:${user.profilePictureType};base64,${base64}`;
    }

    const userData = {
      ...user,
      profilePicture,
    };

    return NextResponse.json({ success: true, data: userData });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Prepare update data, converting empty strings to null
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
        ? sanitizeString(validatedData.name) || null
        : null;
    }
    if (validatedData.bio !== undefined) {
      updateData.bio = validatedData.bio
        ? sanitizeString(validatedData.bio) || null
        : null;
    }
    if (validatedData.city !== undefined) {
      updateData.city = validatedData.city
        ? sanitizeString(validatedData.city) || null
        : null;
    }
    if (validatedData.country !== undefined) {
      updateData.country = validatedData.country
        ? sanitizeString(validatedData.country) || null
        : null;
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone
        ? sanitizeString(validatedData.phone) || null
        : null;
    }
    if (validatedData.dateOfBirth !== undefined) {
      updateData.dateOfBirth = validatedData.dateOfBirth
        ? new Date(validatedData.dateOfBirth)
        : null;
    }
    if (validatedData.preferences !== undefined) {
      // Remove any undefined values recursively to satisfy Prisma JSON constraints
      const removeUndefinedDeep = (value: any): any => {
        if (Array.isArray(value)) {
          return value.map(removeUndefinedDeep);
        }
        if (value && typeof value === "object") {
          const entries = Object.entries(value).filter(
            ([, v]) => v !== undefined
          );
          return Object.fromEntries(
            entries.map(([k, v]) => [k, removeUndefinedDeep(v)])
          );
        }
        return value;
      };
      updateData.preferences = removeUndefinedDeep(validatedData.preferences);
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        bio: true,
        city: true,
        country: true,
        phone: true,
        dateOfBirth: true,
        preferences: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/profile - Delete user account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete user and all related data (cascade delete will handle relationships)
    await db.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
